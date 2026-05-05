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
- `writeCapable`: `"direct"` (live API write-back), `"snippet"` (copy/paste output), or `"none"` (no settings page).
- `devGate`: e.g. `"import.meta.env.DEV"` for Vite-based adapters, `null` for others.
- `routePath`: where the settings page is reachable.

Note: `obsidian-css` may still report `true` and `tailwind-v4` may still report `false`. Treat those as `"direct"` and `"none"` respectively. (Full enum migration is a follow-up issue.)

If `writeCapable` is `"none"` (or `false`), tell the user the active adapter doesn't provide a settings page template and stop.

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

## Step 7.5: For react-shadcn direct mode, set up live write-back files

Applies only when `<adapter>` is `react-shadcn` AND `writeCapable === "direct"`.

Skip the existing Step 6 output path and Step 4-5 token-substitution logic for this case. Direct mode uses a different scaffold — no per-template token substitution, no route file. (Snippet-mode adapters like `plain-css` continue using the original logic. The sveltekit direct-mode path is handled separately in Step 7.6.)

For react-shadcn direct mode, write four files into the user's project (paths relative to project root):

1. `src/design-engine/theme-io.ts` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/theme-io.ts`.
2. `src/design-engine/vite-plugin-design-engine.ts` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/vite-plugin-design-engine.ts`. Its `import` of `'./theme-io'` is correct (sibling, extensionless).
3. `src/design-engine/__design-page.html` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/__design-page.html`.
4. `src/design-engine/__design-page.js` — compile from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/__design-page.ts`. Use:
   ```
   npx --yes esbuild --bundle --format=esm --target=es2022 --platform=browser --outfile=src/design-engine/__design-page.js "${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/__design-page.ts"
   ```
   esbuild is normally installed transitively with Vite. If `npx --yes esbuild` fails (esbuild not found), tell the user: "esbuild not available — run `npm install` to install dependencies, then re-run `/design-settings-page`." Don't auto-install — let the user handle it.

The Vite plugin loads `__design-page.html` and `__design-page.js` at runtime via `fs.readFile`, resolved relative to the plugin file's own directory (`import.meta.url`). They MUST be co-located.

Then patch `vite.config.ts` to register the plugin. Read `vite.config.ts` first. If it matches the simple scaffold shape (one `defineConfig` call with a `plugins` array), edit to add:

\`\`\`ts
import designEngine from './src/design-engine/vite-plugin-design-engine';

export default defineConfig({
  plugins: [react(), designEngine()],
  // ...other existing config
});
\`\`\`

If `vite.config.ts` is custom or conditional, do NOT auto-edit. Print this snippet and ask the user to add it manually:

\`\`\`
[design-engine] Could not safely auto-patch vite.config.ts.
Add this to your config:
  import designEngine from './src/design-engine/vite-plugin-design-engine';
  // Inside defineConfig({ plugins: [...] }):
  designEngine()
\`\`\`

## Step 7.6: For astro direct mode, set up live write-back files

Applies only when `<adapter>` is `astro` AND `writeCapable === "direct"`.

Skip the existing Step 6 output path and Step 4-5 token-substitution logic for this case. Direct mode uses a different scaffold — no per-template token substitution, no route file. (Snippet-mode adapters like `plain-css` continue using the original logic.)

For astro direct mode, write four files into the user's project (paths relative to project root):

1. `src/design-engine/theme-io.ts` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/astro/templates/theme-io.ts`.
2. `src/design-engine/astro-integration-design-engine.ts` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/astro/templates/astro-integration-design-engine.ts`. Its `import` of `'./theme-io'` is correct (sibling, extensionless).
3. `src/design-engine/__design-page.html` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/astro/templates/__design-page.html`.
4. `src/design-engine/__design-page.js` — compile from `${CLAUDE_PLUGIN_ROOT}/adapters/astro/templates/__design-page.ts`. Use:
   ```
   npx --yes esbuild --bundle --format=esm --target=es2022 --platform=browser --outfile=src/design-engine/__design-page.js "${CLAUDE_PLUGIN_ROOT}/adapters/astro/templates/__design-page.ts"
   ```
   esbuild is normally installed transitively with Vite (which Astro uses internally). If `npx --yes esbuild` fails (esbuild not found), tell the user: "esbuild not available — run `npm install` to install dependencies, then re-run `/design-settings-page`." Don't auto-install — let the user handle it.

The integration loads `__design-page.html` and `__design-page.js` at runtime via `fs.readFile`, resolved relative to the integration file's own directory (`import.meta.url`). They MUST be co-located.

