---
name: design-component
description: Generate a new UI primitive component (Button, Card, Badge, etc.) following design-engine conventions. Uses the active adapter's component template idiom.
argument-hint: <component-name> "<description>"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /design-component — Scaffold a UI Primitive

> **Active design system:** if `<project-root>/DESIGN.md` exists, read it for narrative context. The "Visual Theme & Atmosphere" and "Do's and Don'ts" sections are particularly relevant to generation tone.

You are generating a new primitive component (a low-level reusable unit — Button, Card, Badge, Input — not a composed pattern). Patterns are for `/design-pattern`; this command is for the building blocks underneath.

## Step 0: Parse arguments

Trim `$ARGUMENTS`. Expected: `<component-name> "<description>"`.

Extract:
- `componentName` — first non-quoted token.
- `description` — quoted string. Surface back; the user fills in the body.

If `componentName` is missing, error:

```
Usage: /design-component <component-name> "<description>"
```

Stop.

Derive variants:
- `pascalName` — PascalCase (e.g., `button` → `Button`, `text-input` → `TextInput`)
- `kebabName` — kebab-case lowercase (e.g., `Button` → `button`, `TextInput` → `text-input`)

## Step 1: Verify project initialized

Read `.design-rules/config.json` at the project root.

If missing, error:

```
No design system in this project — run `/design-init` first.
```

Stop.

Parse it. Capture `adapter`.

## Step 2: Read adapter manifest

Read `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/manifest.json`.

### Adapter compatibility check

- **`obsidian-css`**: error and stop.

  ```
  The obsidian-css adapter has no component primitives — Obsidian themes use vanilla CSS classes targeting Obsidian's own DOM. Add styles to your theme/styles.css instead.
  ```

- **`plain-css`**: error and stop.

  ```
  The plain-css adapter has no component idiom — write inline HTML + CSS in your pages. Use /design-pattern equivalents directly inside <style> blocks if you need reusable styles.
  ```

If `manifest.templates.component` is null (e.g., base `tailwind-v4`), error:

```
The `<adapter>` adapter doesn't define a component template. Use a framework adapter (react-shadcn, astro, sveltekit).
```

## Step 3: Read template

Resolve: `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/<manifest.templates.component>`. Read it.

## Step 4: Substitute placeholders

Replace in the template body:
- `<COMPONENT_NAME>` → `pascalName` (replace ALL occurrences — interface name, function name, export)
- `<component-name-kebab>` → `kebabName` (for `data-slot` attribute)

Leave the placeholder prop comments and `base-classes-here` strings — the user will fill those in.

## Step 5: Determine output path

Per adapter:

- **`react-shadcn`**: `src/components/ui/<kebabName>.tsx`
- **`astro`**: `src/components/<PascalName>.astro`
- **`sveltekit`**: `src/lib/components/<PascalName>.svelte`

Create parent directories if missing.

## Step 6: Confirm overwrite

If the file exists:
- If `--force` was passed, overwrite.
- Otherwise prompt:

  ```
  File exists at <path>. Options:
  1. Overwrite
  2. Write to <path-with--2-suffix> instead
  3. Cancel
  ```

  Default to option 2 on Enter.

## Step 7: Write file

Write the substituted body.

## Step 8: Summary

Print:

```
Generated component `<pascalName>`.
  Adapter: <adapter>
  Path: <output-path>
  Description: <description>

Next:
- Open <output-path> and implement the component logic based on your description
- Follow design-engine conventions:
  - `data-slot="<kebabName>"` on the root element (already in the template)
  - Compose className with `cn()` (react-shadcn) — pass-through `className` last
  - Semantic tokens only — no hardcoded colors (use `bg-card`, `text-text-primary`, etc.)
  - Forward props with `...props` so consumers can extend behavior
  - Single responsibility — one component, one concern
- /design-pattern <name> "<desc>" — compose this primitive into a pattern
- /design-review <output-path> — audit when done
```

## Notes for Claude

- Use absolute paths anchored at the project root for all file operations.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the design-engine plugin's install directory.
- The template is intentionally minimal. Don't auto-implement the body unless the user explicitly asks in a follow-up — let them describe the props and behavior they want first.
- If you DO implement on follow-up, the design-engine rules for primitives are:
  - data-slot attribute, kebab-cased
  - cn() composition for className with consumer override last
  - Forward all standard HTML props (`...props`)
  - Use only semantic tokens from theme.css — no Tailwind color literals (`bg-blue-500` is wrong, `bg-primary` is right)
  - No business logic in primitives — only presentation
