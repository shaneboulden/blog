---
title: Application control and integrity checks
date: '2021-10-06'
tags: ['application', 'control', 'integrity','risk','security','linux']
draft: false
summary: 'Injecting integrity checks to application control processes is a winning security combination. Application control allows you to specify that only certain processes can execute on a system - but how do you know they are the right processes? How can you ensure that the code that you want to execute is the code that actually executes?'
---
Application control is recognised as one of the most effective strategies for system security, and preventing the execution of malicious code. Application control is also one of the Australian Cyber Security Centre (ACSC) [Essential Eight](https://www.cyber.gov.au/acsc/view-all-content/essential-eight) strategies and recommended across all classifications for organisations aligning with the Australian [Information Security Manual (ISM)](https://www.cyber.gov.au/acsc/view-all-content/ism).

In a [previous article](/blog/app-control-for-everyone) I looked at configuring application control across cloud and containers/Kubernetes workloads. In this article, I'd like to take a closer look at integrity checking. You may have only allowed a certain process to execute - but how do you know it's the right process? 

I'm using Red Hat Enterprise Linux in this article - you can get access at [developers.redhat.com](https://developers.redhat.com/rhel8)

## The file integrity dilemma

Previously we looked at `fapolicyd` for application control on Red Hat Enterprise Linux, providing the ability to control which processes can execute on a system. By default `fapolicyd` doesn't enforce any integrity checking, which can introduce some interesting challenges for security and operations teams.

Here's what I mean.

Let's firstly install and start `fapolicyd`:
```cli
$ sudo yum install -y fapolicyd
$ sudo systemctl start fapolicyd
```
Now let's drop an application onto the system from a potentially questionable source:
```cli
$ sudo -i
# curl -L https://github.com/Code-Hex/Neo-cowsay/releases/download/v1.0.3/cowsay_1.0.3_Linux_x86_64.tar.gz | tar -xz -C /usr/local/bin/
```
Switch to a regular user account and try and execute it:
```cli
$ /usr/local/bin/cowsay "Mooo"
-bash: /usr/local/bin/cowsay: Operation not permitted
```
Ordinarily this would display a friendly cow saying "Mooo". But `fapolicyd` is doing its job and not permitting this application to execute!

What if I move this file into a trusted location?
```cli
$ sudo cp /usr/local/bin/cowsay /bin/more
cp: overwrite '/bin/more'? y
```
Change to a regular user and run the file:
```cli
$ more "Mooo"
 ______
< Mooo >
 ------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```
Hmmm. So by default `fapolicyd` doesn't care what the file looks like, as long as it's executed from a trusted path. This potentially leaves us open to an attacker substituting a binary for something more malicious than `cowsay`.

## Application control and integrity

Fortunately there are several options we have to verify the integrity of files with `fapolicyd`.

#### File-size checking
This is a very fast method of integrity checking, where `fapolicyd` verifies that the file is the correct size before allowing execution. It has minimal impacts on system performance, however an attacker could replace a binary and preserve its byte size however, which needs to be taken into consideration when using this method.

#### Comparing SHA-256 hashes
Computing and checking SHA-256 checksums is more secure than file-size checking, but does have an impact on system performance.

#### Integrity Measurement Architecture (IMA) subsystem
The Linux kernel already provides mechanisms to collect and verify the state of files. Specifically, the Integrity Measurement Architecture (IMA) measures, stores and appraises files' hashes before they are accessed, which prevents the reading and execution of unreliable data.

IMA can be used by `fapolicyd` to support file integrity checks, though it is complex to configure and maintain.

In this article we'll configure`fapolicyd` to compare SHA-256 checksums to ensure file integrity, as this is simple to setup and configure.

## Configuring integrity checks with the File Access Policy Daemon
Let's make some changes to the `fapolicyd` configuration to support integrity checking. Open `/etc/fapolicyd/fapolicyd.conf` and update `integrity = none` to `integrity = sha256`.
```cli
$ sudo cat /etc/fapolicyd/fapolicyd.conf | grep integrity
integrity = sha256
```
Let's get our system back in order by re-installing `/bin/more`:
```cli
$ sudo yum reinstall -y /bin/more
```
Finally, restart `fapolicyd`:
```cli
$ sudo systemctl restart fapolicyd
```
## Testing everything out
Let's try the same routine as before. Try and execute the suspicious binary out of `/usr/local/bin/`:
```cli
$ /usr/local/bin/cowsay
-bash: /usr/local/bin/cowsay: Operation not permitted
```
It fails - all good so far! Now let's move it to `/bin/more`:
```cli
$ sudo cp /usr/local/bin/cowsay /bin/more
cp: overwrite '/bin/more'? y
```
Let's try to execute the file as a normal user:
```cli
$ more "Mooo"
-bash: /usr/bin/more: Operation not permitted
```
Success! Even though we tried to swap out the system's `more` binary with something more malicious, `fapolicyd` detected the file had been changed and prevented the application executing. 

## Next steps
In this article we looked at applying integrity checks for application control processes, providing additional assurances that the code we want to execute is *actually* the code that executes. We specifically looked at configuring the File Access Policyd daemon (`fapolicyd`) on Red Hat Enterprise Linux to compare SHA-256 hashes. You may also want to experiment with the Linux kernel's Integrity Measurement Architecture (IMA) subsystem as an alternate method of supporting file integrity with `fapolicyd`.

What we haven't considered is - what would integrity checks look like for containers on Kubernetes? I'll look at this in a future article, and some approaches to Kubernetes workload integrity.

Leave me a comment if you've had success with `fapolicyd` or Kubernetes-native approaches to application control!
