---
name: design-init
description: Interactive wizard — captures design decisions and writes durable artifacts (theme.css, .design-rules/config.json, conventions block, .cursorrules) to bootstrap the design system in a project. Runs once per project. Re-runnable for retrofit, full reset, or adapter migration.
argument-hint: (no arguments — wizard mode) | --with-settings | --reset | --migrate
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---

# /design-init — Project Bootstrap Wizard

You are walking the user through bootstrapping the design-engine plugin in their current project. This is an interactive wizard. Ask questions one at a time, wait for responses, and only write artifacts after all decisions are made.

The user may have invoked this with flags:
- `--with-settings` — pre-bias toward generating a runtime settings page (still confirm in Step 6)
- `--reset` — skip the existing-marker confirmation in Step 0 and proceed with full re-init
- `--migrate` — switch the project to a different adapter, preserving skin/recipe/font and the user's customized tokens. Requires an existing marker. See "Migration Flow" below.

Parse `$ARGUMENTS` to detect these flags before starting.

`--migrate` is mutually exclusive with `--reset`. If both are passed, error: `--migrate and --reset are mutually exclusive. Pick one.` and stop.

## Step 0: Existing-marker check

Read `.design-rules/config.json` if it exists.

**If `--migrate` was passed:**
- If marker absent → error: `Nothing to migrate — run /design-init first.` Stop.
- If marker's current `adapter` is `obsidian-css` → error: `Obsidian migration is not supported in v1. Run /design-init --reset instead.` Stop.
- Otherwise → jump to the Migration Flow (M1) below. Skip Steps 1–8.

**If marker is present and neither `--reset` nor `--migrate` was passed:**
- Display the current config to the user (adapter, skin, recipe, font, mode, settingsPage, createdAt)
- Ask which path they want:
  - **A) Keep current** — abort the wizard, no changes
  - **B) Update specific fields** — they'll tell you which fields (skin, font, recipe, etc.) and you'll only re-prompt for those, then re-write the marker and any affected theme files
  - **C) Full reset** — equivalent to `--reset`, proceed through every step from Step 1
  - **D) Migrate to a different adapter** — equivalent to `--migrate`, jump to the Migration Flow below
- If A: print a confirmation and exit cleanly
- If B: ask which fields, jump to the relevant steps, then to Step 7 (write artifacts) for only the changed pieces
- If C: proceed to Step 1
- If D: jump to Migration Flow M1

**If `--reset` was passed:** skip the prompt, proceed to Step 1.

**If marker is absent and `--migrate` was NOT passed:** proceed to Step 1.

## Step 1: Adapter detection

Run signal checks against the project root. Use Bash (do NOT pipe through `grep -q`-style chains that swallow output — capture the result and reason about it). Detection signals:

- **react-shadcn** — `package.json` exists AND contains `"react"` AND contains `"tailwindcss"` or `"@tailwindcss/vite"` AND contains `"vite"` or `"next"`
- **astro** — `astro.config.mjs` or `astro.config.ts` exists
- **sveltekit** — (`svelte.config.js` or `svelte.config.ts`) AND `package.json` contains `"@sveltejs/kit"`
- **obsidian-css** — `manifest.json` exists AND (`main.ts` or `main.js` exists) AND `manifest.json` contains `"id"` AND any nearby file references `"obsidian"`
- **tailwind-v4** — `package.json` contains `"tailwindcss"` with `^4` or `>=4` AND no other framework-specific signal fired
- **plain-css** — fallback only, never auto-selected

Run the detection with Glob/Read/Grep. Tally signals.

Logic:
- **Exactly 1 signal:** show it to the user, ask "Use the `<name>` adapter? [Y/n]"
- **Multiple signals:** present them as a numbered list, ask the user to pick one (and explain that for stacks like Sveltekit-on-Tailwind, the framework adapter is preferred since it `extends` tailwind-v4)
- **Zero signals:** present the full list of 6 adapters with one-line descriptions and ask the user to pick. Do NOT auto-select `plain-css`.

The 6 adapters and their one-line descriptions:
1. `tailwind-v4` — Tailwind v4 base, framework-agnostic
2. `react-shadcn` — React + shadcn/ui (extends tailwind-v4)
3. `astro` — Astro (extends tailwind-v4)
4. `sveltekit` — SvelteKit (extends tailwind-v4)
5. `obsidian-css` — Obsidian plugin/theme CSS
6. `plain-css` — Vanilla CSS, no framework

