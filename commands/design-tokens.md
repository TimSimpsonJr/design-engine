---
name: design-tokens
description: View, add, update, or remove individual design tokens (colors, fonts, spacing, radii, shadows, motion) in the current project. Edits theme.css. For wholesale palette swaps use /design-skin instead.
argument-hint: list [type] | add <type> <name> <value> | update <type> <name> <value> | remove <type> <name>
allowed-tools: Read, Write, Edit, Grep, Glob
---

# /design-tokens — Token CRUD

You manage individual design tokens in the active adapter's `theme.css`. This is for surgical edits — single colors, single shadows, single radii. For wholesale palette swaps use `/design-skin`.

## Argument parsing

Trim `$ARGUMENTS` and inspect the first token:
- Empty → error: "Usage: /design-tokens list [type] | add <type> <name> <value> | update <type> <name> <value> | remove <type> <name>"
- `list` → **Case 1** (list)
- `add` → **Case 2** (add)
- `update` → **Case 3** (update)
- `remove` → **Case 4** (remove)
- Anything else → error with the usage line above

## Universal preamble (all cases)

Read `.design-rules/config.json`. If it doesn't exist, error: "No design system initialized — run `/design-init` first." and stop.

Parse `<adapter>` from the marker.

Read `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/manifest.json` to get `theme.targetPath`. The theme file lives at `<targetPath>/theme.css` — call this `<theme-css-path>` below.

## Token categories

The plugin recognizes 6 categories. Use these to group output and to validate input.

| Category | Token name patterns | Value formats |
|---|---|---|
| `color` | `brand`, `primary`, `secondary`, `background`, `foreground`, `card`, `popover`, `muted`, `accent`, `destructive`, `success`, `warning`, `info`, `border`, `input`, `ring`, `text-*`, `surface-*`, `*-foreground`, `*-tint`, `chart-*`, `sidebar-*`, `icon-default`, `alert-badge`, `switch-background`, `input-background` | hex (`#RRGGBB`, `#RRGGBBAA`), `rgb()`, `rgba()`, `hsl()`, `hsla()`, `oklch(...)`, CSS named colors |
| `typography` | `font-*` (e.g., `font-sans`, `font-mono`, `font-size`, `font-weight-*`) | font-family name (string), font-size (`px`, `rem`, `em`), font-weight (number 100–900) |
| `spacing` | `spacing-*` | `<n>rem`, `<n>px`, `<n>em` |
| `radius` | `radius`, `radius-*` | `<n>rem`, `<n>px`, `<n>em` |
| `shadow` | `shadow-*` | valid `box-shadow` syntax (`<x> <y> <blur> <spread> <color>`, comma-separated layers, `none`, `inset`) |
| `motion` | `duration-*`, `ease-*` | duration: `<n>ms`/`<n>s`. ease: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, or `cubic-bezier(...)` |

If a user-supplied `<type>` doesn't match one of those six, error: "Unknown type `<type>`. Valid types: color, typography, spacing, radius, shadow, motion."

---

## Case 1: list [type]

Examples: `/design-tokens list`, `/design-tokens list color`.

### 1a. Parse the optional type filter

After `list` there may be one more token (e.g., `color`). Validate against the 6 categories. If absent, no filter — show all.

### 1b. Read theme.css

Read `<theme-css-path>`. Extract every `--<token>: <value>;` declaration from the `:root { ... }` block. (Ignore `.dark` and `@theme inline` for the listing — `:root` is the source of truth for light-mode token state. Mention dark availability in the summary line at the end.)

### 1c. Categorize

For each token, classify by name pattern (use the table above). Tokens that match no category fall into a `misc` bucket — surface them at the bottom.

### 1d. Print

Format (skip categories that have zero matches; if `[type]` filter, only print that one section):

