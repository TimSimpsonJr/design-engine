---
name: design-tokens
description: View, add, update, or remove individual design tokens (colors, fonts, spacing, radii, shadows, motion) in the current project. Operates on tokens.json (W3C format) and regenerates theme.css. For wholesale palette swaps use /design-skin instead.
argument-hint: list [type] | add <type> <name> <value> | update <type> <name> <value> | remove <type> <name> | sync [--reverse]
allowed-tools: Read, Write, Edit, Grep, Glob
---

# /design-tokens — Token CRUD

You manage individual design tokens in the project's `<root>/tokens.json` (W3C Design Tokens format). Each mutation writes tokens.json and then regenerates the active adapter's theme.css via `writeTokensToCss`. This is for surgical edits — single colors, single shadows, single radii. For wholesale palette swaps use `/design-skin`.

## Argument parsing

Trim `$ARGUMENTS` and inspect the first token:
- Empty → error: "Usage: /design-tokens list [type] | add <type> <name> <value> | update <type> <name> <value> | remove <type> <name> | sync [--reverse]"
- `list` → **Case 1** (list)
- `add` → **Case 2** (add)
- `update` → **Case 3** (update)
- `remove` → **Case 4** (remove)
- `sync` → **Case 5** (sync) — check for `--reverse` flag
- Anything else → error with the usage line above

## Universal preamble (all cases)

Read `.design-rules/config.json`. If it doesn't exist, error: "No design system initialized — run `/design-init` first." and stop.

Parse `<adapter>` from the config.

Read `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/manifest.json` to get `theme.targetPath`. The theme file lives at `<targetPath>/theme.css` — call this `<theme-css-path>` below.

The token file lives at `<root>/tokens.json`. If it doesn't exist, error: "No tokens.json found at project root — run `/design-init` to generate it from DESIGN.md." and stop.

## tokens.json format

Tokens use the W3C Design Tokens Community Group format. Top-level keys are group names; each group has a `$type` and named token entries with `$value`:

```json
{
  "color": {
    "$type": "color",
    "brand": { "$value": "#635BFF" },
    "primary": { "$value": "#0A2540" }
  },
  "font": {
    "$type": "fontFamily",
    "sans": { "$value": "Inter, system-ui, sans-serif" }
  },
  "spacing": {
    "$type": "dimension",
    "md": { "$value": "1rem" }
  },
  "radius": {
    "$type": "dimension",
    "DEFAULT": { "$value": "0.625rem" }
  },
  "shadow": {
    "$type": "shadow",
    "card": { "$value": "0 1px 3px rgba(0,0,0,0.04)" }
  },
  "motion": {
    "$type": "duration",
    "duration-fast": { "$value": "100ms" }
  }
}
```

## Token categories

The plugin recognizes 6 categories, mapped to tokens.json groups. Use these to group output and to validate input.

| Category | tokens.json group | Token name patterns | Value formats |
|---|---|---|---|
| `color` | `color` | `brand`, `primary`, `secondary`, `background`, `foreground`, `card`, `popover`, `muted`, `accent`, `destructive`, `success`, `warning`, `info`, `border`, `input`, `ring`, `text-*`, `surface-*`, `*-foreground`, `*-tint`, `chart-*`, `sidebar-*`, `icon-default`, `alert-badge`, `switch-background`, `input-background` | hex (`#RRGGBB`, `#RRGGBBAA`), `rgb()`, `rgba()`, `hsl()`, `hsla()`, `oklch(...)`, CSS named colors |
| `typography` | `font` / `typography` | `font-*` (e.g., `font-sans`, `font-mono`, `font-size`, `font-weight-*`) | font-family name (string), font-size (`px`, `rem`, `em`), font-weight (number 100-900) |
| `spacing` | `spacing` | `spacing-*` | `<n>rem`, `<n>px`, `<n>em` |
| `radius` | `radius` | `radius`, `radius-*` | `<n>rem`, `<n>px`, `<n>em` |
| `shadow` | `shadow` | `shadow-*` | valid `box-shadow` syntax (`<x> <y> <blur> <spread> <color>`, comma-separated layers, `none`, `inset`) |
| `motion` | `motion` | `duration-*`, `ease-*` | duration: `<n>ms`/`<n>s`. ease: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, or `cubic-bezier(...)` |

