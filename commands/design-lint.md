---
name: design-lint
description: Fast pattern-based lint — Grep for common violations across a directory in seconds. No agent — uses regex patterns to flag obvious issues (hardcoded #000, off-table font sizes, px-4/mx-4 instead of px-6/mx-6). For deep review use /design-review.
argument-hint: <path>
allowed-tools: Read, Grep, Glob, Bash
---

# /design-lint — Fast pattern-based lint

Run a fast, regex-based scan of the target path for common design-engine violations. This is much faster than `/design-review` (no agent invocation) but narrower in scope — it catches obvious issues only. For deep review use `/design-review`.

## Step 1: Parse arguments

Trim `$ARGUMENTS`. Expected: `<path>`.

If `path` is missing, error:

```
Usage: /design-lint <path>
```

Stop.

## Step 2: Verify project initialized

Read `.design-rules/config.json` at the project root. If missing, error:

```
No design system in this project — run /design-init first.
```

Stop.

## Step 3: Run pattern checks

For each pattern below, run a Grep against `<path>`. For each match, record `file:line` and the violation type. After all patterns run, output a consolidated report.

### Pattern 1 — Pure black (Rule 3)

Grep pattern: `color:\s*#000\b|color:\s*#000000\b|background(-color)?:\s*#000\b|background(-color)?:\s*#000000\b|text-black\b|bg-black\b|#000"`

Severity: 🔴 FAIL
Fix: use the skin's text-primary token (e.g., `text-text-primary`) or background token.

### Pattern 2 — Off-table font sizes

Grep pattern: `text-\[\d+px\]`

For each match, parse the px value. Allowed values from the Font Size by Context table: **10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 24, 30, 36, 48**.

If the px value is NOT in this list, flag it with severity 🔴 FAIL.
Fix: use the closest allowed value.

Also check CSS files: grep for `font-size:\s*\d+px` and apply the same check.

### Pattern 3 — Wrong margin/padding values

Grep pattern: `\bmx-[1234578]\b|\bpx-[1234578]\b|\bmy-[1234578]\b|\bpy-[1234578]\b|\bm-[1234578]\b|\bp-[1234578]\b`

Severity: 🟡 WARN
Fix: Use values that match the project's grid (typically `mx-6`/`px-6` for page-level horizontal spacing, `gap-3`/`gap-6` for layout gaps).

Note: This pattern intentionally excludes `0`, `6`, `9`, `12`, etc. — those are common on the 6px grid. The flagged values (1, 2, 3, 4, 5, 7, 8) are the off-grid ones; review each in context.

### Pattern 4 — Missing data-slot

For each component file in `<path>`, check whether components export named `function Component(`/`const Component = (` patterns include a `data-slot=` attribute.

```bash
# pseudo-bash for clarity
grep -lE 'export (function|const) [A-Z]' <path>  # files with components
# for each match file:
grep -L 'data-slot=' <file>  # report files lacking data-slot
```

Severity: 🟡 WARN
Fix: add `data-slot="component-name"` to the component's root element.

### Pattern 5 — Hardcoded hex on non-status

Grep pattern: `#[0-9a-fA-F]{6}\b` and `#[0-9a-fA-F]{3}\b`

For each match:

- Skip if the file path matches `theme.css`, `tokens.json`, `*.skin.json`, or any file under `skins/`.
- Skip if the surrounding context is a CSS variable definition (`--*: #...`).
- Skip status colors that match common error/warning/success hexes (the skin defines these, but inline use elsewhere is still a flag — surface them, let the user judge).
- Otherwise: severity 🔴 FAIL, fix: use a semantic token (`--brand`, `--text-primary`, etc.).

### Pattern 6 — Inline `style={{`

Grep pattern: `style=\{\{`

For Tailwind-based projects, inline style props are usually a sign of escape-hatching design tokens.

Severity: 🟡 WARN
Fix: Move the value to a Tailwind utility or a CSS variable defined in the skin.

### Pattern 7 — Touch target violations

Grep pattern: search for `<button` and `<a ` lines. For each, check whether the same element has one of: `min-h-11`, `size-11` (or larger), `h-11` (or larger), `p-3` or larger padding hint.

```bash
grep -nE '<button[^>]*>' <file>
# for each line, check if it lacks min-h-11/size-11/h-11/h-12+
```

Severity: 🔴 FAIL when the button has explicit `h-9`/`h-10`/`size-8`/`size-9`/`size-10` (smaller than 44px). Otherwise 🟡 WARN to review for implicit sizing.
Fix: add `min-h-11 min-w-11` or `size-11`.

### Pattern 8 — Raw px values in Tailwind utilities

Grep pattern: `\bp-\[\d+px\]|\bm-\[\d+px\]|\bgap-\[\d+px\]|\bw-\[\d+px\]|\bh-\[\d+px\]`

Severity: 🟡 WARN
Fix: Use Tailwind scale (`p-6`, `m-3`, `gap-3`).

### Pattern 9 — Old size syntax

Grep pattern: `\bw-\d+\s+h-\d+\b` (e.g., `w-4 h-4`).

Severity: 🟡 WARN
Fix: Use `size-N` shorthand.

### Pattern 10 — Physical properties

Grep pattern: `\bml-\d|\bmr-\d|\bpl-\d|\bpr-\d`

Severity: 🟡 WARN
Fix: Use logical properties (`ms-N`, `me-N`, `ps-N`, `pe-N`).

## Step 4: Output report

```
🔴 FAIL  <file>:<line>  Pure black: text-black → use text-text-primary (Rule 3)
🔴 FAIL  <file>:<line>  Off-table font: text-[35px] → text-[36px]
🔴 FAIL  <file>:<line>  Hardcoded hex: text-[#3C3C3C] → use semantic token
🟡 WARN  <file>:<line>  Wrong margin: mx-4 → mx-6
🟡 WARN  <file>:<line>  Inline style → move to Tailwind/CSS variable
🟡 WARN  <file>:<line>  Touch target: <button h-9> → add min-h-11
🟡 WARN  <file>:<line>  Old syntax: w-4 h-4 → size-4
🟡 WARN  <file>:<line>  Physical prop: ml-2 → ms-2

Total: <X> errors, <Y> warnings across <N> files.
```

If errors > 0, advise: `Run /design-review <path> for deep review with suggested fixes.`
If errors = 0 and warnings = 0, output: `🟢 PASS  No violations found.`

## Notes

This command is intentionally fast and shallow. It catches obvious issues that a regex can find. It cannot reason about context (e.g., whether a hardcoded hex is acceptable inside a story file, or whether a small button is intentional in a dense table). For nuanced review use `/design-review`. For accessibility use `/design-a11y`. For UX use `/design-audit`.