```
Colors (12):
  --brand:        #635BFF
  --primary:      #0A2540
  --destructive:  #DF1B41
  ...

Typography (4):
  --font-sans:        Inter, ...
  --font-weight-medium: 500
  ...

Spacing (0):
  (none defined)

Radii (5):
  --radius:    0.625rem
  --radius-sm: 0.375rem
  ...

Shadows (5):
  --shadow-card:   0 1px 3px rgba(0,0,0,0.04)
  ...

Motion (8):
  --duration-fast:   100ms
  --ease-default:    cubic-bezier(0.4, 0, 0.2, 1)
  ...
```

Pad token names so values line up within each section (look at the longest name in the section, add 2 spaces).

End with a one-line summary:

```
<total> tokens in :root, <dark-count> overrides in .dark. Source: <theme-css-path>
```

---

## Case 2: add <type> <name> <value>

Example: `/design-tokens add color brand-secondary "#FF0000"`.

### 2a. Parse arguments

`$ARGUMENTS` after `add` should be: `<type> <name> <value>`.

- `<type>` — one of the 6 categories
- `<name>` — the token name **without** the `--` prefix (or accept it with `--` and strip it)
- `<value>` — the rest of the argument string (may be quoted; strip surrounding quotes)

If any are missing, error with usage and stop.

### 2b. Validate

- Type must be one of the 6 categories.
- Name must match `[a-z][a-z0-9-]*` (lowercase, dashes, no spaces).
- Value must match the format expected for the type (see table above):
  - `color`: hex (3, 6, or 8 digits), `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)`, `oklch(...)`
  - `typography`: bare font name (e.g., `Inter`), or font-size (`<n>px`/`<n>rem`/`<n>em`), or font-weight (100–900)
  - `spacing`: `<n>rem`/`<n>px`/`<n>em`
  - `radius`: same as spacing
  - `shadow`: at least one numeric component followed by a color, OR `none`, OR starts with `inset`
  - `motion`: duration (`<n>ms`/`<n>s`) OR easing (`linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier(...)`)

If validation fails, error with the specific reason (e.g., "Color value must be a hex code, rgb(), hsl(), or oklch(). Got: `purple-ish`").

### 2c. Check for collision

Read `<theme-css-path>`. If `--<name>:` already exists in the `:root` block, suggest update instead:

```
Token `--<name>` already exists with value `<existing>`.
Use `/design-tokens update <type> <name> <value>` to change it.
```

Stop.

### 2d. Insert into :root

Find the appropriate section comment in the `:root` block. Section comment markers used in adapters:
- color: `/* === CUSTOMIZE: Brand Colors ===`, `/* === Status Colors ===`, `/* === Surface Colors ===`, etc. — pick the closest one based on name pattern. If the new color doesn't fit any obvious section, append under a `/* === Custom ===` section (create it if absent).
- typography: under `/* === Typography ===`
- spacing: under `/* === Spacing ===` (create if absent)
- radius: under `/* === Radius ===`
- shadow: under `/* === Shadows ===`
- motion: under `/* === Motion / Animation ===`

