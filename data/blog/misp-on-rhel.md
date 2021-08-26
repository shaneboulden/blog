---
title: open source threat intelligence, containers and SELinux
date: '2021-08-24'
tags: ['open', 'source', 'threat','intelligence']
draft: true
summary: 'How do you protect your threat intelligence sharing platform from compromise?
 Read on to learn how SELinux and podman can support a containerised MISP deployment.'
---

MISP is an awesome open source project, allowing security analysts to gather, share, store and correlate indicators of compromise (IoC) using open standards. But how do you protect a platform designed to support security analysts from compromise?

In this post, I'll deploy a containerised MISP instance. Once deployed, we'll observe how SELinux prevents access to certain files initially, and then create SELinux policies with Udica to protect the platform.

### SELinux and containers

SELinux started life as a series of patches to the Linux kernel. Since being released to the open source community, it's been an integral security control for Linux systems. Extensions have been created supporting different use cases, like Multi-level security (MLS).

SELinux has been instrumental in mitigating several high-priority vulnerabilities impacting containers. One of these was [CVE-2019-5736](https://access.redhat.com/security/cve/cve-2019-5736), which allowed containers to overwrite file handles inside the container and 'escape' to the host, with admin privileges. Fortunately, a well-configured SELinux deployment completely mitigated this CVE!

### Getting started

I'll be using Red Hat Enterprise Linux for this post. You can get a copy at [Red Hat Developers](https://developers.redhat.com/) if you don't have a copy handy.

Once you have a Red Hat Enterprise Linux instance up, subscribe it (you don't need to do this on AWS with pay-as-you-go instances) and make sure all the packages are updated.
```
subscription-manager register
subscription-manager attach --auto
yum update -y
```

### Install

Firstly, let's install `podman`. Podman is an open source, drop-in replacement for Docker on Red Hat Enterprise Linux.
```
yum -y install podman podman-plugins podman-docker
```
We'll also be using `docker-compose` to orchestrate the MISP platform, which you can grab from GitHub
```
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```
### Configuration

We're using the `dnsname` plugin here to provide local DNS for the container services. First, we need to update the default network config. Add the following to `/etc/cni/net.d/87-podman-bridge.conflist`:
```
cat cat /etc/cni/net.d/87-podman-bridge.conflist
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
curl 
```
### Testing it out
At this point you can bring all the services up
```
docker-compose up
```
You'll start to see some services deploying, and probably a few messages like this:
```

```
It looks like something is preventing the containerised application accessing a file. Maybe SELinux? Let's run a command to see:
```
ausearch -m avc -ts today
```
Yep, that looks like SELinux. You'll see a number of SELinux denials that look like this:
```

```
### Creating SELinux policy with Udica
At this point our application starts, but can't access all the files and ports it needs. We need to create SELinux policies for the containers so SELinux will allow access to the files and ports they need - and only the files and ports they need!

Udica is a tool for creating SELinux policies from container specs. It determines which ports and files a container needs, and creates SELinux policies allowing access.

Firstly, we need to inspect our containers:
```
podman ps -a
...
podman inspect root_111_ > root_111_.json
```
Once we have a json spec for the container, we can create a Udica policy:
```
udica -j root_111_.json misp-mysql
```
You'll now see some output from Udica indicating you can load the policy. Don't worry about updating the `docker-compose.yml` file just yet, we'll do that in a second. For now, just inspect each of the containers, create a policy with Udica, and load it.
```
TODO create policies with podman inspect ... | udica ...
```
You'll also need to update each container spec with `label=type:misp-mysql.process`. I've created a new version here, which you can grab
```
wget -O docker-compose.yml https://github.com/...
```
Once you have the 

### Nearly there!

Ok, now our MISP instance is starting, there's no issues starting everything, but something's still not right. There's still a few SELinux denials getting reported:
```
ausearch -m avc -ts today
```
Udica did its best to create an SELinux policy, and we just need to give it a helping hand. Let's append a few rules to the policies from these denials:
```

```
Ok. Now if we start everything up, we should be good
```
docker-compose up -d
ausearch -m -ts recent
```

