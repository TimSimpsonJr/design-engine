---
name: design-init
description: Interactive wizard — captures design decisions and writes durable artifacts (theme.css, .design-rules/config.json, conventions block, .cursorrules) to bootstrap the design system in a project. Runs once per project. Re-runnable for retrofit or full reset.
argument-hint: (no arguments — wizard mode) | --with-settings | --reset
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---

# /design-init — Project Bootstrap Wizard

You are walking the user through bootstrapping the design-engine plugin in their current project. This is an interactive wizard. Ask questions one at a time, wait for responses, and only write artifacts after all decisions are made.

The user may have invoked this with flags:
- `--with-settings` — pre-bias toward generating a runtime settings page (still confirm in Step 6)
- `--reset` — skip the existing-marker confirmation in Step 0 and proceed with full re-init

Parse `$ARGUMENTS` to detect these flags before starting.

## Step 0: Existing-marker check

Read `.design-rules/config.json` if it exists.

**If present and `--reset` was NOT passed:**
- Display the current config to the user (adapter, skin, recipe, font, mode, settingsPage, createdAt)
- Ask which path they want:
  - **A) Keep current** — abort the wizard, no changes
  - **B) Update specific fields** — they'll tell you which fields (skin, font, recipe, etc.) and you'll only re-prompt for those, then re-write the marker and any affected theme files
  - **C) Full reset** — equivalent to `--reset`, proceed through every step from Step 1
- If A: print a confirmation and exit cleanly
- If B: ask which fields, jump to the relevant steps, then to Step 7 (write artifacts) for only the changed pieces
- If C: proceed to Step 1

**If `--reset` was passed:** skip the prompt, proceed to Step 1.

**If marker is absent:** proceed to Step 1.

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
4. Remote fetch: `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/<name>.md` (use WebFetch, parse the design-md format into a skin.json)

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

## Notes for Claude

- Ask questions one at a time. Wait for the user's answer before moving to the next step. Don't batch all 8 prompts at once.
- Echo decisions back to the user as you go ("Got it — using `react-shadcn` adapter, `stripe` skin...") so they can correct mistakes early.
- Be defensive about file paths: always use absolute paths or paths anchored at the project root. The user may not be in the repo root.
- Respect existing files: never silently overwrite. The retrofit logic in Step 2 is the only place where palette overwriting is explicitly user-approved.
- If anything fails mid-write (e.g., adapter manifest missing), stop, report what was written, and tell the user how to clean up.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the design-engine plugin's install directory. Use it for all reads from `adapters/`, `data/skins/`, `data/recipes/`, `data/tokens/`.
