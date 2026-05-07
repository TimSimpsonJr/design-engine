---
name: design-audit
description: UX audit — invokes ux-auditor agent. Reports usability issues using Nielsen heuristics and mobile UX best practices. Read-only — doesn't edit code.
argument-hint: <path>
allowed-tools: Task
---

# /design-audit — UX audit

> **Active design system:** if `<project-root>/DESIGN.md` exists, read it for narrative context. The "Visual Theme & Atmosphere" and "Do's and Don'ts" sections are particularly relevant to generation tone.

Audit the target for usability issues by invoking the `ux-auditor` agent. This is read-only — the agent reports findings and does not edit code.

## Step 1: Parse arguments

Trim `$ARGUMENTS`. Expected: `<path>`.

If `path` is missing, error:

```
Usage: /design-audit <path>
```

Stop.

## Step 2: Invoke the agent

Use the Task tool to invoke the `ux-auditor` agent.

Agent prompt:

```
Audit this target for UX issues using Nielsen's 10 heuristics and mobile UX best practices: <path>

Read-only — do not edit code. Return a structured report with critical/major/minor issues, mobile UX checks, and an overall grade.
```

## Step 3: Surface the report

Print the agent's full report to the user, including:

- Critical, major, and minor issues with line references and heuristic numbers.
- Mobile UX section (thumb zone, loading states, empty states, safe areas).
- Overall grade (A+ to F).
- Top recommendation.

## Notes

This command is a thin wrapper around the `ux-auditor` agent. The audit covers usability and flow, not design system compliance — for compliance use `/design-review`, for accessibility use `/design-a11y`, for fast pattern checks use `/design-lint`.

The audit is intentionally read-only. UX changes (different empty state copy, restructured loading sequence, new confirmation dialog) are design decisions that need human judgment, not mechanical fixes.