Record the chosen adapter name. You'll need it in Step 7.

## Step 2: Retrofit detection

Search for existing design files at the project root and under common style paths:

```
Glob: **/theme.css (exclude node_modules, .design-rules)
Glob: **/tokens.json (exclude node_modules)
Grep: pattern "var\(--brand\)|--brand:|--primary:" in *.css files (head_limit: 5)
```

If any of those returned hits, you are in retrofit territory. Show the user what you found (file paths and a sample of the matched declarations) and offer 3 modes:

- **A. Extract** — read the existing CSS, parse the brand/primary/accent palette, and write a custom skin file at `.design-rules/skins/<projectname>.json` with those tokens. Use that as the active skin so the existing visual identity is preserved. **Default this option** if existing palette tokens were detected.
- **B. Replace** — overwrite. The chosen skin (Step 4) gets fully applied; existing colors are clobbered.
- **C. Bring-your-own** — don't write `theme.css` at all. Only write the marker file. Engine knowledge (rules, recipes, design-language skill) still applies, but the palette stays user-managed.

Set `mode` accordingly:
- A → `retrofit-extract`
- B → `retrofit-replace`
- C → `retrofit-byo`

If no existing design files were found, set `mode = "fresh"` and skip this prompt.

## Step 3: App type

Ask:

```
What type of app is this?
1. SaaS dashboard (analytics, metrics, KPIs)
2. E-commerce (products, orders, payments)
3. Fintech (transactions, portfolio, charts)
4. Social / content (feeds, profiles, messaging)
5. Productivity / internal tool
6. Marketing / content site
7. Other
```

Map to recipe:
- 1 → `saas`
- 2 → `ecommerce`
- 3 → `fintech`
- 4 → `social`
- 5 → `productivity`
- 6 → no recipe; tell the user "marketing sites work best with skill rules alone — no recipe will be assigned"
- 7 → ask the user for a brief description; no recipe assigned

Record `recipe` (may be null for 6/7).

## Step 4: Skin choice

**Skip this step entirely if `mode == "retrofit-extract"` or `mode == "retrofit-byo"`** — the skin is already determined (extracted custom skin, or no skin at all).

Ask:

```
Pick a skin:
1. toss — purple, default
2. stripe — clean blue, professional
3. linear — minimal, dark-first
4. vercel — black & white, geometric
5. notion — warm, friendly
6. <type a brand name> — fetch from awesome-design-md (71 brands available; e.g., airbnb, claude, figma)
7. extract current palette as custom skin (only shown if existing palette was detected)
8. bring-your-own (skip — no skin applied)
```

For options 1–5: read the bundled skin from `${CLAUDE_PLUGIN_ROOT}/data/skins/<name>.json`.

For option 6: trigger the 4-source lookup (the same lookup `/design-skin` uses):
1. Project cache: `.design-rules/skins/<name>.json`
2. User cache: `~/.design-rules/skins/<name>.json`
3. Plugin bundled: `${CLAUDE_PLUGIN_ROOT}/data/skins/<name>.json`
4. Remote fetch: `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/<name>/DESIGN.md` (use WebFetch, parse the design-md format into a skin.json)

If the remote fetch is used, you MUST cache the result to `.design-rules/skins/<name>.json` in Step 7.

For option 7: only valid if Step 2 detected an existing palette. Set the active skin to a custom skin built from extracted tokens.

For option 8: set `skin = null`. No theme.css palette block will be written.

Record `skin`.

## Step 5: Font

Ask:

```
What font?
1. Inter (default, recommended)
2. Pretendard + Inter (Korean + English)
3. Geist (Vercel-style)
4. DM Sans (friendly, rounded)
5. Custom — type a font name
```

Map the choice to a font-import URL for `fonts.css`:
- Inter: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`
- Pretendard + Inter: import Pretendard from `https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css` plus the Inter import above
- Geist: `https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/style.css`
- DM Sans: `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap`
- Custom: ask the user for the font name and (if Google Fonts) construct the URL `https://fonts.googleapis.com/css2?family=<URL-encoded-name>:wght@400;500;600;700&display=swap`. If the user has a non-Google-Fonts source, ask for the import URL directly.