Insert the line `  --<name>: <value>;` at the end of the section (just before the next `/* === ... ===` comment or before the closing `}` if it's the last section).

### 2e. Insert into .dark

Find the `.dark { ... }` block. Decide whether the token needs a dark variant:
- For colors, almost always yes. Ask: "Provide a dark-mode value for `--<name>` (or press Enter to use the same value `<value>`):"
  - Wait for response. If empty, use the same value.
  - If the user provides a value, validate it (same validation as 2b).
- For radii, shadows, motion, typography — only add to `.dark` if the user explicitly asks. By default skip.

If a dark value is set, insert `  --<name>: <dark-value>;` into the `.dark` block (append at the end of the relevant section if one exists, else just before the closing `}`).

### 2f. Confirm

```
Added token `--<name>`:
  :root: <value>
  .dark: <dark-value>  (if applicable)
in <theme-css-path>
```

---

## Case 3: update <type> <name> <value>

Example: `/design-tokens update color brand "#9333EA"`.

### 3a. Parse and validate

Same as Case 2a/2b — parse `<type>`, `<name>`, `<value>`, validate type and value format.

### 3b. Locate existing

Read `<theme-css-path>`. Find `--<name>:` in the `:root` block. If not found:

```
Token `--<name>` doesn't exist. Use `/design-tokens add <type> <name> <value>` instead.
```

Stop.

### 3c. Replace in :root

Use Edit to replace the existing `--<name>: <old-value>;` line with `--<name>: <value>;`.

### 3d. Replace in .dark (if present)

Search the `.dark` block for `--<name>:`. If present, ask:

```
The token `--<name>` is also defined in .dark with value `<dark-old>`.
New dark value (or press Enter to keep `<dark-old>`, or type `same` to mirror the new light value `<value>`):
```

Apply accordingly. If the token isn't present in `.dark`, just leave `.dark` alone.

### 3e. Confirm

```
Updated token `--<name>`:
  :root: <old-value> → <value>
  .dark: <old-dark> → <new-dark>  (if applicable)
in <theme-css-path>
```

---

## Case 4: remove <type> <name>

Example: `/design-tokens remove color brand-secondary`.

### 4a. Parse

`<type>` and `<name>`. No `<value>` needed. Validate type.

### 4b. Locate

Read `<theme-css-path>`. Search `:root` and `.dark` blocks for `--<name>:`. If neither has it, error: "Token `--<name>` not found." and stop.

### 4c. Usage check

Before deleting, Grep for `var(--<name>)` across the whole project (exclude `node_modules`, `.git`, `dist`, `build`):

```
Grep: pattern: "var\(--<name>\)"
output_mode: content
-n: true
glob: skip node_modules/.git/dist/build
```

If matches are found, list them. Each match shows `<file>:<line>: <snippet>`.

### 4d. Confirm with user

If the token is a semantic core (any of: `brand`, `primary`, `background`, `foreground`, `border`, `card`, `destructive`, `radius`, `font-sans`), warn extra hard:

```
WARNING: `--<name>` is a semantic core token. Removing it will break any component that uses it.

Found <n> usages in:
  src/components/Button.tsx:12: className="bg-[var(--brand)]"
  src/components/Hero.tsx:34: color: var(--brand);
  ...

Type `yes` to remove, anything else to abort:
```

For non-core tokens, the same prompt but without the WARNING line. If zero usages, just confirm:

```
Removing `--<name>` (no usages found in project source).
Proceed? [Y/n]
```

Wait for an explicit yes before deleting.

### 4e. Delete

Use Edit to remove the `--<name>: <value>;` line from `:root`. If present in `.dark`, also remove there. Don't leave a blank line where the token was — collapse the gap.

### 4f. Confirm

```
Removed token `--<name>` from <theme-css-path>.
  Was: <value> (light), <dark-value> (dark)  (only show if dark existed)
  Found <n> usages — update those callsites manually.  (only if usages were found)
```

If usages were found, append a list of file:line references so the user can chase them down.

---

## Notes for Claude

- Always use absolute paths or paths anchored at the project root.
- Use Edit (line replacement) rather than Write (full rewrite) for `theme.css` modifications. Preserve all formatting, comments, and untouched tokens.
- When inserting new tokens, match the existing indentation of the file (typically 2 spaces).
- Token names are case-sensitive in CSS — always lowercase per the design-engine convention.
- The `@theme inline { ... }` block at the bottom of theme.css (in the tailwind-v4 adapter) maps `--color-<name>: var(--<name>);`. When you add a new color token, also add the corresponding `--color-<name>: var(--<name>);` line to `@theme inline` so Tailwind picks it up. Do this only for the `color` type, not other categories. If the active adapter doesn't have an `@theme inline` block, skip this step.
- For value validation, be permissive but not careless. If a user passes `red` (a CSS named color), accept it. If they pass `notacolor`, reject with a clear message.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the design-engine plugin's install directory.
- This command does NOT touch fonts.css. Font changes go through `/design-skin` (which swaps the import URL alongside the palette). Adding a new `--font-*` token here is fine — it just modifies the CSS variable, not the import.
