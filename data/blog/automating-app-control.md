---
title: Automating application control
date: '2021-11-04'
tags: ['application', 'control', 'risk','security','linux','automation']
draft: true
summary: 'Automation allows organisations to scale security workflows across hybrid cloud environments. In this article, I'll take a closer look at automating application control, and how you can use Ansible roles to create reusable automation content.'
---
Implementing application control represents a significant uplift in managing the risk profile for systems - assuming you have teams that can support it. The Ponemon Institute report from 2020 indicated that 41% of organisations experienced a loss of skilled cyber security people, as well as an increase in the complexity of attacks. So, security teams need to do more with less - respond to and defend against increasingly complex attacks, as well as support internal security initiatives, like DevSecOps adoption. 

This is where automation can assist. Automating security workflows, like application control, supports cyber security teams to move to higher value workflows, like threat hunting, incident enrichment and creating response plans.

## Application control and Ansible
In this article I'll look at using Ansible to automate `fapolicyd` on Red Hat Enterprise Linux.

I've covered `fapolicyd` in a few articles previously. Specifically, how you can support application control across Red Hat Enterprise Linux and Kubernetes/OpenShift and add integrity checks to application control processes.

Ansible is an agentless automation framework, enabling you to create human-readable automation workflows across systems. It has a very active open source community, and is established in many organisations supporting automation.

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

If you'd like to see how the role is created, you can find the code here on GitHub.

## Using an Ansible role to automate application control

### Setup and preparation

Let's see how you can use this role to automate application control configuration. Create a new Red Hat Enterprise Linux server (you can get access here) and pull down the latest copy of `cowsay` into a user's home directory.
```
user~$ curl -L https://github.com/Code-Hex/Neo-cowsay/releases/download/v1.0.3/cowsay_1.0.3_Linux_x86_64.tar.gz | tar -xz
```
If you try to run this command you shouldn't have any issues:
```
user~$ ./cowsay "moooo"
TODO < add graphic >
```
Let's install and setup Ansible and Git.
TODO < Insert text box with details on Ansible as a control node>
```
user~$ sudo yum install ansible git -y
```
Now that Ansible is installed, we can pull down our example playbooks.
```
git clone https://github.com/shaneboulden/fapolicyd-config
```
This repository contains some example playbooks that we can use to try out the Ansible role. You can see that the role is defined in the `roles/requirements.yml` file:
```
---
- src: shaneboulden.fapolicyd
```
Let's create a couple of basic files we need to get this playbook working. Create a new file `ansible.cfg` with the following content:
```
[defaults]
inventory=./inventory
roles_path=./roles

[privilege_escalation]
become_method=sudo
become_ask_pass=yes
```
Let's also create an inventory. Usually this would identify other hosts, but we will just use the `localhost` for now:
```
[all]
localhost ansible_connection=local
```
Once we've those requirements setup, let's install the role from Ansible Galaxy. You can use the `ansible-galaxy` cli:
```
ansible-galaxy install
```
You'll be able to see that the role is now installed and ready to use.
```

```

### Using the Ansible playbooks and roles
