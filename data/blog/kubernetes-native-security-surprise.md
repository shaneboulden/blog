---
title: Kubernetes-native security and least surprise
date: '2021-10-17'
tags: ['openshift','kubernetes', 'native', 'risk','security','least','surprise']
draft: false
summary: 'What does it mean to be "Kubernetes-native"? And what does Kubernetes-native security look like?'
---
Recently I've been supporting organisations to adopt Kubernetes-native security platforms and ways of working. I find that it helps initially to define "Kubernetes-native", and what this means in a security context.

## Least surprise

A few years ago I found myself creating Ruby automation code for an open source platform called [ManageIQ](https://manageiq.org) project. It's a cloud management platform which includes a sandboxed automation engine, where you can create your own Ruby code to execute automated workflows.

I'd been developing with Ruby for a few years before this, and one of the Ruby paradigms is ["least surprise"](https://www.artima.com/articles/the-philosophy-of-ruby#part4). This means that once you've been developing in Ruby for a while, things should stop surprising you. Blocks should still behave like blocks, even as you start applying them in more complex ways. Basically the opposite of [the JavaScript "WAT" talk](https://www.destroyallsoftware.com/talks/wat).

This is what Kubernetes-native means to me. Once you have been using Kubernetes for a while, a new platform or application that is "Kubernetes-native" shouldn't surprise you. It should be able to be installed, managed and operated just like any other Kubernetes application; should use the existing Kubernetes APIs where possible to support application functionality; and should consume storage and other resources on any Kubernetes platform, wherever it is deployed.

## Kubernetes-native security

If "Kubernetes-native" means an application shouldn't surprise an experienced Kubernetes practitioner, then "Kubernetes-native security" shouldn't either. This is often where I need to support security teams who are new to Kubernetes - "this doesn't look and feel like our other security tools and platforms". Exactly - because it's not designed to.

A Kubernetes-native security platform should be deployed just like any other application on the platform. For example, as a Helm chart, or a Kubernetes Operator. Security responses orchestrated by the platform should use the Kubernetes APIs - any other integration would be surprising to an experienced Kubernetes practitioner. For example, using the Kubernetes API to kill an offending pod and having the replication controller recreate it, rather than trying to kill processes at a host level.

A "Kubernetes-native" workflow to prevent vulnerable code executing on the platform would likely use an admission controller. Intercepting requests to the API prior to persisting deployments, and then mutating or validating objects against security policies. This makes perfect sense for a "Kubernetes-native" security workflow - admission controllers already exist, let's use them!

## Benefits of a Kubernetes-native approach to security

One of the benefits of taking a kubernetes-native approach to security is that it minimises the operational overhead of managing applications. Let me describe this with an example.

One way of approaching [application control](/blog/app-control-for-everyone) for a running container would be to detect suspicious process execution and then take some action *inside* the running container to block execution. We could potentially create an agent that is deployed within all running containers that detects and blocks suspicious processes.

This approach detracts from one of the main benefits of deploying applications to containers - easier workload management. With this approach, we still need to consider the internal state of the container when troubleshooting, and whether the agent is preventing the application from executing correctly. We need to troubleshoot *inside* the container if we detect an issue with the application, as it's difficult to replicate this externally, and suddenly we're back to managing the workload as a ['pet'](https://www.redhat.com/en/blog/container-tidbits-does-pets-vs-cattle-analogy-still-apply) again.

A Kubernetes-native approach to application control would be to use the Kubernetes APIs for enforcement. When we detect suspicious process execution within a container, we simply use the Kubernetes APIs to destroy the pod and recreate it. This means that the pod is recreated exactly as it would be to any event on the cluster - rescheduling on another node, for example. By allowing the pod to be recreated via the platform controls - rather than killing processes within the container - we can minimise both the operational overheads and risk to the application workload.

Another benefit to a Kubernetes-native approach is that teams across the organisation can now more closely collaborate. As an operator, you can speak to the security team about how an application will respond to a security response - because it's being orchestrated by the Kubernetes APIs! Or, as a developer, you know where to find the reason your application wasn't successfully validated by the admission controller - it's recorded in the event logs for the deployment. That's exactly where you'd expect to find information about failed deployments with a Kubernetes-native approach to security and application management.

## Closing out
In this article I looked at what it means to be kubernetes-native, and some of the benefits of a Kubernetes-approach to security. Specifically, we looked at application control, and how using the platform APIs to enforce security controls minimises operational overheads and risk to container workloads.

What is a security process within your organisation that could potentially be pulled across to a Kubernetes platform? What would it look like using the platform controls for enforcement? I'm interested to know what you think in the comments.
