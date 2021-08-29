---
title: Open source threat intelligence and SELinux
date: '2021-08-29'
tags: ['open', 'source', 'threat','intelligence','selinux','containers']
draft: false
summary: 'How do you protect your threat intelligence sharing platform from compromise?
 Read on to learn how SELinux and podman can support a containerised MISP deployment.'
---

[MISP](https://www.misp-project.org/) is an awesome open source project, allowing security analysts to gather, share, store and correlate indicators of compromise (IoC) using open standards. But how do you protect a platform designed to support security analysts?

In this post, I'll deploy a containerised MISP instance. Once deployed, we'll configure SELinux to protect our application containers. We'll observe how SELinux prevents access to certain files initially, and then create SELinux policies with Udica to only allow access to resources required by the platform.

## SELinux and containers

SELinux started life as a series of patches to the Linux kernel. Since being released to the open source community, it's been an integral security control for Linux systems. Extensions have been created supporting different use cases, like Multi-level security (MLS).

SELinux alone has mitigated several high-priority vulnerabilities impacting containers. One of these was [CVE-2019-5736](https://access.redhat.com/security/cve/cve-2019-5736), which allowed containers to overwrite file handles inside the container and 'escape' to the host, with admin privileges. Fortunately, a well-configured SELinux deployment completely mitigated this CVE!

## Getting started

I'll be using Red Hat Enterprise Linux for this post. You can get a copy at [Red Hat Developers](https://developers.redhat.com/) if you don't have a copy handy.

Once you have a Red Hat Enterprise Linux instance up, subscribe it (you don't need to do this on AWS with pay-as-you-go instances) and make sure all the packages are updated.
```
subscription-manager register
subscription-manager attach --auto
yum update -y
```
Firstly, let's install `podman`. Podman is an open source, drop-in replacement for Docker on Red Hat Enterprise Linux.
```
yum -y install podman podman-plugins podman-docker
```
We'll also be using `docker-compose` to orchestrate the MISP platform, which you can grab from GitHub
```
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```
## Configuration

We're using the `dnsname` plugin here to provide local DNS for the container services. First, we need to update the default network configuration. Add the following to `/etc/cni/net.d/87-podman-bridge.conflist`:
```
cat /etc/cni/net.d/87-podman-bridge.conflist
{
  "cniVersion": "0.4.0",
  "name": "podman",
  "plugins": [
    {
      ...
    {
        "type": "dnsname",
        "domainName": "dns.podman",
        "capabilities": {
           "aliases": true
        }
     }
   ]
}
```
Start `dnsmasq` and the Podman socket, and verify the `dnsname plugin is active
```
systemctl start {dnsmasq,podman.socket}
podman network ls
2f259bab93aa  podman        0.4.0       bridge,portmap,firewall,tuning,dnsname
```
Create the `docker-compose.yml` file, and start the services. Optionally, if you're deploying this on a remote host, you can update the `HOSTNAME` environment variable for the `misp` service in the compose file.
```
curl https://gist.githubusercontent.com/shaneboulden/3a4fc946ce78ad647511610870477625/raw/0cc8498afb4df5db8f98a8a6f4e964aa98a33b8a/misp-docker-compose-nolabels.yml  -o docker-compose.yml
```
An important note - this Dockerfile has been modified from the one hosted at https://github.com/coolacid/docker-misp. Specifically, we've added ports to each service: 
```
mail:
  image: namshi/smtp
  ports:
    - "25:25"
```
This allows us to generate SELinux policies in the next section. But, it also exposes the ports outside the Podman network unnecessarily. We'll correct this later in the article.

## Testing it out
At this point you can bring all the services up
```
docker-compose up
```
You'll start to see some services deploying, and probably a few messages like this:
```
misp_1          | Setup MISP files dir...
misp_1          | cp: cannot stat '/var/www/MISP/app/files/community-metadata/defaults.json': Permission denied
misp_1          | cp: cannot stat '/var/www/MISP/app/files/empty': Permission denied
misp_1          | cp: cannot stat '/var/www/MISP/app/files/feed-metadata/defaults.json': Permission denied
misp_1          | cp: cannot stat '/var/www/MISP/app/files/feed-metadata/schema.json': Permission denied
misp_1          | cp: cannot stat '/var/www/MISP/app/files/misp-decaying-models/models/nids-simple-model.json': Permission denied
misp_1          | cp: cannot stat '/var/www/MISP/app/files/misp-decaying-models/models/phishing-model.json': Permission denied
```
It looks like something is preventing the containerised application accessing a file. Maybe SELinux? Let's run a command to see:
```
ausearch -m avc -ts recent
```
Yep, that looks like SELinux. You'll see a number of SELinux denials that look like this:
```
----
type=AVC msg=audit(1630132075.918:2462): avc:  denied  { setattr } for  pid=5208 comm="rsync" name="wikimedia" dev="dm-0" ino=33602346 scontext=system_u:system_r:container_t:s0:c116,c220 tcontext=system_u:object_r:admin_home_t:s0 tclass=dir permissive=0
----
type=AVC msg=audit(1630132075.918:2463): avc:  denied  { setattr } for  pid=5208 comm="rsync" name="tools" dev="dm-0" ino=50918545 scontext=system_u:system_r:container_t:s0:c116,c220 tcontext=system_u:object_r:admin_home_t:s0 tclass=dir permissive=0
```
## Creating SELinux policy with Udica
At this point our application starts, but can't access all the files and ports it needs. We need to create SELinux policies for the containers so SELinux will allow access to the files and ports they need - and only the files and ports they need!

Udica is a tool for creating SELinux policies from container specs. It determines which ports and files a container needs, and creates SELinux policies allowing access. Udica is available in the Red Hat Enterprise Linux 8 AppStream repos:
```
yum install -y /usr/bin/udica
```
Firstly, we need to inspect our containers:
```
podman ps -a
CONTAINER ID  IMAGE                                          COMMAND               CREATED     STATUS                     PORTS                                     NAMES
...
81739f877c42  docker.io/namshi/smtp:latest                   exim -bd -q15m -v     3 days ago  Exited (1) 3 minutes ago   0.0.0.0:25->25/tcp                        81739f877c42_root_mail_1

podman inspect 81739f877c42 > misp-mail.json
```
Once we have a json spec for the container, we can create a Udica policy:
```
udica -j misp-mail.json misp-mail
```
You'll now see some output from Udica indicating you can load the policy. Let's try it out:
```
semodule -i misp-mail.cil /usr/share/udica/templates/{base_container.cil,net_container.cil}
```
Ok! Now repeat this same process for each of the other containers; inspect the container with podman, create a policy with Udica, and load it. 

You'll also need to update each container spec with `label=type:your-process-label.process`. Now is also a good time to remove the port definitions we used in development to create the SELinux policies. You can find a templated compose file here:
```
curl https://gist.githubusercontent.com/shaneboulden/43909547297482e39268ef42212797f0/raw/37d2d48e42b58e22324ecf07171eb97f45c0a55a/misp-docker-compose.yml -o docker-compose.yml
```
Once you've updated the compose file, you can restart the services
```
docker-compose down
docker-compose up
```

## Building on the Udica policies

Ok, now our MISP instance is starting, but we still have an issue. The application can't connect to the database:
```
misp_1          | Waiting for database to come up
misp_1          | ERROR 2002 (HY000): Can't connect to MySQL server on 'db' (13)
```
Let's take another look at the audit log:
```
ausearch -m avc -ts recent
type=AVC msg=audit(1630213249.039:2914): avc:  denied  { name_connect } for  pid=19132 comm="mysql" dest=3306 scontext=system_u:system_r:misp-docker.process:s0:c296,c415 tcontext=system_u:object_r:mysqld_port_t:s0 tclass=tcp_socket permissive=0
```
It looks like there's still some issues connecting to the database. Udica did its best to create an SELinux policy, and we just need to give it a helping hand. Let's append this denial to the `misp-docker` policy:
```
cat avc
type=AVC msg=audit(1630213249.039:2914): avc:  denied  { name_connect } for  pid=19132 comm="mysql" dest=3306 scontext=system_u:system_r:misp-docker.process:s0:c296,c415 tcontext=system_u:object_r:mysqld_port_t:s0 tclass=tcp_socket permissive=0

podman ps -a
CONTAINER ID  IMAGE                                          COMMAND               CREATED        STATUS                           PORTS                                     NAMES
...
3bc4ab0a365d  docker.io/coolacid/misp-docker:core-latest                           2 minutes ago  Exited (137) About a minute ago  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp  root_misp_1

podman inspect 3bc4ab0a365d | udica --append-rules avc misp-docker

semodule -i misp-docker.cil /usr/share/udica/templates/{base_container.cil,net_container.cil}

docker-compose down
docker-compose up
```
## A little more tweaking

We're making progress. The database connects, but there's still a few issues with permissions for the remaining services
```
misp_1          | Welcome to CakePHP v2.10.24 Console
misp_1          | ---------------------------------------------------------------
misp_1          | App : app
misp_1          | Path: /var/www/MISP/app/
misp_1          | ---------------------------------------------------------------
misp_1          | Error: Permission denied
```
Looking at the audit logs shows a familiar situation
```
ausearch -m -ts recent

type=AVC msg=audit(1630213508.657:3152): avc:  denied  { name_connect } for  pid=21088 comm="php" dest=6666 scontext=system_u:system_r:misp-docker.process:s0:c22,c509 tcontext=system_u:object_r:unreserved_port_t:s0 tclass=tcp_socket permissive=0
```
We could keep repeating this process, but for the sake of brevity I've captured most of these errors into a couple of files we can load:
```
curl https://gist.githubusercontent.com/shaneboulden/da4c79c92f8c329448705ce9c3372c2b/raw/28d2966d6dd0687ff149d769f3ac5ed49fca19bc/avc-misp-modules -o avc-misp-modules
curl https://gist.githubusercontent.com/shaneboulden/bff9b8e0297d3d41bdc41e3de9f32641/raw/fdee6a0a890d641d8f0b0b27ed2340b685f86c57/avc-misp-docker -o avc-misp-docker

podman ps -a
CONTAINER ID  IMAGE                                          COMMAND               CREATED        STATUS                      PORTS                                     NAMES
732bf416a5ef  docker.io/coolacid/misp-docker:modules-latest                        7 minutes ago  Exited (0) 4 minutes ago                                              root_misp-modules_1
118d53ade322  docker.io/coolacid/misp-docker:core-latest                           7 minutes ago  Exited (137) 4 minutes ago  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp  root_misp_1

podman inspect 732bf416a5ef | udica --append-rules avc-misp-modules misp-modules
semodule -i misp-modules.cil /usr/share/udica/templates/base_container.cil

podman inspect 118d53ade322 | udica --append-rules avc-misp-docker misp-docker
semodule -i misp-docker.cil /usr/share/udica/templates/{base_container.cil,net_container.cil}

docker-compose down
docker-compose up -d
```
If we have a look at the audit logs now
```
ausearch -m avc -ts recent
<no matches>
```
Success! We've now created SELinux policies for our containerised, open source threat intelligence platform.

## Closing out

We've deployed an open source threat intelligence platform in containers to Red Hat Enterprise Linux and created customised SELinux policies for our deployment. Now we can rest assured that SELinux is mitigating some of the nastier container escape exploits that could compromise the system.

Udica made creating the policies easier after a bit of tweaking. But our application still has some weaknesses - it's only deployed to a single host, with no reduncancy, and updating the application will likely cause an outage for security analysts. In a later post, I'll deploy this same application to an enterprise Kubernetes platform, OpenShift. This supports scale out for application components, fail-over to worker nodes, and minimal downtime update strategies, like 'blue-green' or 'canary' deployments. We'll also see how OpenShift handles SELinux policies for the application transparently - SELinux will still protect the application resources, but we won't need to get into the weeds of creating these with Udica.

If you'd like to read a little more, there's an article here on [SELinux multi-category security](https://cloud.redhat.com/blog/openshift-protects-against-nasty-container-exploit), which OpenShift uses.

The application is also running as root, and there's a few ways we could resolve this:
- Use [rootless containers](https://developers.redhat.com/blog/2020/09/25/rootless-containers-with-podman-the-basics) with podman
- Deploy the application to OpenShift, which by default doesn't permit applications to run as root

I'll explore the second option here when we deploy this application to OpenShift. Until next time!

