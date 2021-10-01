---
title: Application control and integrity
date: '2021-09-27'
tags: ['application', 'control', 'integrity','risk','security']
draft: true
summary: "Injecting integrity checking to application control is a winning security combination. This article explores the Linux kernel's Integrity Measurement Architecture (IMA), and integration with application control."
---
In a previous arcticle I looked at appliction control, and how it can be supported across cloud and containers/Kubernetes workloads. In this article, I'd like to take a closer look at integrity checking. You may have only allowed a certain application to execute - but how do you know it's the right application?

## The Linux kernel and integrity

Fortunately for us, the Linux kernel already includes an integrity subsystem. The IIntegrity Measurement Architecture (IMA) was first introduced in the 2.6.30 kernel, and is an open source trusted computing component. It supports creating and collecting hashes of files when opened, before their contents are accessed for read or execute.

IMA is supported by the Extended Verification Module (EVM). The EVM detects offline tampering of security extended attributes for files, and collectively these components allow us to attest to a system's runtime integrity.

For this use case we want to integrate IMA with application control. We want to only allow certain applications to execute, and we want to be able to attest to the integrity of those applications permitted to execute.

## Enabling IMA-measurement

We're using Red Hat Enterprise Linux for this article, and you can get a copy at [Red Hat Developers](https://developers.redhat.com)

The first thing we need to do is to enable the IMA-measurement subsystem. Firstly, let's verify that the `securityfs` filesystem is mounted correctly:
```
# mount | grep securityfs
securityfs on /sys/kernel/security type securityfs (rw,nosuid,nodev,noexec,relatime)
```
Let's also verify that systemd has been patched to support IMA and EVM at boot time:
```
dmesg | grep -i -e EVM -e IMA
[    0.716993] ima: No TPM chip found, activating TPM-bypass!
[    0.717004] ima: Allocated hash algorithm: sha1
[    0.717010] ima: No architecture policies found
[    0.717016] evm: Initialising EVM extended attributes:
[    0.717016] evm: security.selinux
[    0.717017] evm: security.ima
[    0.717017] evm: security.capability
[    0.717017] evm: HMAC attrs: 0x1
[    1.518714] systemd[1]: systemd 239 (239-40.el8) running in system mode. (+PAM +AUDIT +SELINUX +IMA -APPARMOR +SMACK +SYSVINIT +UTMP +LIBCRYPTSETUP +GCRYPT +GNUTLS +ACL +XZ +LZ4 +SECCOMP +BLKID +ELFUTILS +KMOD +IDN2 -IDN +PCRE2 default-hierarchy=legacy)
[    2.573586] fbcon: qxldrmfb (fb0) is primary device
[    3.646011] PM: Image not found (code -22)
[    4.598430] systemd[1]: systemd 239 (239-40.el8) running in system mode. (+PAM +AUDIT +SELINUX +IMA -APPARMOR +SMACK +SYSVINIT +UTMP +LIBCRYPTSETUP +GCRYPT +GNUTLS +ACL +XZ +LZ4 +SECCOMP +BLKID +ELFUTILS +KMOD +IDN2 -IDN +PCRE2 default-hierarchy=legacy)
```
Ok, everything looks good! Next we need to update the kernel command line parameters to enable IMA and EVM:
```
# grubby --update-kernel=/boot/vmlinuz-$(uname -r) --args="ima_policy=appraise_tcb ima_appraise=fix evm=fix"
```
Reboot the system and verify that the parameters have been added to the kernel command line:
```
# cat /proc/cmdline
BOOT_IMAGE=(hd0,msdos1)/vmlinuz-4.18.0-240.el8.x86_64 root=/dev/mapper/rhel-root ro resume=/dev/mapper/rhel-swap rd.lvm.lv=rhel/root rd.lvm.lv=rhel/swap rhgb quiet ima_policy=appraise_tcb ima_appraise=fix evm=fix
```
Now we're ready to create some keys. The first thing we need to do is to create a kernel master key to protect the EVM key:
```
# yum install -y /usr/bin/keyctl
# keyctl add user kmk "$(dd if=/dev/urandom bs=1 count=32 2> /dev/null)" @u
```
Now let's create an encrypted EVM key based on the `kmk` key:
```
keyctl add encrypted evm-key "new user:kmk 64" @u
```
Done! Create a subdirectory for exported keys:
```
mkdir -p /etc/keys
```
Search for the `kmk` key and export its value into a file:
```
# keyctl pipe `keyctl search @u user kmk` > /etc/keys/kmk*
```
Search for the evm-key user key and export its value into a file:
```
# keyctl pipe `keyctl search @u encrypted evm-key` > /etc/keys/evm-key
```
Let's now verify the newly created keys, you should see a similar output:
```
# keyctl show
Session Keyring
 223016820 --alswrv      0     0  keyring: _ses
 784443923 --alswrv      0 65534   \_ keyring: _uid.0
 545290055 --alswrv      0     0       \_ user: kmk
 801836121 --alswrv      0     0       \_ encrypted: evm-key
```
Everything looks good at this point. Let's active EVM and verify it's been initialised:
```
# echo 1 > /sys/kernel/security/evm
# dmesg | tail -1
[...] evm: key initialized
```
Let's start collecting some hashes. Make sure you have the `iva-evm-utils` and `attr` packages installed:
```
yum install -y ima-evm-utils attr
```
