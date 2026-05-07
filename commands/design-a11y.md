---
name: design-a11y
description: Accessibility audit — invokes accessibility-reviewer agent. Auto-fixes mechanical issues (alt text, focus rings, touch targets) with --fix.
argument-hint: <path> [--fix]
allowed-tools: Task
---

# /design-a11y — Accessibility audit

> **Active design system:** if `<project-root>/DESIGN.md` exists, read it for narrative context. The "Visual Theme & Atmosphere" and "Do's and Don'ts" sections are particularly relevant to generation tone.

Review the target for WCAG 2.2 AA compliance by invoking the `accessibility-reviewer` agent.

## Step 1: Parse arguments

Trim `$ARGUMENTS`. Expected: `<path> [--fix]`.

- `path` — required. File or directory to audit.
- `--fix` — optional flag. When present, the agent applies mechanical fixes directly (alt attributes, focus rings, touch target expansion).

If `path` is missing, error:

```
Usage: /design-a11y <path> [--fix]
```

Stop.

## Step 2: Invoke the agent

Use the Task tool to invoke the `accessibility-reviewer` agent. Pass the full user prompt through verbatim — the agent expects to see the path and the optional `--fix` flag.

Agent prompt:

```
Audit this target for WCAG 2.2 AA accessibility: <path>

<if --fix> Apply --fix mode: after the report, apply mechanical fixes (alt attributes for clearly decorative images, focus-visible rings, touch target expansion). Do not auto-fix contrast failures or semantic HTML changes — surface those for the user to decide. </if>
```

## Step 3: Surface the report

Print the agent's full report to the user, including:

- Violation list with line references.
- Contrast results (computed ratios for each token pair).
- Compliant areas.
- Summary with severity breakdown.

If `--fix` was used, also surface what the agent applied vs what was deferred.

## Notes

This command is a thin wrapper around the `accessibility-reviewer` agent. The agent does all the work — reading theme.css, computing WCAG contrast ratios, parsing interactive elements for touch target sizing, and (in `--fix` mode) applying mechanical fixes via Edit. This command is responsible only for argument parsing and surfacing the result.

For design system compliance use `/design-review`. For UX flow use `/design-audit`. For fast pattern checks use `/design-lint`.