Then patch `astro.config.mjs` (or `.ts`/`.js` if that's what the project uses) to register the integration. Read the config file first. If it matches the simple `defineConfig({ integrations: [...] })` shape, edit it to add:

\`\`\`js
import designEngine from './src/design-engine/astro-integration-design-engine';

export default defineConfig({
  integrations: [designEngine()],
  // ...other existing config
});
\`\`\`

If `integrations` already has entries, append `designEngine()` to the array. If `integrations` key doesn't exist in the config, add it.

If `astro.config.mjs` is custom or conditional, do NOT auto-edit. Print this snippet and ask the user to add it manually:

\`\`\`
[design-engine] Could not safely auto-patch astro.config.mjs.
Add this to your config:
  import designEngine from './src/design-engine/astro-integration-design-engine';
  // Inside defineConfig({ integrations: [...] }):
  designEngine()
\`\`\`
## Step 7.7: For sveltekit direct mode, set up live write-back files

Applies only when `<adapter>` is `sveltekit` AND `writeCapable === "direct"`.

Skip the Step 4-5 token-substitution logic for this case. Direct mode uses a different scaffold — no per-template hex defaults to rewrite. The page reads tokens from the server at runtime via `GET /__design/api/tokens`.

For sveltekit direct mode, write three files into the user's project (paths relative to project root):

1. `src/lib/server/design-engine/theme-io.ts` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/sveltekit/templates/theme-io.ts`. Server-only helper. Placing it under `$lib/server/` ensures SvelteKit excludes it from the client bundle.
2. `src/routes/__design/api/tokens/+server.ts` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/sveltekit/templates/api-tokens-server.ts`. Its `import` of `$lib/server/design-engine/theme-io` matches the path above.
3. `src/routes/__design/+page.svelte` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/sveltekit/templates/settings-page.svelte`. This is the direct-mode page; it replaces the snippet-mode template that Step 6 would otherwise write.

SvelteKit auto-discovers `+server.ts` and `+page.svelte` files — no config patching needed.

The `+server.ts` handler gates on `dev` from `$app/environment`. In production it returns 404, which fail-closes the API and surfaces a load error in the page. The optional `+page.ts` dev guard described in Step 7 (sveltekit) is no longer needed for fail-closed behavior, though you may still write it as belt-and-braces.

The handler resolves `theme.css` and `fonts.css` relative to `process.cwd()` at the paths `src/lib/styles/theme.css` and `src/lib/styles/fonts.css` (matching sveltekit's `theme.targetPath`). If the project keeps theme files at a different location, edit the `DEFAULT_THEME` and `DEFAULT_FONTS` constants in the copied `+server.ts`.

If `src/lib/styles/theme.css` does not exist, warn the user — the API will return a parse error until `theme.css` is in place with a `:root` block containing managed tokens. Suggest running `/design-init` first.

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
- react-shadcn (direct mode): run `npm run dev`, visit http://localhost:5173/__design/ — edits write back live to src/styles/theme.css
- sveltekit (direct mode): run `npm run dev`, visit http://localhost:5173/__design — edits write back live to src/lib/styles/theme.css via dev-only +server.ts
- Other web (astro): run `npm run dev`, visit <routePath> — edits produce a copyable CSS snippet
- Obsidian (obsidian-css): register the settings tab in onload() (see instructions above), reload plugin, open Obsidian Settings → <Plugin Name>
- plain-css: open <output-path> in a browser

Note: For snippet-mode web adapters (astro), edits in the UI produce a copyable
CSS snippet — paste back into theme.css to apply. react-shadcn (Vite plugin)
and sveltekit (+server.ts endpoint) are direct-mode — edits persist
automatically while the dev server is running.
```

## Notes for Claude

- Always use absolute paths. Don't assume the user's CWD.
- Use Edit (line-replacement) for the default-token substitutions — preserves comments, formatting, and any per-template idioms.
- For Next.js detection in react-shadcn: read `package.json` and check for `next`. Then check if `src/app/` exists (app router) vs `src/pages/` (pages router). When in doubt, ask.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves to the design-engine plugin's install directory.
- `writeCapable` semantics (target enum: `"direct" | "snippet" | "none"`):
  - `"direct"` — UI writes back to disk live (react-shadcn via dev-only Vite plugin; sveltekit via dev-only `+server.ts` endpoint; obsidian-css via PluginSettingTab API — manifest may still report `true`, treat as `"direct"`)
  - `"snippet"` — UI shows generated CSS, copy/download buttons; user pastes manually (astro, plain-css)
  - `"none"` — no settings page (e.g., `tailwind-v4` base adapter — manifest may still report `false`, treat as `"none"`)
- The `tailwind-v4` adapter does not provide a settings page — frameworks that extend it (`react-shadcn`, `astro`, `sveltekit`) provide their own.
- Don't fail loudly if a single skin token is missing — fall back to the template's existing default and continue.
