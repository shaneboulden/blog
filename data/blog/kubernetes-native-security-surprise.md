---
title: Kubernetes-native security and least surprise
date: '2021-08-23'
tags: ['kubernetes', 'native', 'risk','security','least','surprise']
draft: true
summary: 'What does it mean to be "Kubernetes-native"? And what does Kubernetes-native security mean?'
---
Recently I've been supporting organisations to adopt Kubernetes-native security platforms and ways of working. I find that it helps initially to define "Kubernetes-native", and what this means in a security context. 

## Least surprise

A few years ago I found myself creating Ruby automation code for a platform called [ManageIQ](https://manageiq.org). It's a cloud management platform which includes a sandboxed automation engine, where you can create your own Ruby code.

I'd been developing with Ruby for a few years before this, and one of the core Ruby principles is "least surprise". This means that once you've been developing in Ruby for a while, things should stop surprising you. Blocks should still behave like blocks, even as you start applying them in more complex ways. Basically the opposite of [the JavaScript "WAT" talk](https://www.destroyallsoftware.com/talks/wat).

This is what Kubernetes-native means to me. Once you have been using Kubernetes for a while, a new platform or application that is "Kubernetes-native" shouldn't surprise you. It should be able to be installed, managed and operated just like any other Kubernetes application, should use the existing Kubernetes APIs where possible to support application functionality, and should consume storage on any Kubernetes platform, wherever it is deployed.

## Kubernetes-native security

If "Kubernetes-native" means an application shouldn't surprise an experienced Kubernetes practitioner, then "Kubernetes-native security" shouldn't either. This is often where I need to support security teams who are new to Kubernetes - "this doesn't look and feel like our other security tools". Exactly - it's not designed to!

A Kubernetes-native security platform should be deployed just like any other application. For example, as a Helm chart, or a Kubernetes Operator. Security responses orchestrated by the platform should use the Kubernetes APIs - any other integration would be surprising to an experienced Kubernetes practitioner. For example, using the Kubernetes API to kill an offending pod and having the replica controller recreate it, rather than trying to kill processes at a host level.

A "Kubernetes-native" workflow to prevent vulnerable code executing on the platform would likely use an admission controller. Intercepting requests to the API prior to persisting deployments, and then mutating or validating objects against security policies. This makes perfect sense for a "Kubernetes-native" security workflow - Admission Controllers exist, let's use them!

## Enabling collaboration

The huge benefit to a Kubernetes-native platform is that teams across the organisation can now more closely collaborate. As a Kubernetes operator, you can speak to the security team about how an application will respond to a security response - because it's being orchestrated by the Kubernetes APIs! Or, as a developer, you know where to find the reason your application wasn't successfully validated by the admission controller - it's recorded in the event logs for the deployment. That's exactly where you'd expect to find information about failed deployments with a Kubernetes-native approach to security!

## Closing out

