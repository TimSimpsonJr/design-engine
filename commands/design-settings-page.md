---
name: design-settings-page
description: Scaffold a runtime settings/tokens UI page in the current project using the active adapter's settings template. For web adapters generates a dev-gated route with copy/download CSS output. For Obsidian generates a settings tab with direct write-back. For plain-css generates a static HTML page. Live two-way write-back is a v0.x feature for web adapters.
argument-hint: (no arguments — uses active adapter)
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /design-settings-page — Generate Runtime Settings Page

You are scaffolding a runtime settings/tokens UI in the current project. This command uses the active adapter (recorded in `.design-rules/config.json`) to pick the right template, substitutes default tokens with the current skin's values, and writes the result to the appropriate route path.

## Step 1: Verify project initialized

Read `.design-rules/config.json` at the project root. If it doesn't exist, error:

```
No design system initialized in this project — run `/design-init` first.
```

Stop. Do not proceed.

If it exists, parse `adapter` and `skin` from it. You'll need both.

## Step 2: Read adapter manifest

Read `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/manifest.json`.

Inspect the `settingsPage` field:
- `writeCapable`: `true` (Obsidian only — direct write via Settings API), `"snippet"` (web/plain — copy/download CSS), or `false` (no settings page available)
- `devGate`: e.g. `"import.meta.env.DEV"` for Vite-based adapters, `null` for plain-css and obsidian-css
- `routePath`: the URL/file route the settings page lives at

If `settingsPage.writeCapable` is `false` (only `tailwind-v4` should be in this state), tell the user:

```
The active adapter `<adapter>` does not provide a settings page template.
Switch to `react-shadcn`, `astro`, `sveltekit`, `obsidian-css`, or `plain-css` to use this command.
```

Stop.

## Step 3: Pick the template path

Based on `<adapter>`, the template lives at:

| Adapter | Template path (under `${CLAUDE_PLUGIN_ROOT}`) |
|---|---|
| `react-shadcn` | `adapters/react-shadcn/templates/settings-page.tsx` |
| `astro` | `adapters/astro/templates/settings-page.astro` |
| `sveltekit` | `adapters/sveltekit/templates/settings-page.svelte` |
| `obsidian-css` | `adapters/obsidian-css/templates/settings-tab.ts` |
| `plain-css` | `adapters/plain-css/templates/settings-page.html` |

Prefer reading the path declared in `manifest.templates.settingsPage` (or `manifest.templates.settingsTab` for `obsidian-css`) when present, falling back to the table above.

Read the template file content into memory.

## Step 4: Read current skin defaults

Locate the active skin file using the standard 4-source lookup (project cache → user global → plugin bundled → awesome-design-md), exactly like `/design-skin` does. The first 3 sources should be sufficient — if the skin came from awesome-design-md, it should already be cached at `.design-rules/skins/<skin>.json`.

Parse the skin JSON. From `colors.light`, extract:
- `brand`, `primary`, `background`, `card`, `foreground`, `destructive`, `success`, `warning`, `info`

From `fonts.primary`, extract the font family name.

If a token is missing from the skin, fall back to the value already present in the template's `DEFAULT_TOKENS` constant (do not invent values).

## Step 5: Substitute defaults into the template

Replace the literal default token values in the template with the active skin's values.

For each adapter, the substitution target differs:

- **react-shadcn (`settings-page.tsx`):** Replace the literal hex values inside the `DEFAULT_TOKENS` object literal. Match each line like `brand: "#721FE5",` and replace the hex.
- **astro (`settings-page.astro`):** Replace the literal hex values inside the `DEFAULT_TOKENS` object inside `<script>`.
- **sveltekit (`settings-page.svelte`):** Replace the literal hex values inside the `$state<TokenSet>({ ... })` object.
- **obsidian-css (`settings-tab.ts`):** The Obsidian template has minimal defaults (only `brand` and `font`). Replace `brand: ''` with `brand: '<skin.colors.light.brand>'` if a brand value is present. Replace `font: 'Inter'` with the skin's primary font.
- **plain-css (`settings-page.html`):** Replace the literal hex values inside the `tokens` object inside `<script>`.

For the font substitution: the templates currently default to `'Inter'`. Replace with the skin's `fonts.primary` (string match the literal value).

Use Edit for the substitutions to keep the rest of the file intact. If a value already matches the skin (or the skin lacks the token), skip that substitution.

## Step 6: Determine output path & write

Output paths per adapter (relative to project root):

