---
name: design-review
description: Review UI code for design-engine compliance. Invokes design-reviewer agent. Use --fix to apply suggested changes via Edit operations.
argument-hint: <path> [--fix]
allowed-tools: Task
---

# /design-review — Design system compliance review

Review the target for design-engine compliance by invoking the `design-reviewer` agent.

## Step 1: Parse arguments

Trim `$ARGUMENTS`. Expected: `<path> [--fix]`.

- `path` — required. File or directory to review.
- `--fix` — optional flag. When present, the agent will return a structured Edit plan instead of just a report.

If `path` is missing, error:

```
Usage: /design-review <path> [--fix]
```

Stop.

## Step 2: Invoke the agent

Use the Task tool to invoke the `design-reviewer` agent. Pass the full user prompt through verbatim — the agent expects to see the path and the optional `--fix` flag.

Agent prompt:

```
Review this target for design-engine compliance: <path>

<if --fix> Apply --fix mode: after the report, propose specific Edit operations as a plan (do not call Edit directly). </if>
```

## Step 3: Surface the report

When the agent returns:

1. Print the agent's full report to the user.
2. If the report indicates `No UI content detected`, stop here.

## Step 4: Apply edits (only if `--fix` was passed)

If `--fix` was passed and the agent returned a `### Proposed edits` plan:

1. Walk the plan one edit at a time.
2. For each edit, ask the user: `Apply edit <N> of <total>? (file:line, rule)` and surface the old/new diff.
3. On user confirmation (`yes`, `y`, `apply`), call Edit with the exact `Old`/`New` strings from the plan.
4. On rejection (`no`, `skip`), move to the next edit.
5. On `all` or `apply all`, apply all remaining edits without further prompting.
6. After the last edit, report a summary: `<count> applied, <count> skipped`.

Do not apply edits without explicit user confirmation per edit (or `all` shortcut).

## Notes

This command is a thin wrapper around the `design-reviewer` agent. The agent does the heavy lifting (reading rules, parsing code, computing severity); this command is responsible only for argument parsing and orchestrating the optional edit-apply step.