If a user-supplied `<type>` doesn't match one of those six, error: "Unknown type `<type>`. Valid types: color, typography, spacing, radius, shadow, motion."

---

## Case 1: list [type]

Examples: `/design-tokens list`, `/design-tokens list color`.

### 1a. Parse the optional type filter

After `list` there may be one more token (e.g., `color`). Validate against the 6 categories. If absent, no filter — show all.

### 1b. Read tokens.json

Read `<root>/tokens.json`. Parse the JSON. Iterate over groups, and within each group iterate over token entries (keys that don't start with `$`).

### 1c. Categorize

Map each group to its category using the tokens.json group column in the table above. Tokens in groups that match no category fall into a `misc` bucket — surface them at the bottom.

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

Display names use the flat CSS variable convention: `tokens.color.brand` displays as `--brand`, `tokens.radius.lg` displays as `--radius-lg`, `tokens.font.sans` displays as `--font-sans`. This matches the CSS variables emitted by `writeTokensToCss`.

Pad token names so values line up within each section (look at the longest name in the section, add 2 spaces).

End with a one-line summary:

```
<total> tokens across <group-count> groups. Source: <root>/tokens.json → <theme-css-path>
```

---

## Case 2: add <type> <name> <value>

Example: `/design-tokens add color brand-secondary "#FF0000"`.

### 2a. Parse arguments

`$ARGUMENTS` after `add` should be: `<type> <name> <value>`.

- `<type>` — one of the 6 categories
- `<name>` — the token name **without** the `--` prefix (or accept it with `--` and strip it). Also strip the group prefix if the user includes it (e.g., `color-brand` → `brand` when type is `color`).
- `<value>` — the rest of the argument string (may be quoted; strip surrounding quotes)

If any are missing, error with usage and stop.

### 2b. Validate

- Type must be one of the 6 categories.
- Name must match `[a-z][a-z0-9-]*` (lowercase, dashes, no spaces).
- Value must match the format expected for the type (see table above):
  - `color`: hex (3, 6, or 8 digits), `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)`, `oklch(...)`
  - `typography`: bare font name (e.g., `Inter`), or font-size (`<n>px`/`<n>rem`/`<n>em`), or font-weight (100-900)
  - `spacing`: `<n>rem`/`<n>px`/`<n>em`
  - `radius`: same as spacing
  - `shadow`: at least one numeric component followed by a color, OR `none`, OR starts with `inset`
  - `motion`: duration (`<n>ms`/`<n>s`) OR easing (`linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier(...)`)

If validation fails, error with the specific reason (e.g., "Color value must be a hex code, rgb(), hsl(), or oklch(). Got: `purple-ish`").

### 2c. Check for collision

Read `<root>/tokens.json`. Look up the target group for `<type>` (e.g., `color` category → `color` group). If `tokens[group][name]` already exists, suggest update instead:

```
Token `<name>` already exists in <group> with value `<existing>`.
Use `/design-tokens update <type> <name> <value>` to change it.
```

Stop.

### 2d. Insert into tokens.json

Add the new entry to the appropriate group in the parsed tokens object:

```
tokens[group][name] = { $value: value }
```

If the group doesn't exist yet, create it with the appropriate `$type`:

```
tokens[group] = { $type: "<w3c-type>", [name]: { $value: value } }
```

Write the updated object back to `<root>/tokens.json` with 2-space indentation.

### 2e. Regenerate theme.css

Read the existing theme.css at `<theme-css-path>`. Call `writeTokensToCss(tokens, { existing: existingCss })` to produce the updated CSS. Write the result back to `<theme-css-path>`.

### 2f. Confirm

```
Added token `<name>` to <group> group:
  $value: <value>
Written to <root>/tokens.json
Regenerated <theme-css-path>
```

---

## Case 3: update <type> <name> <value>

Example: `/design-tokens update color brand "#9333EA"`.

### 3a. Parse and validate

Same as Case 2a/2b — parse `<type>`, `<name>`, `<value>`, validate type and value format.

### 3b. Locate existing

Read `<root>/tokens.json`. Look up `tokens[group][name]`. If not found:

```
Token `<name>` doesn't exist in <group>. Use `/design-tokens add <type> <name> <value>` instead.
```

Stop.

### 3c. Update in tokens.json

```
const oldValue = tokens[group][name].$value;
tokens[group][name] = { $value: value };
```

Write the updated object back to `<root>/tokens.json` with 2-space indentation.

### 3d. Regenerate theme.css

Read the existing theme.css at `<theme-css-path>`. Call `writeTokensToCss(tokens, { existing: existingCss })` to produce the updated CSS. Write the result back to `<theme-css-path>`.

### 3e. Confirm

```
Updated token `<name>` in <group>:
  $value: <old-value> → <value>
Written to <root>/tokens.json
Regenerated <theme-css-path>
```

---

## Case 4: remove <type> <name>

Example: `/design-tokens remove color brand-secondary`.

### 4a. Parse

`<type>` and `<name>`. No `<value>` needed. Validate type.

### 4b. Locate

Read `<root>/tokens.json`. Look up `tokens[group][name]`. If not found, error: "Token `<name>` not found in <group>." and stop.

### 4c. Usage check

Before deleting, Grep for `var(--<css-name>)` across the whole project (exclude `node_modules`, `.git`, `dist`, `build`), where `<css-name>` is the flat CSS variable name (e.g., for `tokens.color.brand` the CSS name is `brand`; for `tokens.radius.lg` it is `radius-lg`):

```
Grep: pattern: "var\(--<css-name>\)"
output_mode: content
-n: true
glob: skip node_modules/.git/dist/build
```

If matches are found, list them. Each match shows `<file>:<line>: <snippet>`.

### 4d. Confirm with user

If the token is a semantic core (any of: `brand`, `primary`, `background`, `foreground`, `border`, `card`, `destructive`, `radius` (DEFAULT), `font-sans`), warn extra hard:

```
WARNING: `<name>` is a semantic core token. Removing it will break any component that uses it.

Found <n> usages in:
  src/components/Button.tsx:12: className="bg-[var(--brand)]"
  src/components/Hero.tsx:34: color: var(--brand);
  ...

Type `yes` to remove, anything else to abort:
```

For non-core tokens, the same prompt but without the WARNING line. If zero usages, just confirm:

```
Removing `<name>` from <group> (no usages found in project source).
Proceed? [Y/n]
```

Wait for an explicit yes before deleting.

### 4e. Delete from tokens.json

```
delete tokens[group][name];
```

If the group is now empty (only `$type` remains), remove the group entirely.

Write the updated object back to `<root>/tokens.json` with 2-space indentation.

### 4f. Regenerate theme.css

Read the existing theme.css at `<theme-css-path>`. Call `writeTokensToCss(tokens, { existing: existingCss })` to produce the updated CSS. Write the result back to `<theme-css-path>`.

### 4g. Confirm

```
Removed token `<name>` from <group>.
  Was: <value>
Written to <root>/tokens.json
Regenerated <theme-css-path>
  Found <n> usages — update those callsites manually.  (only if usages were found)
```

If usages were found, append a list of file:line references so the user can chase them down.

---

## Case 5: sync

### /design-tokens sync

Re-derive `<root>/tokens.json` from `<root>/DESIGN.md`. Use after hand-editing DESIGN.md.

#### 5a. Check for --reverse flag

If `$ARGUMENTS` contains `--reverse` after `sync`, go to Case 5b (sync --reverse) below.

#### 5b. Read DESIGN.md

Read `<root>/DESIGN.md`. If it doesn't exist, error: "No DESIGN.md found at project root — run `/design-init` to create one." and stop.

#### 5c. Parse and diff

Run `parseDesignMd(md)` (from `adapters/react-shadcn/templates/design-md-parse.ts`) to produce the new tokens object.

Read the current `<root>/tokens.json` and compare against the newly parsed tokens:
- For each group, compare token names and `$value` entries.
- Collect lists of added, removed, and changed tokens.

If no differences, report "tokens.json is already in sync with DESIGN.md." and stop.

#### 5d. Write tokens.json

Write the new tokens object to `<root>/tokens.json` with 2-space indentation.

#### 5e. Regenerate theme.css

Read the existing theme.css at `<theme-css-path>`. Call `writeTokensToCss(newTokens, { existing: existingCss })` to produce the updated CSS. Write the result back to `<theme-css-path>`.

#### 5f. Report

```
Synced tokens.json from DESIGN.md:
  Added: <list of added token names, or "none">
  Removed: <list of removed token names, or "none">
  Changed: <list of changed token names with old → new values, or "none">
Written to <root>/tokens.json
Regenerated <theme-css-path>
```

---

### /design-tokens sync --reverse

Produce a suggested DESIGN.md diff from current tokens.json — for review only, no auto-merge.

#### 5b-rev. Read inputs

Read `<root>/tokens.json` and `<root>/DESIGN.md`. If either doesn't exist, error with the appropriate missing-file message and stop.

#### 5c-rev. Generate suggested sections

Use `emitDesignMdSkeleton(tokens, { name: '<project>', mode: 'suggestion' })` (from `adapters/react-shadcn/templates/design-md-emit.ts`) to produce only the derivable sections (Sections 2, 3, 5, 6) as they WOULD appear if regenerated from the current tokens.

#### 5d-rev. Diff against actual DESIGN.md

For each derivable section in the actual DESIGN.md, diff against the corresponding section in the generated output. Produce a unified diff showing what would change.

#### 5e-rev. Output

If no differences, report "DESIGN.md already reflects current tokens.json." and stop.

If differences exist, write the diff to `.design-rules/proposed-DESIGN.md.patch` and also print it to stdout:

```
Suggested DESIGN.md changes based on current tokens.json:

--- DESIGN.md (current)
+++ DESIGN.md (from tokens.json)
@@ Section 2: Color Palette & Roles @@
- **Brand:** `#635BFF`
+ **Brand:** `#9333EA`
...

Patch written to .design-rules/proposed-DESIGN.md.patch
Review and apply manually if desired.
```

This is strictly a preview — no modifications are made to DESIGN.md.

---

## Notes for Claude

- Always use absolute paths or paths anchored at the project root.
- The canonical data flow is: DESIGN.md → tokens.json → theme.css. Mutations via add/update/remove modify tokens.json directly and regenerate theme.css. The `sync` subcommand re-derives tokens.json from DESIGN.md. The `sync --reverse` subcommand shows what DESIGN.md would look like if regenerated from tokens.json.
- Use `writeTokensToCss` from `adapters/react-shadcn/templates/theme-io.ts` (or the active adapter's copy) to regenerate theme.css from tokens. Always pass `{ existing: existingCss }` to preserve user-added unmanaged CSS, comments, and formatting in theme.css.
- Use `parseDesignMd` from `adapters/react-shadcn/templates/design-md-parse.ts` for the sync subcommand.
- Use `emitDesignMdSkeleton` with `mode: 'suggestion'` from `adapters/react-shadcn/templates/design-md-emit.ts` for sync --reverse.
- The config at `.design-rules/config.json` has `themeFile` pointing to the CSS file path.
- When reading/writing tokens.json, use 2-space indentation and preserve key ordering where possible.
- Token names in tokens.json are stored WITHOUT the CSS `--` prefix and WITHOUT the group prefix. The flat CSS variable name is derived during `writeTokensToCss`: `tokens.color.brand` → `--brand`, `tokens.radius.lg` → `--radius-lg`, `tokens.font.sans` → `--font-sans`.
- The `@theme inline { ... }` block in theme.css (in the tailwind-v4 adapter) is managed by `writeTokensToCss` — you do not need to handle it manually.
- For value validation, be permissive but not careless. If a user passes `red` (a CSS named color), accept it. If they pass `notacolor`, reject with a clear message.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the design-engine plugin's install directory.
- This command does NOT touch fonts.css. Font changes go through `/design-skin` (which swaps the import URL alongside the palette). Adding a new `font-*` token here is fine — it just modifies the token and CSS variable, not the import.
