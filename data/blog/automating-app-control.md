---
title: Automating application control
date: '2021-11-26'
tags: ['application', 'control', 'risk','security','linux','automation']
draft: false
summary: 'Automation allows organisations to scale security workflows across hybrid cloud environments. In this article I take a closer look at automating application control, and how you can use Ansible roles to create reusable automation content.'
---

Implementing application control represents a significant uplift in managing the risk profile for systems - assuming you have teams that can support it. The [IBM Security Cyber Resilient Organisation Report for 2020](https://www.ibm.com/security/digital-assets/soar/cyber-resilient-organization-report/) found that 41% of organisations experienced a loss of skilled cyber security expertise, as well as an increase in the complexity of attacks. This means security teams need to do more with less - respond to and defend against increasingly complex attacks, with less security resources. Balancing these competing pressures is difficult, and getting it wrong means organisations may expose vulnerabilities which could lead to a significant breach.

Automation supports organisations to mitigate these risks by making consistent and repeatable changes, mimising human error, and allowing them to focus on higher-value activities, like risk management and response planning. This is the first article in a series and looks at setting up an Ansible environment to automate security workflows. In future articles, we'll expand on this concept to look at GitOps workflows and other ways to manage security workflows in hybrid cloud environments.

## Application control and Ansible
In this article I'll look at using Ansible to automate `fapolicyd` on Red Hat Enterprise Linux. Ansible is an agentless automation framework, enabling you to create human-readable automation workflows across systems. It has a very active open source community, and is established in many organisations supporting automation.

I've covered `fapolicyd` and [application control](https://www.cyber.gov.au/acsc/view-all-content/publications/implementing-application-control) in a few articles previously. Specifically, how you can support application control across [Red Hat Enterprise Linux and Kubernetes/OpenShift](/blog/app-control-for-everyone), and how you can [add integrity checks](/blog/fapolicyd-integrity) to application control processes.

## Reusable automation for security workflows

One of the key components of Ansible is a 'role'. A role is simply a reusable piece of Ansible automation, packaged in a way that it can be shared with the community and further enhanced.

Ansible roles have a defined directory structure with eight main standard directories. This makes it simple to include templates with roles, or separate handlers and variables from Ansible tasks. You can see this directory structure here for the roles `common` and `webservers`:
```
# playbooks
site.yml
webservers.yml
fooservers.yml
roles/
    common/
        tasks/
        handlers/
        library/
        files/
        templates/
        vars/
        defaults/
        meta/
    webservers/
        tasks/
        defaults/
        meta/
```
Roles can be shared with the Ansible community on [Ansible Galaxy](https://galaxy.ansible.com/), and I've already created a [role](https://galaxy.ansible.com/shaneboulden/fapolicyd) that you can use in your application control workflows. This role performs a number of tasks:

- Ensures that `fapolicyd` is installed
- Enables and starts the `fapolicyd` service
- Templates out the `/etc/fapolicyd/fapolicyd.trust` file, and updates this with any custom files required

If you'd like to see how the role is created, you can find the code here on [GitHub](https://github.com/shaneboulden/ansible-fapolicyd).

## Using an Ansible role to automate application control

### Setup and preparation

Let's see how you can use this role to automate application control configuration. Create a new Red Hat Enterprise Linux server (you can get access here) and pull down the latest copy of `cowsay` into a user's home directory.
```
target~$ curl -L https://github.com/Code-Hex/Neo-cowsay/releases/download/v1.0.3/cowsay_1.0.3_Linux_x86_64.tar.gz | tar -xz
```
If you try to run this command you shouldn't have any issues:
```
target~$ ./cowsay "moooo"
 _______
< moooo >
 -------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```
Let's install and setup Ansible and Git on the control node. Create another Red Hat Enterprise Linux server and install Ansible.
<div style={{ backgroundColor: '#f5f5f5', padding: '2px', borderRadius: '.25rem' }}>
<p style={{ padding: '6px'}}>You can read more about control nodes and managed nodes in the [Ansible docs](https://docs.ansible.com/ansible/latest/network/getting_started/basic_concepts.html#control-node)</p>
</div>
```
control~$ sudo yum install python3-pip git -y
control~$ sudo pip3 install pip --upgrade
control~$ pip3 install ansible --user
control~$ ansible --version
ansible [core 2.11.6]
```
Let's create a directory structure that can be used to import roles. Create a new directory `roles` containing a file `requirements.yml`:
```
control~$ mkdir roles
control~$ touch roles/requirements.yml
```
Update this file to contain our role definition:
```
control~$ cat roles/requirements.yml
---
- src: shaneboulden.fapolicyd
```
We need a couple of basic files to get this playbook working. Create a new file `ansible.cfg` with the following content:
```
[defaults]
inventory=./inventory
roles_path=./roles
deprecation_warnings=False

[privilege_escalation]
become_method=sudo
become_ask_pass=yes
```
Let's also create an inventory. Here we've listed the IP for the target server - replace it with the hostname/IP of the target server for your environment:
```
[all]
targetserver
```
You can now install the role from Ansible Galaxy using the `ansible-galaxy` cli:
```
ansible-galaxy install -r roles/requirements.yml
```
You'll be able to see that the role is now installed and ready to use.
```
control~$ ansible-galaxy list
# /home/control/roles
- shaneboulden.fapolicyd, main
```
### Using the Ansible playbooks and roles

Now that we have the role available and installed let's create a playbook. Create a file `site.yml` with the following content:
```
control~$ cat site.yml
---
- name: Update fapolicyd configuration
  hosts: all
  become: true
  roles:
    - { role: shaneboulden.fapolicyd }
```
This playbook is going to apply the fapolicyd role to all of the servers in our inventory. Before we move on, we need to ensure that the control node can connect to the target server.
```
control~$ ssh-copy-id user1@targetserver
user1@targetserver's password: 

Number of key(s) added: 1
...
```
You can test that Ansible is correctly configured with an ad hoc command:
```
control~$ ansible all -m ping -b
targetserver | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/libexec/platform-python"
    },
    "changed": false,
    "ping": "pong"
}
```
You can now run the playbook like so:
```
control~$ ansible-playbook site.yml
BECOME Password:
```
Once the playbook completes you'll be able to see a recap of the changes:
```
targetserver               : ok=4    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```
This looks good - the Ansible playbook has made a number of changes to the target server, including installing/enabling `fapolicyd`. You can test out the local script again on the target server:
```
target~$ ./cowsay
-bash: ./cowsay: Operation not permitted
```
You can verify that the application has been blocked by `fapolicyd` by checking the audit logs:
```
target~$ sudo ausearch --start today -m fanotify --raw | aureport --file -i

File Report
===============================================
# date time file syscall success exe auid event
===============================================
48. 25/11/21 23:01:24 /home/user1/./cowsay execve no /usr/bin/bash user1 1080
```
Success! We've now automated the deployment of a a simple application control daemon on Red Hat Enterprise Linux, using reusable automation logic from the Ansible community.

## Closing out

In this article we laid the groundwork to support automating application control. We created an Ansible control node and used a role to automate `fapolicyd` setup and configuration on a target server.

In the next couple of articles we'll look at some other workflows for managing application control, like GitOps flows, or using host variables to store application state on a per-node basis. We'll also look at how to audit changes to application control state across multiple hosts.