Record `font` (the canonical name, not the URL).

## Step 6: Settings page

Default behavior:
- If `--with-settings` was passed: lean Y
- If adapter is `obsidian-css`: lean N (Obsidian plugins use a settings tab convention; a separate runtime page is redundant)
- If adapter is `plain-css`: lean N (read-only, less useful)
- For `react-shadcn`, `astro`, `sveltekit`, `tailwind-v4`: lean Y

Ask:

```
Generate a runtime settings page for live token editing?
This creates a dev-only route (e.g. /__design) where you can tweak colors and fonts in your browser. [Y/n]
```

Use the lean as the default if the user just hits Enter. Record `settingsPage: <bool>`.

Note: this command does NOT generate the actual settings page file. It only records the decision in the marker. The actual page is generated by `/design-settings-page` in a later phase.

## Step 7: Write artifacts

You now have all decisions. Write the artifacts.

### 7a. Resolve the adapter chain

Read `${CLAUDE_PLUGIN_ROOT}/adapters/<chosen-adapter>/manifest.json`. If it has a non-null `extends` field (e.g., `sveltekit` extends `tailwind-v4`), recursively resolve until you have the full chain. You will need theme files from every adapter in the chain, with the most specific (leaf) adapter winning on conflicts.

### 7b. Copy theme files

For each adapter in the chain (base → leaf), copy every file from its `theme/` directory to the path declared in the LEAF adapter's `theme.targetPath` (e.g., `src/styles/` for `tailwind-v4`).

Files typically include:
- `theme.css` — the palette and token definitions
- `base.css` — element resets, base styles
- `fonts.css` — font @import statements
- `index.css` — entry that imports the others

When the same filename appears in multiple adapters in the chain, the leaf adapter's version wins.

### 7c. Apply chosen skin

If `skin` is non-null and `mode != "retrofit-byo"`:

Read the chosen skin's JSON. Inside `theme.css` in the project, replace the `:root` block (light mode) and `.dark` block (dark mode) with the skin's color tokens. Preserve any non-color tokens (radii, shadows, motion) that the skin doesn't override.

If `mode == "retrofit-extract"`, the skin is the freshly built custom skin from Step 2.

If `mode == "retrofit-byo"`, do NOT touch `theme.css` at all.

### 7d. Apply chosen font

Modify `fonts.css` so the @import line(s) match the user's font choice. Replace the default Inter import with the chosen font's import URL(s).

Update CSS custom properties (e.g., `--font-sans`) in `theme.css` to reference the chosen font family.

### 7e. Write `.design-rules/config.json`

Create the directory if needed. Write:

```json
{
  "version": "0.1.0",
  "adapter": "<chosen-adapter>",
  "skin": "<chosen-skin>",
  "recipe": "<chosen-recipe>",
  "font": "<chosen-font>",
  "mode": "fresh|retrofit-extract|retrofit-replace|retrofit-byo",
  "settingsPage": true|false,
  "createdAt": "<current ISO 8601 timestamp>",
  "lastInitVersion": "0.1.0"
}
```

Use the actual current timestamp (run `date -Iseconds` via Bash if needed).

The marker may also include two **optional** fields that are present only after the project has been migrated to a different adapter (see Migration Flow below):

```json
{
  "migratedAt": "<ISO 8601 timestamp of most recent migration>",
  "migratedFrom": "<previous adapter name>"
}
```

Don't write these fields during a normal `/design-init` run. They are written only by the Migration Flow (M6).

### 7f. Cache non-bundled skin

If the user picked option 6 (awesome-design-md fetch) or option 7 (extracted custom), write the resolved skin JSON to `.design-rules/skins/<name>.json`. Bundled skins (toss, stripe, linear, vercel, notion) do NOT need to be cached — they live in the plugin.

### 7g. Append conventions block to `CLAUDE.md`

