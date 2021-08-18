---
title: Compliance is mislabelled
date: '2021-08-18'
tags: ['compliance', 'risk', 'security']
draft: false
summary: 'Compliance evokes images of checking boxes. The real purpose of IT system compliance is risk migitation, and it probably just needs a better name'
---

When most people hear the word 'compliance' I imagine they immediately think of an auditor holding a checklist, and looking for any slight deviation from a prescribed specification.

Certainly that's true for a lot of industries (for example, export control compliance), and that's what I thought when I was first introduced to compliance for IT systems. I soon discovered this wasn't the case, and 'compliance' is simply not the right word for a lot of cyber security risk mitigation activities.

## Compliance as Code

Recently I've been contributing to an open source project called [Compliance as Code](https://github.com/ComplianceAsCode). The project's goal is to support organisations to meet cyber security standards set by bodies like NIST, the US Department of Defense, and others.

The project produces some incredible artifacts. For example, a NIST-certified scanner (`oscap`), which can scan systems against a set of controls. The project also produces Security Content Automation Procotol (SCAP) content for these various standards, which can be consumed by the scanner. And Ansible playbooks to remediate systems against a baseline.

This content isn't produced by a single organisation - it's contributed by an open source community, with a shared problem ("compliance") and who needed a common way of describing and remediating systems.

## Compliance as Code and risk mitigation

It took me some time to realise that the project supported a lot more than just "compliance". Really, it's supporting "proactive security", or risk mitigation for systems. The only difference here seems to be that the risk register hasn't been created internally, but by an external organisation. It's also likely that systems aren't permitted to operate - or touch production data - until sufficient risk treatments have been put in place. That makes sense, and I'm sure many organisations wouldn't permit a system to operate until sufficient risk mitigations are in place.

Risk management - vice 'compliance' - is certainly the approach used by NIST and the Australian Cyber Security Centre (ACSC) to implement cybersecurity controls. The [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework) references "compliance" 11 times, and "risk" 270. It even states 'this voluntary framework consists of standards, guidelines, and best practices to manage cybersecurity risk'. Similarly, the ACSC's [Information Security Manual](https://www.cyber.gov.au/acsc/view-all-content/ism) references "compliance" 5 times, and "risk" 196 times. It also states '[The ISM] outlines a cybersecurity framework that organisations can apply, using their risk management framework, to protect their systems and data from cyber threats'.

## Risk mitigation as Code

'Compliance' seems to simply be an incorrect word for describing the practice of applying and regularly reviewing these security frameworks. The same artifacts the 'Compliance as Code' project creates are excellent for declaratively describing a system's state, reporting on this, and then remediating it back to this state. 

This is the basis of risk management - which risks are you going to mitigate, which controls will you apply, how will you report on them, how will you implement them, and how will you remediate any deficiencies. In this case, the controls, risks and mitigations have already been codified through the [Compliance as Code](https://github.com/ComplianceAsCode) open source project. Organisations simply have to select which risks they want to treat.

## Wrapping up

'Compliance' for IT systems is mislabelled. It's really targeting cyber security risk management and mitigation, and the same content and tools we use to support 'compliance' for IT systems are better equipped to support security risk management.

In a later article, I'll cover how a small team I work with codified one of these cyber security risk management frameworks, and how it can be used to support risk management for Australian organisations.