| Adapter | Output path | Notes |
|---|---|---|
| `react-shadcn` | `src/routes/__design/page.tsx` (Next.js app router) OR `src/pages/__design.tsx` (pages router) OR `src/routes/__design.tsx` (other) | Detect Next.js by checking for `next` in `package.json`. App router: `src/app/__design/page.tsx`. Pages router or React Router: `src/routes/__design/page.tsx`. Ask if unsure. |
| `astro` | `src/pages/__design/index.astro` | Astro file-based routing. |
| `sveltekit` | `src/routes/__design/+page.svelte` | Plus optional `src/routes/__design/+page.ts` with dev guard (see Step 7). |
| `obsidian-css` | `src/settings.ts` (or append into existing `main.ts` if it's small and the user prefers) | Then prompt user to register in `onload()`. |
| `plain-css` | `design-settings.html` (project root) | Static file, no routing. |

Before writing, check if the output path already exists. If it does, ask the user:

```
A settings page already exists at <path>. Overwrite? [y/N]
```

Wait for explicit yes before overwriting.

Write the (substituted) template to the output path.

## Step 7: Write supporting files (per adapter)

### react-shadcn

Document dev-gating in a comment at the top of the file. The template already has the gating note in its header. If the user is on Next.js app router, also write a sibling `layout.tsx` only if `src/app/__design/` doesn't have a parent layout that already wraps with dev gating. Otherwise, leave the dev-only enforcement to the user. Mention in the final confirmation that they should wrap the route with an `if (!import.meta.env.DEV)` redirect or remove the route in production builds.

### astro

The template's frontmatter already documents the dev gate. Suggest the user add this guard at the top of the frontmatter:

```astro
---
if (!import.meta.env.DEV) {
  return Astro.redirect('/');
}
---
```

Don't auto-insert — leave the choice to the user. Mention in the final confirmation.

### sveltekit

Optionally write a `+page.ts` alongside `+page.svelte` with a dev guard:

```ts
// src/routes/__design/+page.ts
import { error } from '@sveltejs/kit';

export const load = () => {
  if (!import.meta.env.DEV) error(404);
  return {};
};
```

Ask the user before writing this file. Default to yes (it's a small safety net).

### obsidian-css

After writing `src/settings.ts`, print these instructions:

```
Add to your plugin's main.ts:

import { DesignEngineSettingsTab } from './settings';

// Inside your Plugin class:
async onload() {
  // ... your existing setup ...
  await this.loadSettings();
  this.addSettingTab(new DesignEngineSettingsTab(this.app, this));
}

async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

async saveSettings() {
  await this.saveData(this.settings);
}
```

### plain-css

No supporting files. The HTML page references `./styles/theme.css` directly — make sure the user's `theme.css` is at that relative path (it should be, given `plain-css`'s default `theme.targetPath` of `./styles/`).

## Step 8: Update config marker

Edit `.design-rules/config.json` and set `settingsPage` to `true`. Preserve all other fields.

If `settingsPage` is already `true`, leave it as-is.

## Step 9: Confirm

Print a summary tailored to the adapter:

```
Generated design-engine settings page.

Adapter:    <adapter>
Template:   ${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/templates/<filename>
Output:     <output-path>
Mode:       <writeCapable from manifest — 'snippet', true, or 'direct'>
Dev gate:   <devGate from manifest, or 'none'>

How to access:
- Web (react-shadcn / astro / sveltekit): run `npm run dev`, visit <routePath>
- Obsidian (obsidian-css): register the settings tab in onload() (see instructions above), reload plugin, open Obsidian Settings → <Plugin Name>
- plain-css: open <output-path> in a browser

Note: For web adapters, edits in the UI produce a copyable CSS snippet. Paste
back into theme.css to apply. Live two-way write-back is a planned v0.x feature.
```

## Notes for Claude

- Always use absolute paths. Don't assume the user's CWD.
- Use Edit (line-replacement) for the default-token substitutions — preserves comments, formatting, and any per-template idioms.
- For Next.js detection in react-shadcn: read `package.json` and check for `next`. Then check if `src/app/` exists (app router) vs `src/pages/` (pages router). When in doubt, ask.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves to the design-engine plugin's install directory.
- `writeCapable` semantics:
  - `true` — direct write to plugin settings JSON (Obsidian only, via PluginSettingTab API)
  - `"snippet"` — UI shows generated CSS, copy/download buttons; user pastes manually
  - `false` — no settings page (e.g., `tailwind-v4` base adapter)
- The `tailwind-v4` adapter does not provide a settings page — frameworks that extend it (`react-shadcn`, `astro`, `sveltekit`) provide their own.
- Don't fail loudly if a single skin token is missing — fall back to the template's existing default and continue.