If `CLAUDE.md` exists at the project root:
- Check whether a `## Design Engine Conventions` section already exists. If yes, replace that section in place (don't duplicate).
- If not, append the following block (with a leading blank line if the file doesn't end with one).

If `CLAUDE.md` doesn't exist, create it with this block as the entire content.

Block content:

```
## Design Engine Conventions

This project uses the design-engine plugin. Active config:
- Adapter: <name>
- Skin: <name>
- Recipe: <name>
- Font: <name>

See `.design-rules/config.json` for canonical state.

When working on UI:
- The `design-engine` skill auto-loads with project rules
- Run `/design-review` to check compliance
- Run `/design-skin <name>` to swap palettes
- Run `/design-tokens` to edit individual tokens
```

Substitute the actual chosen names.

### 7h. Write `.cursorrules` (if applicable)

Read the chosen adapter's manifest. If `cursorRules: true`, write `.cursorrules` at the project root. Content (Cursor-formatted, similar conventions):

```
# Design Engine Conventions

This project uses the design-engine plugin.

Active configuration:
- Adapter: <name>
- Skin: <name>
- Recipe: <name>
- Font: <name>

When generating or modifying UI code:
- Use tokens from `src/styles/theme.css` (or adapter's targetPath). Never hardcode colors.
- Follow the active skin's palette via CSS custom properties (--brand, --primary, etc.).
- Reference `.design-rules/config.json` for canonical project state.
- Patterns and recipes live in the design-engine plugin's bundled data.
```

If the file exists, append a `# Design Engine Conventions` section (or replace if already present). If it doesn't exist, create it.

### 7i. Skip `theme.css` in BYO mode

In `mode == "retrofit-byo"`: do NOT write `theme.css`, `base.css`, or `fonts.css`. Only write the marker (`.design-rules/config.json`), `CLAUDE.md` block, and `.cursorrules`. The user keeps managing their own palette.

## Step 8: Summary

Print a summary to the user:

```
Bootstrapped design-engine in this project.
  Adapter: <name>
  Skin: <name>
  Recipe: <name>
  Font: <name>
  Mode: <fresh|retrofit-extract|retrofit-replace|retrofit-byo>
  Settings page: <yes|no>

Files written:
- .design-rules/config.json
- .design-rules/skins/<name>.json (only if cached)
- src/styles/theme.css (or adapter-specific path)
- src/styles/{base,fonts,index}.css
- CLAUDE.md (conventions block appended/created)
- .cursorrules (only if adapter declares cursorRules: true)

Next steps:
- /design-page <name> "<description>" — scaffold first page
- /design-review src/ — audit existing UI for compliance
- /design-skin <name> — change palette later
- /design-tokens list — see all tokens
```

Tailor the file list to what was actually written (e.g., omit `theme.css` if BYO mode, omit `.cursorrules` if adapter doesn't declare it).

## Migration Flow

This flow runs when `/design-init --migrate` is invoked (or option D from Step 0). It switches the project to a different adapter while preserving the active skin, recipe, font, and the user's customized tokens.

**Scope:** Web adapters only — `tailwind-v4`, `react-shadcn`, `astro`, `sveltekit`, `plain-css`. Migrating to or from `obsidian-css` is not supported in v1 (Step 0 already errors). The `tailwind-v4` adapter is a valid migration target despite having no settings-page support.

**Out of scope for `--migrate`:**
- Generating new settings-page artifacts. After migration, user runs `/design-settings-page` separately to regenerate the UI for the new adapter.
- Auto-reverting the old adapter's build-config patches (`vite.config.ts`, `astro.config.mjs`). Migration prints exact lines to remove and the user does it manually.
- Rolling back on partial failure. Migration is halt-and-report — if any step fails, stop and tell the user what was done and what wasn't.

### M1: Echo current config + select target adapter

Read `.design-rules/config.json` (already verified to exist in Step 0).

**Source-adapter guard.** If the marker's current `adapter` is `obsidian-css`, error: `Obsidian migration is not supported in v1. Run /design-init --reset instead.` Stop. (This is also checked in Step 0 for the `--migrate` flag path, but option D from the existing-marker prompt enters M1 directly — repeat the guard here so it cannot be bypassed.)

Echo the current config to the user.

Re-run the **adapter detection signals** from Step 1 to suggest a likely target. Show the full list of 5 supported adapters; mark the detected match (if any) as `(detected)`. Detection suggests, never auto-selects.

```
Migrating from `<oldAdapter>` to:
1. tailwind-v4
2. react-shadcn
3. astro                     (detected)
4. sveltekit
5. plain-css

Pick one [1-5]:
```

Reject the same-as-current adapter with `Already on <adapter> — nothing to migrate.` Stop.

Reject `obsidian-css` (not in the list, but be defensive against typos): `Obsidian migration is not supported in v1.`

Record `<newAdapter>`.

### M2: Build the preflight plan

Compute and display the migration plan in memory **before any write or delete**. The plan shows the user exactly what will happen so they can abort if anything looks wrong.

Build the plan from these inputs:

1. **Theme target paths.** Resolve the new adapter chain via `extends` (Step 7a logic). Determine `oldTargetPath` from the old adapter's manifest, `newTargetPath` from the new adapter's manifest. Compare:
   - If `oldTargetPath == newTargetPath`: theme files will be **overwritten in place**. No old theme files land in the cleanup list.
   - If they differ: theme files will be **written at the new path**. Old theme files at the old path will be flagged for **manual cleanup** (never auto-deleted — see M5 rationale).

2. **Settings-page artifacts to clean up.** Probe disk for files in `artifactSetFor(oldAdapter)` (table below). List the files that actually exist. Compute the set difference: `toDelete = existingOldArtifacts - artifactSetFor(newAdapter)`. Files that appear in both sets (e.g., `src/design-engine/theme-io.ts` shared between react-shadcn and astro) are NOT cleaned up; they'll be overwritten in M5 only if the new adapter is a settings-page rewrite, which `--migrate` does not do — so in practice they're left as-is and the user re-runs `/design-settings-page` later.

3. **Old build-config patches.** If `oldAdapter` is `react-shadcn`: scan `vite.config.ts` for `from './src/design-engine/vite-plugin-design-engine'` and `designEngine()` in plugins. If `oldAdapter` is `astro`: scan `astro.config.mjs` (or `.ts`/`.js`) for `from './src/design-engine/astro-integration-design-engine'` and `designEngine()` in integrations. If `oldAdapter` is `sveltekit`: no build-config patch to revert (SvelteKit auto-discovers routes; no config edit was made). Plan is to **print removal instructions in M7**, never auto-edit.

4. **Token preservation.** If `mode != "retrofit-byo"`: try `parseTokens(<oldTargetPath>/theme.css)` (in-memory only — don't write yet). If parse fails or returns an empty managed-token set, abort here with: `theme.css unparseable — fix manually or run /design-init --reset`. Do not continue.

5. **`settingsPage` field reset.** If old config has `settingsPage: true`, the field will be reset to `false` in M6. User re-runs `/design-settings-page` to regenerate UI for the new adapter.

6. **`.cursorrules` action.** If new adapter has `cursorRules: false` and the project has `.cursorrules` with a `# Design Engine Conventions` section, the section will be removed (file kept). If new adapter has `cursorRules: true`, the section will be refreshed.

7. **Files that will need manual cleanup (M7 will list these):**
   - Old theme files at old `targetPath` if `oldTargetPath != newTargetPath`.
   - Any deterministic plugin file (see ownership rules below) that fails the byte-compare in M5 — surfaces as "user-modified, kept for safety".
   - Old build-config patches (always manual).

Show the user the plan as a checklist:

```
Migration plan: <oldAdapter> → <newAdapter>

Theme files:
  <oldTargetPath>theme.css → <newTargetPath>theme.css  [overwrite in place | write at new path]

Tokens to preserve:
  <count> :root tokens, <count> .dark tokens (font: <name>)

Auto-cleanup (delete after byte-compare):
  - <list of deterministic plugin files in toDelete>

Auto-cleanup (delete unconditionally):
  - <list of non-deterministic plugin files in toDelete>

Manual cleanup required (review before deleting):
  - <oldTargetPath>theme.css         (may contain user-added unmanaged CSS)
  - <oldTargetPath>{base,fonts,index}.css
  - <list of build-config lines to remove>

Marker / conventions:
  - .design-rules/config.json: adapter <oldAdapter> → <newAdapter>; settingsPage reset to false
  - CLAUDE.md: conventions block refreshed
  - .cursorrules: <refreshed | section removed | unchanged>

Proceed? [y/N]
```

Wait for explicit `y`. Anything else aborts cleanly.

### M3: Capture user-customized tokens

Re-run `parseTokens(<oldTargetPath>/theme.css)` (the M2 parse was in-memory; reuse the result). Hold both `:root` and `.dark` token maps in memory.

Skip M3 entirely if `mode == "retrofit-byo"` — user manages their own theme.

### M4: Write new adapter's theme files

Reuse existing logic:
- **Step 7a** — resolve adapter chain via `extends`.
- **Step 7b** — copy theme files from chain into `newTargetPath`. Leaf adapter wins on filename collisions.
- **Step 7c** — apply active skin (preserved from old config) to `:root` and `.dark` blocks.
- **Step 7d** — apply active font (preserved from old config) to `fonts.css` + `--font-primary`.

Then **overlay preserved tokens from M3** via `writeTokens()` against the just-written `<newTargetPath>/theme.css`. User customizations override skin defaults.

Skip M4 entirely if `mode == "retrofit-byo"`.

### M5: Cleanup old artifacts (set difference)

Compute `toDelete = artifactSetFor(oldAdapter) ∩ existing-on-disk - artifactSetFor(newAdapter)`. For each candidate, apply the ownership rules:

| Category | Behavior |
|---|---|
| Deterministic file (pure copy) — passes byte-compare against canonical content | Auto-delete |
| Deterministic file — fails byte-compare (user-modified) | Skip; add to manual-cleanup list with note "user-modified, kept for safety" |
| Non-deterministic file (compiled or substituted output) | Auto-delete unconditionally |
| Old theme files at old `targetPath` (when `targetPath` differs) | **Never auto-delete** — always manual-cleanup list |
| Old build-config patches (`vite.config.ts` / `astro.config.mjs`) | Never auto-edit; print removal instructions in M7 |

**Why old theme files are never auto-deleted:** `writeTokens()` only preserves user-added unmanaged CSS *in place*; it does not transfer that content to a freshly generated file at a new `targetPath`. Auto-deleting old `theme.css` would silently drop any user-added unmanaged variables or comments. The conservative move is to let the user review and delete manually.

If individual deletes fail (e.g., file permission), continue with remaining deletes, then halt-and-report at the end of M5 with the exact list of orphans. Do not roll back already-completed deletes.

### M6: Update marker, conventions, .cursorrules

**`.design-rules/config.json`:**
- `adapter`: new
- `skin`, `recipe`, `font`, `mode`: preserved unchanged
- `settingsPage`: `false` (always reset; user re-runs `/design-settings-page` to regenerate UI for new adapter if desired)
- `migratedAt`: current ISO 8601 timestamp (run `date -Iseconds` via Bash)
- `migratedFrom`: old adapter name
- `lastInitVersion`: bumped to current plugin version
- `createdAt`: preserved (when project was first init'd, not when migrated)
- `version`: preserved

**`CLAUDE.md` `## Design Engine Conventions` block:** replace using existing Step 7g logic (with new adapter's values).

**`.cursorrules`:**
- If new adapter has `cursorRules: true`: refresh `# Design Engine Conventions` section using existing Step 7h logic.
- If new adapter has `cursorRules: false` and the section exists: remove the section. If the file becomes empty after removal, leave the empty file in place — do not delete user-owned files.

### M7: Summary

Print:

```
Migrated design-engine: <oldAdapter> → <newAdapter>

  Skin:    <preserved>
  Recipe:  <preserved>
  Font:    <preserved>

Files written:
- <newTargetPath>theme.css
- <newTargetPath>{base,fonts,index}.css
- .design-rules/config.json (updated; settingsPage reset to false)
- CLAUDE.md (conventions block updated)
- .cursorrules (<refreshed | section removed | unchanged>)

Files cleaned up:
- <list of auto-deleted files>

Manual cleanup required:
- <list of files flagged for manual cleanup, with one-line rationale per file>
- Build config (<vite.config.ts | astro.config.mjs>): remove these lines:
    import designEngine from './src/design-engine/<old-plugin-or-integration>';
    designEngine()  // inside the plugins/integrations array

Next steps:
- Run `npm install` if you changed frameworks (e.g., installed @sveltejs/kit).
- Run `/design-settings-page` to regenerate the settings UI for the new adapter.
```

Tailor the lists to what actually happened. If no auto-cleanup occurred, omit that section. If no manual cleanup is needed, omit that section. If old adapter had no build-config patches, omit those lines.

### Artifact lookup table — `artifactSetFor(adapter)`

This table enumerates the **settings-page artifacts** that `/design-settings-page` writes per adapter. Migration uses this table to determine what to look for during cleanup. Theme files (`theme.css`, `base.css`, `fonts.css`, `index.css`) are derived separately from each adapter's `theme.targetPath`.

| Adapter | writeCapable | Settings-page artifacts (paths relative to project root) | Determinism |
|---|---|---|---|
| `react-shadcn` | direct | `src/design-engine/theme-io.ts` | deterministic |
| | | `src/design-engine/vite-plugin-design-engine.ts` | deterministic |
| | | `src/design-engine/__design-page.html` | deterministic |
| | | `src/design-engine/__design-page.js` | non-deterministic (esbuild) |
| `astro` | direct | `src/design-engine/theme-io.ts` | deterministic |
| | | `src/design-engine/astro-integration-design-engine.ts` | deterministic |
| | | `src/design-engine/__design-page.html` | deterministic |
| | | `src/design-engine/__design-page.js` | non-deterministic (esbuild) |
| `sveltekit` | direct | `src/lib/server/design-engine/theme-io.ts` | deterministic |
| | | `src/routes/__design/api/tokens/+server.ts` | deterministic |
| | | `src/routes/__design/+page.svelte` | deterministic |
| | | `src/routes/__design/+page.ts` (optional dev guard) | non-deterministic (no canonical template — generated from inline snippet in `/design-settings-page.md`) |
| `plain-css` | snippet | `design-settings.html` (project root) | non-deterministic (substituted) |
| `tailwind-v4` | none | (none) | — |

**Maintenance note:** This table must be updated whenever an adapter's `writeCapable` changes or settings-page generation paths change in `/design-settings-page.md`. The canonical source is `/design-settings-page.md` Steps 6 and 7.x. A future improvement would replace this hardcoded table with a declarative `settingsPage.artifacts: []` field in each adapter's `manifest.json`.

For each candidate path, **byte-compare against canonical content** before auto-delete (deterministic files only). For pure-copy files, the canonical content is the corresponding template at `${CLAUDE_PLUGIN_ROOT}/adapters/<oldAdapter>/templates/<filename>`. For non-deterministic files (compiled `__design-page.js`, substituted templates), skip the byte-compare and auto-delete unconditionally.

## Notes for Claude

- Ask questions one at a time. Wait for the user's answer before moving to the next step. Don't batch all 8 prompts at once.
- Echo decisions back to the user as you go ("Got it — using `react-shadcn` adapter, `stripe` skin...") so they can correct mistakes early.
- Be defensive about file paths: always use absolute paths or paths anchored at the project root. The user may not be in the repo root.
- Respect existing files: never silently overwrite. The retrofit logic in Step 2 is the only place where palette overwriting is explicitly user-approved.
- If anything fails mid-write (e.g., adapter manifest missing), stop, report what was written, and tell the user how to clean up.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the design-engine plugin's install directory. Use it for all reads from `adapters/`, `data/skins/`, `data/recipes/`, `data/tokens/`.

### Migration-specific notes

- `--migrate` is halt-and-report on failure, just like the bootstrap path. Never auto-rollback.
- `--migrate` does NOT generate or modify settings-page artifacts beyond cleaning up old ones. The user runs `/design-settings-page` separately after migration to regenerate UI for the new adapter. Do NOT call `/design-settings-page` automatically.
- `--migrate` does NOT auto-edit `vite.config.ts`, `astro.config.mjs`, or `svelte.config.js` to remove old plugin/integration entries. Always print the exact lines to remove and let the user delete them manually. Auto-add for the new adapter is `/design-settings-page`'s responsibility, not migration's.
- The byte-compare in M5 reads the canonical template content from `${CLAUDE_PLUGIN_ROOT}/adapters/<oldAdapter>/templates/<filename>` and compares byte-for-byte against the file currently on disk. Use Read for both. Mismatches mean the user edited the file — surface in the manual-cleanup list with the exact note `kept — user-modified`.
- Token preservation in M3/M4 reuses the helper at `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/theme-io.ts` (or astro/sveltekit's copy — they're byte-identical). Don't reimplement the parser/writer.
- Migration preserves `mode` from the old config. If the old config had `mode: "retrofit-byo"`, skip M3 and M4 entirely — the user manages their own theme; don't write or parse theme files. Only update marker, conventions, and clean up old plugin-generated settings-page artifacts.
