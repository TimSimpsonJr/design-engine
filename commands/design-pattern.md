---
name: design-pattern
description: Generate a composed UI pattern (card layout, list, form section, grid) using the active adapter's pattern template. Common patterns include HeroCard, ChartCard, ListItem, KPI grid, BriefingCarousel.
argument-hint: <pattern-name> "<description>"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /design-pattern — Scaffold a Composed Pattern

You are generating a new pattern file (a composed UI block, not a primitive) in the user's project. Patterns combine multiple primitives into a reusable layout — HeroCard, ChartCard, ListItem, KpiGrid, BriefingCarousel are typical examples.

## Step 0: Parse arguments

Trim `$ARGUMENTS`. Expected: `<pattern-name> "<description>"`.

Extract:
- `patternName` — first non-quoted token. Used for code identifiers.
- `description` — the quoted string. Surface back to the user as a hint for fleshing out the body.

If `patternName` is missing, error:

```
Usage: /design-pattern <pattern-name> "<description>"
```

Stop.

Derive variants:
- `pascalName` — PascalCase (e.g., `hero-card` → `HeroCard`, `briefing_carousel` → `BriefingCarousel`)
- `kebabName` — kebab-case lowercase (e.g., `HeroCard` → `hero-card`, `KpiGrid` → `kpi-grid`)

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

If `adapter == "obsidian-css"` or `adapter == "plain-css"`, error and stop:

```
The `<adapter>` adapter has no built-in pattern templates — patterns are a component-framework idiom. Use /design-component instead, or hand-author your pattern as plain HTML/CSS.
```

If `manifest.templates.pattern` is null (e.g., base `tailwind-v4`), error:

```
The `<adapter>` adapter doesn't define a pattern template. Use a framework adapter (react-shadcn, astro, sveltekit).
```

## Step 3: Read template

Resolve the path: `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/<manifest.templates.pattern>`. Read it.

## Step 4: Substitute placeholders

Replace in the template body:
- `<PATTERN_NAME>` → `pascalName` (replace ALL occurrences — type names, function names, exports)
- `<pattern-name-kebab>` → `kebabName` (used for `data-slot` attributes)

If the template has placeholder prop comments (e.g., `// Add other props here`), leave them — the user will fill in based on the description.

## Step 5: Determine output path

Per adapter:

- **`react-shadcn`**: `src/components/patterns/<kebabName>.tsx`
- **`astro`**: `src/components/<PascalName>.astro` (Astro convention prefers PascalCase filenames for components)
- **`sveltekit`**: `src/lib/components/patterns/<PascalName>.svelte`

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

Use Write to create the file with substituted content.

## Step 8: Summary

Print:

```
Generated pattern `<pascalName>`.
  Adapter: <adapter>
  Path: <output-path>
  Description: <description>

Next:
- Open <output-path> and fill in the props/composition based on your description
- Patterns should compose primitives from src/components/ui/ (or adapter equivalent)
- Use semantic tokens only (no hardcoded colors)
- Add `data-slot="<kebabName>"` to the root element (already in the template)
- /design-review <output-path> — audit when done
```

## Notes for Claude

- Use absolute paths anchored at the project root for all file operations.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the design-engine plugin's install directory.
- The pattern is a scaffold — Claude SHOULD NOT auto-implement the body based on the description. The user will fill it in. The template is intentionally skeletal so the user keeps creative control.
- If the user asks you to implement the body inline (in a follow-up), follow design-engine rules: data-slot on the root, `cn()` for className composition (react-shadcn), semantic tokens only, no hardcoded colors.
