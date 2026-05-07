---
name: design-review
description: Review UI code for design-engine compliance. Assembles DESIGN.md + tokens.json + craft context, then invokes design-reviewer agent. Use --fix to apply suggested changes via Edit operations.
argument-hint: <path> [--fix]
allowed-tools: Task, Read, Grep, Glob
---

# /design-review — Design system compliance review

Review the target for design-engine compliance by invoking the `design-reviewer` agent with full enforcement context: the project's DESIGN.md (narrative rules), tokens.json (canonical values), and craft files (universal principles).

## Step 1: Parse arguments

Trim `$ARGUMENTS`. Expected: `<path> [--fix]`.

- `path` — required. File or directory to review.
- `--fix` — optional flag. When present, the agent will return a structured Edit plan instead of just a report.

If `path` is missing, error:

```
Usage: /design-review <path> [--fix]
```

Stop.

## Step 2: Assemble enforcement context

Before invoking the agent, gather three layers of context. Each is optional but enriches the review when present.

### 2a. DESIGN.md (narrative context)

Read `<project-root>/DESIGN.md`. If found, capture its full content — the agent will use it for:
- **Section 7 (Do's and Don'ts)** — brand-specific guardrails that become enforceable review criteria.
- **Section 2 (Color Palette & Roles)** — authoritative color intent (not just raw values).
- **Section 3 (Typography Rules)** — font hierarchy rationale.
- **Section 4 (Component Stylings)** — brand-specific component expectations.

If `DESIGN.md` is not found, note its absence but continue — the agent can still review against the skill rules and tokens.

### 2b. tokens.json (canonical value set)

Read `<project-root>/tokens.json`. If not found, fall back to `${CLAUDE_PLUGIN_ROOT}/data/tokens.json` (bundled defaults). Parse the W3C format to extract all token paths and values.

The agent uses this to:
- Verify that hardcoded values in the target match a declared token.
- Suggest the correct `var(--token-name)` replacement for violations.
- Check shadow opacity, spacing, and radius values against the canonical set.

If neither project nor bundled tokens.json exists, note its absence but continue.

### 2c. Craft files (universal design principles)

Determine the active skill by reading `.design-rules/config.json` (or default to `design-engine` if no config). Parse the skill's `od.craft.requires` frontmatter to get the list of required craft topics.

For each topic in `od.craft.requires`:
1. Read `${CLAUDE_PLUGIN_ROOT}/data/craft/<topic>.md`.
2. Collect each file's content.

These craft files provide universal principles (color theory, typography rules, accessibility baselines, anti-AI-slop patterns) that apply regardless of the specific DESIGN.md. The agent uses them to catch violations of craft fundamentals, not just brand-specific rules.

If the skill has no `od.craft.requires` or craft files are missing, continue without them.

## Step 3: Invoke the agent

Use the Task tool to invoke the `design-reviewer` agent. Pass the assembled context plus the user's target path and flags.

Agent prompt:

```
Review this target for design-engine compliance: <path>

<if --fix> Apply --fix mode: after the report, propose specific Edit operations as a plan (do not call Edit directly). </if>

## Enforcement context

<if DESIGN.md found>
### DESIGN.md (project narrative)

<full DESIGN.md content>
</if>

<if tokens.json found>
### tokens.json (canonical token values)

<full tokens.json content>

Use these tokens as the authoritative value set. Any hardcoded color, spacing, radius, shadow, or font value in the target that does not match a token is a violation. Suggest the matching var(--token-path) for each.
</if>

<if craft files found>
### Craft principles

<for each craft topic>
#### <topic>

<craft file content>
</for>

Apply these universal principles alongside the brand-specific DESIGN.md rules. Craft violations (e.g., contrast below accessibility baseline, animation exceeding discipline thresholds, missing state coverage) are flagged with the same severity as brand violations.
</if>
```

## Step 4: Surface the report

When the agent returns:

1. Print the agent's full report to the user.
2. If the report indicates `No UI content detected`, stop here.
3. At the end of the report, note which context sources were available:
   ```
   Context: DESIGN.md ✓ | tokens.json ✓ | craft (5 topics) ✓
   ```
   Use ✗ for any source that was not found.

## Step 5: Apply edits (only if `--fix` was passed)

If `--fix` was passed and the agent returned a `### Proposed edits` plan:

1. Walk the plan one edit at a time.
2. For each edit, ask the user: `Apply edit <N> of <total>? (file:line, rule)` and surface the old/new diff.
3. On user confirmation (`yes`, `y`, `apply`), call Edit with the exact `Old`/`New` strings from the plan.
4. On rejection (`no`, `skip`), move to the next edit.
5. On `all` or `apply all`, apply all remaining edits without further prompting.
6. After the last edit, report a summary: `<count> applied, <count> skipped`.

Do not apply edits without explicit user confirmation per edit (or `all` shortcut).

## Notes

This command assembles a rich context for the `design-reviewer` agent. The three context layers work together:

- **DESIGN.md** tells the agent *what the brand wants* — narrative intent, do's and don'ts, specific component expectations.
- **tokens.json** tells the agent *what values are legal* — any hardcoded value not in this set is flagged with a concrete replacement suggestion.
- **Craft files** tell the agent *what universal design principles apply* — accessibility baselines, color theory, typography discipline, state coverage requirements.

Without tokens.json, the agent can only flag values that *look wrong* (pure black, off-table font sizes). With tokens.json, the agent can flag values that *are wrong* — they don't match any declared token. This makes reviews enforceable rather than advisory.
