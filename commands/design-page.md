---
name: design-page
description: Scaffold a new page using the active recipe and adapter. Generates a file with the recipe's section sequence (Hero + KPI grid + chart + list etc.). Use --recipe=<name> to override active recipe per-page.
argument-hint: <page-name> "<description>" [--recipe=<recipe-name>]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /design-page — Scaffold a New Page

You are generating a new page file in the user's project, using the active adapter's page template and the active (or overridden) recipe to expand sections. Output is a single file written at the adapter's expected path.

## Step 0: Parse arguments

Trim `$ARGUMENTS`. Expected shape: `<page-name> "<description>" [--recipe=<name>]`.

Extract:
- `pageName` — the first non-flag token. Used as-is for code identifiers; you'll derive PascalCase and kebab-case variants below.
- `description` — the quoted string (may be empty). Surface it back in the summary; not all adapters bake it into the file.
- `recipeFlag` — value of `--recipe=` if present.

If `pageName` is missing or empty, error:

```
Usage: /design-page <page-name> "<description>" [--recipe=<recipe-name>]
```

Stop.

Derive name variants:
- `pascalName` — PascalCase (e.g., `dashboard` → `Dashboard`, `user-profile` → `UserProfile`)
- `kebabName` — kebab-case lowercase (e.g., `Dashboard` → `dashboard`, `UserProfile` → `user-profile`)

## Step 1: Verify project initialized

Read `.design-rules/config.json` at the project root.

If missing, error:

```
No design system in this project — run `/design-init` first.
```

Stop.

Parse it. Capture `adapter`, `skin`, `recipe`, `font`.

## Step 2: Resolve recipe

Order of precedence:
1. If `recipeFlag` is set, use it.
2. Else use `recipe` from the marker.
3. If both are absent, prompt the user inline:

   ```
   No recipe set. Pick one:
   1. saas — dashboard with KPI grid + charts + activity
   2. ecommerce — product grid + cart + orders
   3. fintech — portfolio + transactions + chart hero
   4. social — feed + profile + messaging
   5. productivity — list-heavy, sidebar + detail
   ```

   Map answer to the recipe slug. If the user types a name directly, accept it.

Record the resolved recipe name as `recipeName`.

## Step 3: Read recipe data

Read `${CLAUDE_PLUGIN_ROOT}/data/recipes/<recipeName>.json`.

If the file doesn't exist (Phase 8 hasn't created recipe files yet):
- Print a soft warning: "Recipe `<recipeName>` not found at expected path — using a generic skeleton. Phase 8 will add the recipe file."
- Use a default fallback: `{ "name": "<recipeName>", "sections": [{ "type": "hero" }, { "type": "kpi-grid", "columns": 2 }, { "type": "section-card", "title": "Recent Activity" }] }`

If it exists, parse it. The expected shape is:

```json
{
  "name": "saas",
  "sections": [
    { "type": "hero", "icon": "Wallet", "label": "Primary Metric" },
    { "type": "kpi-grid", "columns": 4 },
    { "type": "chart", "variant": "line" },
    { "type": "section-card", "title": "Recent Activity" }
  ]
}
```

You'll use `sections` to expand placeholders in Step 5.

## Step 4: Read adapter manifest and template

Read `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/manifest.json`.

### Special-case: obsidian-css

If `adapter == "obsidian-css"`, error and stop:

```
The obsidian-css adapter doesn't support /design-page — Obsidian plugins use a settings tab as the page-equivalent. Use /design-settings-page instead.
```

### Special-case: missing template

If `manifest.templates.page` is null (e.g., `tailwind-v4` base), error:

```
The `<adapter>` adapter has no page template. Use a framework-specific adapter (react-shadcn, astro, sveltekit) for /design-page, or hand-author your page.
```

### Read the template

Resolve the template path: `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/<manifest.templates.page>`. Read it.

## Step 5: Substitute placeholders

In the template body, replace:
- `<PAGE_NAME>` → `pascalName`
- `<RECIPE_NAME>` → `recipeName`

### Expand recipe sections (best-effort)

The bundled templates contain comments like `{/* KPI cards go here — fill in 2 or 4 per recipe */}` and `{/* List items go here */}`. Walk the recipe's `sections[]` array and replace those scaffolding comments with placeholder markup that matches the recipe.

For each section type, do the best you can with the active adapter's idiom. Examples for `react-shadcn`:

- **`kpi-grid`** with `columns: N`: replace the KPI placeholder comment with N `<KpiCard label="…" value="…" />` lines (or `<div>` placeholders if no `KpiCard` is imported by the template).
- **`chart`**: insert a `<ChartCard title="…">{/* chart goes here */}</ChartCard>` where the template scaffolds a chart slot.
- **`hero`**: leave the existing HeroCard alone, but adjust the `icon` / `label` props if the recipe specifies them.
- **`section-card`** with `title`: update the existing `SectionCard` title or append additional ones below.

Other adapters (astro, sveltekit) have simpler templates — apply the same logic with their idioms (Svelte components, Astro components). If the template structure doesn't have an obvious slot for a section, leave a comment placeholder: `{/* <type> goes here */}`.

This is best-effort. If the recipe doesn't map cleanly, fall back to leaving the template's default comments and add a closing note in the summary: "Recipe sections didn't fully expand — fill in the section slots manually based on `<recipe>`."

## Step 6: Determine output path

Path conventions per adapter:

- **`react-shadcn`**: `src/app/<kebabName>.tsx` if a `src/app/` directory exists; else `src/components/<kebabName>.tsx`.
- **`astro`**: `src/pages/<kebabName>.astro`.
- **`sveltekit`**: `src/routes/<kebabName>/+page.svelte`. Create the route directory if needed.
- **`plain-css`**: `pages/<kebabName>.html` if a `pages/` dir exists; else `<kebabName>.html` at project root.

(`obsidian-css` and base `tailwind-v4` already errored in Step 4.)

Use Glob to detect which directory convention applies (e.g., for `react-shadcn`, check `src/app/` first).

## Step 7: Confirm overwrite

If the resolved output path already exists:
- If `--force` was passed, overwrite without asking.
- Otherwise prompt:

  ```
  File exists at <path>. Options:
  1. Overwrite
  2. Write to <path-with--2-suffix> instead
  3. Cancel
  ```

  Default to option 2 (suffix) on Enter.

For sveltekit's `+page.svelte`, the suffix-2 convention is awkward — instead suggest `<kebabName>-2/+page.svelte` (a sibling route).

## Step 8: Write file

Use Write to create the file with the substituted body. Create parent directories as needed.

## Step 9: Summary

Print:

```
Generated page `<pascalName>` (recipe: <recipeName>).
  Adapter: <adapter>
  Path: <output-path>
  Sections: <comma-separated list of recipe section types>

Next steps:
- Open <output-path> and fill in the section content
- /design-pattern <name> "<desc>" — generate a custom pattern this page can use
- /design-component <name> "<desc>" — generate a primitive
- /design-review <output-path> — audit when done
```

If the recipe-section expansion was best-effort, include a note about which sections didn't fully expand.

## Notes for Claude

- Use absolute paths anchored at the project root for all file operations.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the design-engine plugin's install directory.
- Don't overwrite silently — Step 7's confirmation matters.
- Keep the page template's import block intact when substituting; only replace the placeholder identifiers and the section scaffolding comments.
- If the adapter's `extends` chain matters (e.g., sveltekit extends tailwind-v4), the page template comes from the leaf adapter; you don't need to merge templates from the chain.
