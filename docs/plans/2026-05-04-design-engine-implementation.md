# Design Engine Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a public Claude Code plugin that ports bitjaru/styleseed into a stack-agnostic, audit-capable, skin-driven design system toolkit, deployable as v0.1.0.

**Architecture:** Three skills (design-engine, design-language, composition-recipes) + 14 commands + 3 audit agents + 6 stack adapters + bundled data files. Per-project config in `.design-rules/config.json`. Cross-project skins via `~/.design-rules/skins/`. See `2026-05-04-design-engine-plugin-design.md` for full specification.

**Tech Stack:** Markdown (skills/commands/agents), JSON (manifests/skins/recipes/tokens), CSS (theme files), TypeScript/JSX/Svelte/Astro (adapter templates), Bash (validation scripts).

**Reference design doc:** `docs/plans/2026-05-04-design-engine-plugin-design.md`

**Source repo for porting:** `https://github.com/bitjaru/styleseed` (clone to `/tmp/styleseed` or fetch raw files as needed)

---

## Phased build strategy

The plan is divided into 10 phases. Each phase boundary produces a usable, valid plugin:

| Phase | Boundary deliverable | Useful for |
|---|---|---|
| 1 | Plugin loads with skeleton | Smoke test the install path |
| 2 | Three skills auto-fire with full reference content | Claude has design rules in any project's UI work |
| 3 | `/design-init` + tailwind-v4 base adapter works | Bootstrap a Tailwind project |
| 4 | All 6 adapters scaffold correctly | Cover all target stacks |
| 5 | Generator commands work (`/design-page` etc.) | Claude can scaffold pages from recipes |
| 6 | Audit agents return structured reports | Compliance + a11y + UX review |
| 7 | Settings page scaffolds per adapter | Runtime token editing UI |
| 8 | Bundled data complete (5 skins, 5 recipes, 6 token files) | Full feature coverage |
| 9 | Polish + pre-release checklist | Ready for public release |
| 10 | Pushed to GitHub + feature issues filed | Publicly available |

**TDD note:** This plugin is mostly markdown + JSON + adapter templates, not application code. "Tests" in this plan are: (a) JSON schema validation for data files, (b) `plugin-dev:plugin-validator` agent for plugin structure, (c) manual smoke tests on real projects per Phase. Where strict TDD applies (e.g., adapter detection logic), it's called out.

**Reference shorthand:** When a task says "port from styleseed", clone `https://github.com/bitjaru/styleseed` to `/tmp/styleseed` (or fetch raw via `curl https://raw.githubusercontent.com/bitjaru/styleseed/main/<path>`) and read the source content directly rather than re-deriving from memory.

---

## Phase 1 — Plugin skeleton

**Boundary deliverable:** Plugin loads via Claude Code's plugin mechanism and validates clean. No functional commands yet.

### Task 1.1: Create `.claude-plugin/plugin.json`

**Files:**
- Create: `.claude-plugin/plugin.json`

**Step 1: Create directory and file**

```bash
mkdir -p .claude-plugin
```

**Step 2: Write plugin.json**

```json
{
  "name": "design-engine",
  "description": "Stack-agnostic design system toolkit. Ports bitjaru/styleseed (MIT) into a Claude Code plugin with skills, commands, audit agents, and adapters for React+shadcn, Astro, SvelteKit, Obsidian, and plain CSS.",
  "version": "0.1.0",
  "author": {
    "name": "Tim Simpson"
  },
  "license": "MIT",
  "keywords": ["design-system", "ui", "tokens", "audit", "tailwind", "shadcn", "obsidian", "astro", "sveltekit"],
  "credits": {
    "inspiredBy": "https://github.com/bitjaru/styleseed",
    "designMdFormat": "https://stitch.withgoogle.com/docs/design-md/overview/",
    "skinCatalog": "https://github.com/VoltAgent/awesome-design-md"
  }
}
```

**Step 3: Validate**

```bash
cat .claude-plugin/plugin.json | python -c "import json,sys; json.loads(sys.stdin.read()); print('valid')"
```
Expected: `valid`

**Step 4: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "feat: plugin manifest with attribution credits"
```

### Task 1.2: Add LICENSE, NOTICE, README skeleton

**Files:**
- Create: `LICENSE`, `NOTICE`, `README.md`, `.gitignore`

**Step 1: LICENSE (MIT, current year 2026, Tim Simpson)**

```
MIT License

Copyright (c) 2026 Tim Simpson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 2: NOTICE**

```
design-engine plugin
Copyright (c) 2026 Tim Simpson

This product adapts content from:

- bitjaru/styleseed (MIT)
  Copyright (c) bitjaru
  https://github.com/bitjaru/styleseed
  Adapted: design rules from CLAUDE.md and DESIGN-LANGUAGE.md, component
  library (.tsx files) in adapters/react-shadcn/, reference skins in
  data/skins/, the workflow patterns in commands/.

- Google Stitch — DESIGN.md format
  https://stitch.withgoogle.com/docs/design-md/overview/

This product fetches data from:

- VoltAgent/awesome-design-md
  https://github.com/VoltAgent/awesome-design-md
  Used by /design-skin command for fetch-on-demand brand palettes.
```

**Step 3: README.md (skeleton — full content in Phase 9)**

```markdown
# design-engine

Stack-agnostic design system toolkit for Claude Code. Adapted from [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT).

**Status:** v0.1.0 — under active development

See `docs/plans/2026-05-04-design-engine-plugin-design.md` for the full design spec.

## Attribution

This plugin adapts content from:

- **[bitjaru/styleseed](https://github.com/bitjaru/styleseed)** (MIT) — original design system this plugin is based on
- **[Google Stitch](https://stitch.withgoogle.com/docs/design-md/overview/)** — DESIGN.md format inventor
- **[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** — community brand palette catalog used by `/design-skin`

Full attribution in `LICENSE` and `NOTICE`.
```

**Step 4: .gitignore**

```
node_modules/
.DS_Store
*.log
/tmp/
```

**Step 5: Commit**

```bash
git add LICENSE NOTICE README.md .gitignore
git commit -m "feat: add LICENSE, NOTICE, README skeleton, gitignore"
```

### Task 1.3: Create empty component directories

**Files:**
- Create empty placeholders in: `skills/`, `commands/`, `agents/`, `adapters/`, `data/skins/`, `data/tokens/`, `data/recipes/`

**Step 1: Make directories with `.gitkeep` placeholders**

```bash
mkdir -p skills commands agents adapters data/skins data/tokens data/recipes
touch skills/.gitkeep commands/.gitkeep agents/.gitkeep adapters/.gitkeep data/skins/.gitkeep data/tokens/.gitkeep data/recipes/.gitkeep
```

**Step 2: Commit**

```bash
git add skills/ commands/ agents/ adapters/ data/
git commit -m "chore: scaffold component directories"
```

### Task 1.4: Validate plugin loads

**Step 1: Invoke plugin-validator agent**

Use the `plugin-dev:plugin-validator` agent with the prompt: "Validate the design-engine plugin at `C:/Users/tim/OneDrive/Documents/Projects/design-engine`. The plugin is at v0.1.0 and currently has only the manifest, LICENSE/NOTICE/README, and empty component directories. Confirm plugin.json is valid."

Expected: validator confirms plugin.json structure is correct, notes empty components (expected for Phase 1).

**Phase 1 done.** Plugin manifest is valid and the structure is in place.

---

## Phase 2 — Three skills with full reference content

**Boundary deliverable:** Skills auto-fire correctly on UI work and stay quiet on non-UI work. Content from styleseed CLAUDE.md and DESIGN-LANGUAGE.md is adapted and ported.

### Task 2.1: Clone styleseed for source content

**Step 1: Clone repo**

```bash
git clone https://github.com/bitjaru/styleseed.git /tmp/styleseed-source 2>/dev/null || (cd /tmp/styleseed-source && git pull)
ls /tmp/styleseed-source/engine/
```

Expected: see `CLAUDE.md`, `DESIGN-LANGUAGE.md`, `components/`, `css/`, `tokens/`, `skins/`, `scaffold/`, `.claude/`, `.cursorrules`, `README.md`, `UPDATE.md`.

**No commit** — `/tmp/` is gitignored, this is just a working clone.

### Task 2.2: Create `design-engine` skill

**Files:**
- Create: `skills/design-engine/SKILL.md`

**Step 1: Source the CLAUDE.md content**

Read `/tmp/styleseed-source/engine/CLAUDE.md`.

**Step 2: Adapt and write**

Write `skills/design-engine/SKILL.md` with this frontmatter:

```yaml
---
name: design-engine
description: Use when building, modifying, reviewing, or designing UI — components, pages, screens, layouts, styles, themes, design tokens, or visual patterns. Carries design rules, the typography token system, color hierarchy, accessibility minimums, and the prohibited-practices list. Do not use for backend, API, database, build config, tests, or non-UI code.
---
```

Body: adapted from styleseed `CLAUDE.md` with the following changes:
- **Drop**: "Auto-Install Check" section (lines ~542-552 — security concern)
- **Drop**: "How to Use StyleSeed (Tell Users This)" section (replaced by our own workflow guidance)
- **Drop**: "Stay Updated" section (links to upstream)
- **Drop**: References to specific styleseed slash commands (`/ss-setup`, `/ss-review` etc.) — replace with our equivalents (`/design-init`, `/design-review`)
- **Drop**: "Quick Start — New Project Setup" (replaced by `/design-init`)
- **Adapt**: "Tech Stack" section — note that the canonical reference is React + Tailwind v4 + shadcn, but the `react-shadcn` adapter is one of six; other adapters target plain CSS, Astro, SvelteKit, Obsidian, etc.
- **Adapt**: Component pattern catalog — keep the 12 patterns (StatCard through RankedList) but reframe as abstract structural specs with React/Tailwind v4 reference impl. Note: "Other adapters provide their own templates for these patterns; your project's `.design-rules/config.json` declares the active adapter."
- **Add at top**: a "Active configuration" preamble: "When working in a project, check `.design-rules/config.json` for active adapter, skin, and recipe. If not present, this skill provides reference content but no project-specific config — suggest `/design-init` to capture decisions."
- **Keep verbatim**: Golden Rules (11), Token Customization (Colors, Typography, Spacing, Border Radius, Shadows including Font Size by Context table), `mx-6` vs `px-6`, Component Usage Rules, Color Usage Cheatsheet (3 tables), Pattern Components catalog (rewritten as abstract), Dark Mode strategy, Motion/Animation tokens, Accessibility Rules, Prohibited Practices (with React-specific items kept as adapter-specific notes).

**Step 3: Verify**

```bash
test -f skills/design-engine/SKILL.md && head -5 skills/design-engine/SKILL.md
```
Expected: file exists, frontmatter starts with `---` and `name: design-engine`.

**Step 4: Commit**

```bash
git add skills/design-engine/SKILL.md
git commit -m "feat(skills): add design-engine skill adapted from styleseed CLAUDE.md"
```

### Task 2.3: Create `design-language` skill

**Files:**
- Create: `skills/design-language/SKILL.md`

**Step 1: Source the DESIGN-LANGUAGE.md content**

Read `/tmp/styleseed-source/engine/DESIGN-LANGUAGE.md` (2670 lines, all 69 rules).

**Step 2: Adapt and write**

Write `skills/design-language/SKILL.md` with this frontmatter:

```yaml
---
name: design-language
description: Use when designing data-dense mobile-first UI — dashboards, KPI grids, fintech screens, analytics interfaces, admin panels, chart-heavy layouts. Provides 69 numbered visual design rules covering color philosophy, hierarchy, page layout, prohibitions, and composition recipes. Layers on top of design-engine for dashboard-specific specialty work. Do not use for marketing pages, content sites, blog UIs, native iOS/Android (use apple-design or material-design instead), or non-UI code.
---
```

Body: adapted from styleseed `DESIGN-LANGUAGE.md` with the following changes:
- **Keep verbatim**: All 69 numbered rules across Parts 1, 2, 3
- **Keep verbatim**: Table of Contents (the navigation aid that lets Claude find specific rules)
- **Adapt**: Rule examples that use React/Tailwind classes — keep the Tailwind classes as-is (most users will be on Tailwind), but add a "Stack mapping" preamble explaining how Tailwind utilities translate to plain CSS for non-Tailwind adapters
- **Add at top**: same "Active configuration" preamble pointing to `.design-rules/config.json`
- **Drop**: Self-references to styleseed-specific commands

**Step 3: Verify**

```bash
test -f skills/design-language/SKILL.md && wc -l skills/design-language/SKILL.md
```
Expected: file exists, ~2500-2700 lines.

**Step 4: Commit**

```bash
git add skills/design-language/SKILL.md
git commit -m "feat(skills): add design-language skill from styleseed DESIGN-LANGUAGE.md"
```

### Task 2.4: Create `composition-recipes` skill

**Files:**
- Create: `skills/composition-recipes/SKILL.md`

**Step 1: Source rule 63 from DESIGN-LANGUAGE.md**

Extract rule 63 ("Section Composition Recipes") and rules 61, 62, 64-69 (which cover visual rhythm and page composition principles).

**Step 2: Write**

Write `skills/composition-recipes/SKILL.md` with this frontmatter:

```yaml
---
name: composition-recipes
description: Use when scaffolding a new page, section structure, or screen layout — "scaffold a dashboard page", "what's the structure for a fintech screen", "lay out a new analytics page". Provides 5 page composition recipes (SaaS, e-commerce, fintech, social, productivity) with section sequences, KPI variation rules, and visual rhythm principles. Loads when a recipe choice needs to be made or when /design-page runs.
---
```

Body: ports rules 61-69 from DESIGN-LANGUAGE.md verbatim. Specifically:
- Rule 61: Visual Rhythm
- Rule 62: KPI Card Variation (4-card rule)
- Rule 63: Section Composition Recipes (the 5 app types)
- Rule 64: Element Diversity Within Cards
- Rule 65: Color Accent Distribution
- Rule 66: Card Size Variation
- Rule 67: Progressive Information Density
- Rule 68: Empty Page Prevention (min 4, max 7 sections)
- Rule 69: Chart + Context Pairing

**Step 3: Verify and commit**

```bash
test -f skills/composition-recipes/SKILL.md
git add skills/composition-recipes/SKILL.md
git commit -m "feat(skills): add composition-recipes skill from rules 61-69"
```

### Task 2.5: Smoke-test skill triggers

**Step 1: Test design-engine fires correctly**

In a scratch directory, start a Claude Code session and prompt: *"help me design a profile component"*. Expected: design-engine skill auto-fires.

Then prompt: *"refactor the database schema for performance"*. Expected: design-engine does NOT fire.

**Step 2: Test design-language narrowness**

Prompt: *"build a fintech dashboard"*. Expected: design-engine + design-language both fire.

Prompt: *"build a marketing landing page for a startup"*. Expected: design-engine fires, design-language does NOT.

**Step 3: Test composition-recipes**

Prompt: *"scaffold a new dashboard page"*. Expected: composition-recipes fires.

Prompt: *"add a tooltip component"*. Expected: composition-recipes does NOT fire (no page/scaffold trigger).

**Step 4: If trigger descriptions need adjustment**, edit the frontmatter `description` and recommit. Iterate until the trigger pattern matches the design-doc table.

```bash
git commit --amend -m "feat(skills): add design-engine skill (trigger refined)"
```
(or commit fresh adjustments separately)

**Phase 2 done.** Skills carry the rules and fire correctly.

---

## Phase 3 — `/design-init` + tailwind-v4 base adapter

**Boundary deliverable:** User can run `/design-init` in a Tailwind v4 project and get bootstrapped with theme files, marker, and conventions block.

### Task 3.1: Create `tailwind-v4` adapter

**Files:**
- Create: `adapters/tailwind-v4/manifest.json`
- Create: `adapters/tailwind-v4/theme/theme.css`
- Create: `adapters/tailwind-v4/theme/base.css`
- Create: `adapters/tailwind-v4/theme/fonts.css`
- Create: `adapters/tailwind-v4/theme/index.css`
- Create: `adapters/tailwind-v4/README.md`

**Step 1: Manifest**

```json
{
  "name": "tailwind-v4",
  "extends": null,
  "theme": { "targetPath": "src/styles/" },
  "components": { "targetPath": null },
  "scaffold": { "available": false },
  "templates": { "page": null, "component": null, "pattern": null },
  "settingsPage": { "writeCapable": false, "devGate": null, "routePath": null },
  "cursorRules": true
}
```

**Step 2: Port CSS files from styleseed**

Copy these files from `/tmp/styleseed-source/engine/css/` to `adapters/tailwind-v4/theme/`:
- `base.css`
- `fonts.css`
- `index.css`

For `theme.css`: copy from `/tmp/styleseed-source/skins/toss/theme.css` (default skin), but parameterize the brand color to use a `{{BRAND_COLOR}}` token that `/design-init` will substitute. Or keep as-is with toss defaults — final palette is written by `/design-skin` after init.

**Step 3: Adapter README**

```markdown
# tailwind-v4 adapter

Base CSS layer for any Tailwind v4 project. Provides theme.css with semantic tokens, base.css with element resets and accessibility rules, fonts.css with import boilerplate, index.css as entry point.

This adapter is the foundation for `react-shadcn`, `astro`, and `sveltekit` adapters via `extends`. Use directly only if your project is plain Tailwind v4 without a specific framework integration.

Originally from bitjaru/styleseed (MIT).
```

**Step 4: Commit**

```bash
git add adapters/tailwind-v4/
git commit -m "feat(adapters): add tailwind-v4 base CSS adapter ported from styleseed"
```

### Task 3.2: Create `/design-init` command

**Files:**
- Create: `commands/design-init.md`

**Step 1: Frontmatter**

```yaml
---
name: design-init
description: Interactive wizard — captures design decisions and writes durable artifacts (theme.css, .design-rules/config.json, conventions block, .cursorrules) to bootstrap the design system in a project. Runs once per project. Re-runnable for retrofit or full reset.
argument-hint: (no arguments — wizard mode) | --with-settings | --reset
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---
```

**Step 2: Body**

Write the wizard logic. The command should:

1. **Check for existing marker** at `.design-rules/config.json`. If present:
   - Show current config
   - Ask: "Re-run init? Options: A) keep current, B) update specific fields, C) full reset (`--reset` flag)"
2. **If first-run or reset**, walk through these steps one at a time:

   **Step A: Detect project type**
   - Check `package.json` for `react`, `tailwindcss`, `vite`, `next`, `astro`, `@sveltejs/kit`
   - Check root for `manifest.json` + `main.ts` + obsidian dep
   - Check for `astro.config.{mjs,ts}`, `svelte.config.{js,ts}`
   - Score adapters by signal match
   - Surface detected adapter(s); if multiple, ask user; if none, prompt user with full list (no auto-default to plain-css)

   **Step B: Retrofit detection**
   - If existing CSS theme files / token files / palette detected, offer modes: A) extract current palette, B) replace with bundled/awesome-design-md skin, C) bring-your-own (no theme.css written)

   **Step C: App type**
   ```
   What type of app is this?
   1. SaaS dashboard (analytics, metrics)
   2. E-commerce (products, orders)
   3. Fintech (transactions, portfolio)
   4. Social / content (feeds, profiles)
   5. Productivity / internal tool
   6. Marketing / content site
   7. Other
   ```

   **Step D: Skin choice**
   ```
   Pick a skin:
   1. toss (purple, default)
   2. stripe (clean blue, professional)
   3. linear (minimal, dark-first)
   4. vercel (black & white, geometric)
   5. notion (warm, friendly)
   6. <fetch from awesome-design-md by name>
   7. extract current palette as custom skin (retrofit mode A)
   8. bring-your-own (no skin applied)
   ```
   Reuse `/design-skin` lookup logic (4-source).

   **Step E: Font**
   ```
   Pick a font:
   1. Inter (default)
   2. Pretendard + Inter (Korean + English)
   3. Geist
   4. DM Sans
   5. Custom
   ```

   **Step F: Settings page?**
   ```
   Generate a runtime settings page for live token editing? [Y/n]
   ```
   Default Y for web stacks, N for Obsidian (settings tab is always-on by convention there).

3. **Write artifacts** based on choices:
   - Active adapter's `theme/` files copied to adapter manifest's `theme.targetPath`
   - `.design-rules/config.json` marker (schema per design doc)
   - `.design-rules/skins/<chosenskin>.json` (cached if not bundled)
   - `CLAUDE.md` — append conventions block under `## Design Engine Conventions` heading (or create CLAUDE.md if missing)
   - `.cursorrules` — write if adapter manifest's `cursorRules: true`
   - Settings page if user opted in (Phase 7 implements this — Phase 3 just records the preference)

4. **Print summary** of what was written and what to do next:
   ```
   ✓ Bootstrapped design-engine in this project.
     Adapter: sveltekit
     Skin: stripe
     Recipe: saas (default for SaaS)
     Font: Inter

   Next steps:
   - /design-page Dashboard "main overview"  ← scaffold first page
   - /design-skin <name>                      ← swap palette later
   - /design-review src/                      ← audit existing UI
   ```

**Step 3: Commit**

```bash
git add commands/design-init.md
git commit -m "feat(commands): add /design-init wizard for project bootstrap"
```

### Task 3.3: Create `/design-skin` command

**Files:**
- Create: `commands/design-skin.md`

**Step 1: Frontmatter**

```yaml
---
name: design-skin
description: Swap the active skin (palette + fonts) in the current project. Resolves via 4-source lookup — project cache, user global ~/.design-rules/skins/, plugin bundled, awesome-design-md fetch. Updates theme.css and .design-rules/config.json. Use install <path> to register a skin globally; use save <name> to capture current theme as a named skin.
argument-hint: <skin-name> | install <path-to-json> | save <name> | list
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---
```

**Step 2: Body**

Implement:

1. **Argument parsing**: bare name (apply skin), `install <path>` (copy JSON to `~/.design-rules/skins/`), `save <name>` (capture current theme.css as a skin), `list` (show available skins from all 4 sources)

2. **4-source lookup** for bare-name case:
   - `.design-rules/skins/<name>.json`
   - `~/.design-rules/skins/<name>.json`
   - `data/skins/<name>.json` (plugin bundled — `${CLAUDE_PLUGIN_ROOT}/data/skins/`)
   - awesome-design-md fetch: `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/<name>/DESIGN.md` → parse palette → cache to `.design-rules/skins/<name>.json`

3. **Apply skin**:
   - Read active adapter from `.design-rules/config.json`
   - Adapter writes palette to its `theme.targetPath/theme.css` (both `:root` and `.dark` blocks per skin's light/dark colors)
   - Update `.design-rules/config.json:skin` field

4. **awesome-design-md parser**: extract from a DESIGN.md fetched body (key sections: Primary Color, Secondary Colors, Text Colors, Background Colors). Map to skin schema. Parse with regex on the DESIGN.md heading structure; if a brand's DESIGN.md doesn't conform to the expected layout, surface clearly with the unparsed raw text and ask the user to author manually.

**Step 3: Commit**

```bash
git add commands/design-skin.md
git commit -m "feat(commands): add /design-skin with 4-source lookup and awesome-design-md fetch"
```

### Task 3.4: Create `/design-tokens` command

**Files:**
- Create: `commands/design-tokens.md`

**Step 1: Frontmatter**

```yaml
---
name: design-tokens
description: View, add, or update individual design tokens (colors, fonts, spacing, radii, shadows, motion) in the current project. Edits theme.css and any token-source JSON files in sync. For wholesale palette swaps use /design-skin instead.
argument-hint: list [type] | add <type> <name> <value> | update <type> <name> <value> | remove <type> <name>
allowed-tools: Read, Write, Edit, Grep, Glob
---
```

**Step 2: Body**

Implement CRUD on individual tokens:
- `list` shows all tokens grouped by type
- `list <type>` filters (color, typography, spacing, radius, shadow, motion)
- `add <type> <name> <value>` inserts a new token, writes to theme.css and `data/tokens/<type>.json` if user opts in to source-of-truth
- `update <type> <name> <value>` modifies existing
- `remove <type> <name>` deletes (with confirmation)

**Step 3: Commit**

```bash
git add commands/design-tokens.md
git commit -m "feat(commands): add /design-tokens CRUD command"
```

### Task 3.5: Phase 3 smoke test

**Step 1: Create scratch Tailwind v4 project**

```bash
mkdir -p /tmp/scratch-tailwind && cd /tmp/scratch-tailwind
npm init -y
npm install -D tailwindcss@next vite
echo '{"name": "scratch", "type": "module"}' > package.json
```

**Step 2: Run /design-init in Claude Code session**

Expected:
- Auto-detects `tailwind-v4` adapter
- Walks through wizard steps
- Writes `.design-rules/config.json`, `src/styles/theme.css` + base/fonts/index, `.cursorrules`, appends to (or creates) `CLAUDE.md`

**Step 3: Verify artifacts**

```bash
test -f /tmp/scratch-tailwind/.design-rules/config.json && cat /tmp/scratch-tailwind/.design-rules/config.json | python -c "import json,sys; print(json.loads(sys.stdin.read()))"
test -f /tmp/scratch-tailwind/src/styles/theme.css
test -f /tmp/scratch-tailwind/.cursorrules
grep -q "Design Engine Conventions" /tmp/scratch-tailwind/CLAUDE.md
```

Expected: all checks pass.

**Step 4: Run /design-skin stripe**

Verify: theme.css palette swaps to stripe colors, config.json updates.

**Phase 3 done.** Bootstrap and skin swap work on a Tailwind v4 project.

---

## Phase 4 — Stack-specific adapters

**Boundary deliverable:** All 6 adapters (`tailwind-v4`, `react-shadcn`, `astro`, `sveltekit`, `obsidian-css`, `plain-css`) generate correct theme files for their target stack. `/design-init` auto-detects each correctly.

### Task 4.1: `react-shadcn` adapter

**Files:**
- Create: `adapters/react-shadcn/manifest.json`
- Create: `adapters/react-shadcn/components/ui/*.tsx` (32 files, copied from styleseed)
- Create: `adapters/react-shadcn/components/patterns/*.tsx` (16 files, copied from styleseed)
- Create: `adapters/react-shadcn/scaffold/` (Vite project, copied from styleseed)
- Create: `adapters/react-shadcn/templates/page.tsx`
- Create: `adapters/react-shadcn/templates/component.tsx`
- Create: `adapters/react-shadcn/templates/pattern.tsx`
- Create: `adapters/react-shadcn/README.md`

**Step 1: Manifest**

```json
{
  "name": "react-shadcn",
  "extends": "tailwind-v4",
  "theme": { "targetPath": "src/styles/" },
  "components": { "targetPath": "src/components/" },
  "scaffold": { "available": true, "entry": "scaffold/" },
  "templates": {
    "page": "templates/page.tsx",
    "component": "templates/component.tsx",
    "pattern": "templates/pattern.tsx"
  },
  "settingsPage": {
    "writeCapable": true,
    "devGate": "import.meta.env.DEV",
    "routePath": "/__design"
  },
  "cursorRules": true
}
```

**Step 2: Port components from styleseed**

```bash
cp -r /tmp/styleseed-source/engine/components/ui/* adapters/react-shadcn/components/ui/
cp -r /tmp/styleseed-source/engine/components/patterns/* adapters/react-shadcn/components/patterns/
```

**Step 3: Add MIT header + porting note to each .tsx file**

Use a script:

```bash
HEADER='// Originally from bitjaru/styleseed (MIT) — see /LICENSE for full attribution.\n// Ported to design-engine plugin under MIT.\n\n'
for f in adapters/react-shadcn/components/ui/*.tsx adapters/react-shadcn/components/patterns/*.tsx; do
  echo -e "$HEADER$(cat "$f")" > "$f"
done
```

**Step 4: Port scaffold from styleseed**

```bash
cp -r /tmp/styleseed-source/engine/scaffold/ adapters/react-shadcn/scaffold/
```

**Step 5: Create page/component/pattern templates** that demonstrate adapter idiom (use ported pattern components, follow CLAUDE.md conventions).

**Step 6: Write adapter README** with attribution and usage notes.

**Step 7: Commit**

```bash
git add adapters/react-shadcn/
git commit -m "feat(adapters): port react-shadcn adapter from styleseed components and scaffold"
```

### Task 4.2: `astro` adapter

**Files:**
- Create: `adapters/astro/manifest.json`
- Create: `adapters/astro/templates/page.astro`
- Create: `adapters/astro/templates/component.astro`
- Create: `adapters/astro/README.md`

**Step 1: Manifest**

```json
{
  "name": "astro",
  "extends": "tailwind-v4",
  "theme": { "targetPath": "src/styles/" },
  "components": { "targetPath": "src/components/" },
  "scaffold": { "available": false, "entry": null },
  "templates": {
    "page": "templates/page.astro",
    "component": "templates/component.astro",
    "pattern": "templates/component.astro"
  },
  "settingsPage": {
    "writeCapable": true,
    "devGate": "import.meta.env.DEV",
    "routePath": "/__design"
  },
  "cursorRules": true
}
```

**Step 2: Templates**

Write `templates/page.astro` as an Astro page following styleseed structure (Hero + KPI grid + chart + list pattern). Use Tailwind v4 classes from the `Font Size by Context` table. Add comment header pointing to DESIGN-LANGUAGE.md rules 14, 18, 19, 61-63.

Write `templates/component.astro` as a generic component scaffold with prop typing.

**Step 3: README + commit**

```bash
git add adapters/astro/
git commit -m "feat(adapters): add astro adapter with .astro templates"
```

### Task 4.3: `sveltekit` adapter

**Files:**
- Create: `adapters/sveltekit/manifest.json`
- Create: `adapters/sveltekit/templates/+page.svelte`
- Create: `adapters/sveltekit/templates/component.svelte`
- Create: `adapters/sveltekit/README.md`

**Step 1: Manifest**

```json
{
  "name": "sveltekit",
  "extends": "tailwind-v4",
  "theme": { "targetPath": "src/lib/styles/" },
  "components": { "targetPath": "src/lib/components/" },
  "scaffold": { "available": false, "entry": null },
  "templates": {
    "page": "templates/+page.svelte",
    "component": "templates/component.svelte",
    "pattern": "templates/component.svelte"
  },
  "settingsPage": {
    "writeCapable": true,
    "devGate": "import.meta.env.DEV",
    "routePath": "/__design"
  },
  "cursorRules": true
}
```

**Step 2: Templates**

Write `templates/+page.svelte` as a SvelteKit page with same structure as the Astro template.

**Step 3: Commit**

```bash
git add adapters/sveltekit/
git commit -m "feat(adapters): add sveltekit adapter with .svelte templates"
```

### Task 4.4: `obsidian-css` adapter

**Files:**
- Create: `adapters/obsidian-css/manifest.json`
- Create: `adapters/obsidian-css/theme/styles.css`
- Create: `adapters/obsidian-css/templates/settings-tab.ts`
- Create: `adapters/obsidian-css/README.md`

**Step 1: Manifest**

```json
{
  "name": "obsidian-css",
  "extends": null,
  "theme": { "targetPath": "./" },
  "components": { "targetPath": null },
  "scaffold": { "available": false, "entry": null },
  "templates": {
    "page": null,
    "component": null,
    "pattern": null,
    "settingsTab": "templates/settings-tab.ts"
  },
  "settingsPage": {
    "writeCapable": true,
    "devGate": null,
    "routePath": "settings-tab"
  },
  "cursorRules": false
}
```

**Step 2: theme/styles.css**

Translate styleseed's CSS custom properties to Obsidian theme variables (`--background-primary`, `--text-normal`, `--interactive-accent`, etc.). Map:
- `--brand` → `--interactive-accent`
- `--background` → `--background-primary`
- `--card` → `--background-secondary`
- `--foreground` → `--text-normal`
- `--text-secondary` → `--text-muted`
- `--text-tertiary` → `--text-faint`

**Step 3: templates/settings-tab.ts**

Write an Obsidian PluginSettingTab template that uses `addColorPicker`, `addText`, `addDropdown` for editable theme tokens. This is the Obsidian-idiom equivalent of the settings page.

**Step 4: Commit**

```bash
git add adapters/obsidian-css/
git commit -m "feat(adapters): add obsidian-css adapter with theme variables and settings tab template"
```

### Task 4.5: `plain-css` adapter

**Files:**
- Create: `adapters/plain-css/manifest.json`
- Create: `adapters/plain-css/theme/theme.css`
- Create: `adapters/plain-css/templates/page.html`
- Create: `adapters/plain-css/README.md`

**Step 1: Manifest**

```json
{
  "name": "plain-css",
  "extends": null,
  "theme": { "targetPath": "./styles/" },
  "components": { "targetPath": null },
  "scaffold": { "available": false, "entry": null },
  "templates": { "page": "templates/page.html", "component": null, "pattern": null },
  "settingsPage": { "writeCapable": false, "devGate": null, "routePath": null },
  "cursorRules": true
}
```

**Step 2: theme.css**

Vanilla CSS custom properties (no Tailwind). Convert tokens to plain `--var: value;` declarations covering all token categories.

**Step 3: page.html**

Static HTML page following the SaaS recipe structure with inline class names that match the CSS custom properties.

**Step 4: Commit**

```bash
git add adapters/plain-css/
git commit -m "feat(adapters): add plain-css fallback adapter"
```

### Task 4.6: Phase 4 smoke test

**Step 1: Verify each adapter scaffolds correctly**

For each of the 6 adapters, run `/design-init` in a corresponding scratch project:

| Adapter | Scratch project setup |
|---|---|
| `tailwind-v4` | Already tested in Phase 3 |
| `react-shadcn` | `npm create vite@latest -- --template react-ts`, add tailwindcss |
| `astro` | `npm create astro@latest`, add tailwind |
| `sveltekit` | `npm create svelte@latest`, add tailwind |
| `obsidian-css` | New folder with `manifest.json`+`main.ts`+obsidian dep stub |
| `plain-css` | Empty folder |

For each: confirm detection picks the right adapter, theme files write to correct paths, marker created.

**Step 2: Document any failures, fix, recommit**

**Phase 4 done.** All adapters scaffold correctly per their target stack.

---

## Phase 5 — Generator commands

**Boundary deliverable:** `/design-page`, `/design-pattern`, `/design-component`, `/design-copy`, `/design-flow`, `/design-feedback` work on the active adapter.

### Task 5.1: `/design-page` command

**Files:**
- Create: `commands/design-page.md`

**Step 1: Frontmatter**

```yaml
---
name: design-page
description: Scaffold a new page using the active recipe and adapter. Generates a file at the adapter's expected path with the recipe's section sequence (Hero + KPI grid + chart + list etc.). Use --recipe=<name> to override active recipe per-page.
argument-hint: <page-name> "<description>" [--recipe=<recipe-name>]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---
```

**Step 2: Body**

Implement:
1. Read `.design-rules/config.json` for active adapter and recipe
2. Apply `--recipe` flag override if present
3. If no recipe in config and no flag: prompt user inline
4. Read recipe JSON: `data/recipes/<name>.md` or `.design-rules/recipes/<name>.json`
5. Read adapter manifest, get `templates.page` path
6. Read template file
7. Substitute recipe sections into template
8. Write to adapter's expected location (e.g. `src/routes/<page-name>/+page.svelte` for SvelteKit)
9. Confirm before overwriting if file exists

**Step 3: Commit**

```bash
git add commands/design-page.md
git commit -m "feat(commands): add /design-page generator with recipe override"
```

### Task 5.2: `/design-pattern` command

Similar structure to `/design-page` but generates patterns (HeroCard, ChartCard, etc.) instead of full pages. Reads adapter's `templates.pattern`.

**Step 1: Frontmatter**

```yaml
---
name: design-pattern
description: Generate a composed UI pattern (card layout, list, form section, grid) using the active adapter's pattern template. Common patterns include HeroCard, ChartCard, ListItem, KPI grid, BriefingCarousel.
argument-hint: <pattern-name> "<description>"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---
```

**Step 2: Body, commit**

```bash
git add commands/design-pattern.md
git commit -m "feat(commands): add /design-pattern generator"
```

### Task 5.3: `/design-component` command

Same pattern. Generates a primitive component using `templates.component`.

```yaml
---
name: design-component
description: Generate a new UI primitive component (Button, Card, Badge, etc.) following design-engine conventions. Uses the active adapter's component template idiom.
argument-hint: <component-name> "<description>"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---
```

```bash
git add commands/design-component.md
git commit -m "feat(commands): add /design-component generator"
```

### Task 5.4: `/design-copy`, `/design-flow`, `/design-feedback`

Port from styleseed `ss-copy`, `ss-flow`, `ss-feedback` SKILL.md files. These are content-generation commands, not file-generation; less adapter-coupled. Each command's body is mostly prompt instructions for Claude to produce the right output.

**Step 1: Port each, change frontmatter `name` to `design-*`, commit each**

```bash
# After porting each file:
git add commands/design-copy.md && git commit -m "feat(commands): add /design-copy ported from styleseed"
git add commands/design-flow.md && git commit -m "feat(commands): add /design-flow ported from styleseed"
git add commands/design-feedback.md && git commit -m "feat(commands): add /design-feedback ported from styleseed"
```

### Task 5.5: Phase 5 smoke test

**Step 1: In a scratch project with /design-init complete, run /design-page**

```
/design-page Dashboard "main fintech overview"
```

Expected: page file written to adapter-correct path with recipe-correct structure.

**Step 2: Test --recipe override**

```
/design-page MarketingHome "landing page" --recipe=ecommerce
```

Expected: uses ecommerce recipe instead of project default.

**Step 3: Run /design-pattern, /design-component**

Verify they produce correct adapter-idiom output.

**Phase 5 done.** Generators work on all adapters.

---

## Phase 6 — Audit agents and commands

**Boundary deliverable:** `/design-review`, `/design-lint`, `/design-a11y`, `/design-audit` produce structured reports. `/design-review --fix` proposes Edit operations.

### Task 6.1: Create `design-reviewer` agent

**Files:**
- Create: `agents/design-reviewer.md`

**Step 1: Frontmatter**

```yaml
---
name: design-reviewer
description: Reviews UI code (components, pages, styles) for compliance with design-engine rules. Returns structured violation report with file:line references and suggested fixes. With --fix flag, proposes Edit operations to address violations.
tools: Read, Edit, Grep, Glob
---
```

**Step 2: Body**

Agent system prompt that:
1. Loads `.design-rules/config.json` to know active adapter and skin
2. Reads target file(s)
3. Checks against design-engine + design-language rules:
   - Golden Rules (11 from CLAUDE.md)
   - Font sizes match the Font Size by Context table
   - Single accent color (no rogue hex values for non-status colors)
   - No pure black `#000`
   - Shadow opacity ≤ 8%
   - Card-only content (no bare-page background content)
   - Semantic tokens, no hardcoded hex
   - DESIGN-LANGUAGE.md rule 18 prohibition list
4. Returns structured JSON or formatted markdown report:
   ```
   ## Design Review: <file>

   ### Violations (3)
   - **Line 42** | Rule 3 (no pure black) | `color: #000;` should use `var(--foreground)` (~`#2A2A2A`)
   - **Line 67** | Rule 10 (font size table) | `text-[35px]` not in size table — use `text-[36px]` (KPI metric) or `text-[30px]` (3xl)
   - **Line 91** | Rule 12 (shadow opacity) | `box-shadow: 0 4px 12px rgba(0,0,0,0.15)` — opacity 15% exceeds 8% max; use `var(--shadow-card-hover)`

   ### Compliant areas
   - Color hierarchy: ✓
   - Touch targets: ✓ (all ≥ 44px)
   - Semantic tokens: ✓ (no hardcoded colors)
   ```
5. With `--fix`: produces Edit tool calls to address each violation.

**Step 3: Commit**

```bash
git add agents/design-reviewer.md
git commit -m "feat(agents): add design-reviewer agent for compliance check"
```

### Task 6.2: Create `accessibility-reviewer` agent

**Files:**
- Create: `agents/accessibility-reviewer.md`

```yaml
---
name: accessibility-reviewer
description: Reviews UI code for WCAG AA accessibility compliance — touch targets (≥44px), focus rings, color contrast (verifies skin meets 4.5:1+ for muted, 7:1+ for body), semantic HTML, alt text, keyboard nav. With --fix, applies mechanical fixes.
tools: Read, Edit, Grep, Glob
---
```

Body: applies a11y rules from `design-engine` skill's accessibility section.

```bash
git add agents/accessibility-reviewer.md
git commit -m "feat(agents): add accessibility-reviewer agent"
```

### Task 6.3: Create `ux-auditor` agent

**Files:**
- Create: `agents/ux-auditor.md`

```yaml
---
name: ux-auditor
description: Audits UI for UX issues using Nielsen's 10 usability heuristics and modern mobile UX best practices. Different from /design-review — checks usability and flow, not design system compliance.
tools: Read, Grep, Glob
---
```

Body: ports the audit framework from styleseed `ss-audit` SKILL.md, applies Nielsen heuristics + mobile UX patterns.

```bash
git add agents/ux-auditor.md
git commit -m "feat(agents): add ux-auditor agent ported from styleseed ss-audit"
```

### Task 6.4: `/design-review` command

**Files:**
- Create: `commands/design-review.md`

```yaml
---
name: design-review
description: Review UI code for design-engine compliance. Invokes design-reviewer agent. Use --fix to apply suggested changes via Edit operations.
argument-hint: <path> [--fix]
allowed-tools: Task
---
```

Body: thin wrapper that invokes `design-reviewer` agent with the file path and `--fix` flag if provided.

```bash
git add commands/design-review.md
git commit -m "feat(commands): add /design-review command"
```

### Task 6.5: `/design-lint` command

**Files:**
- Create: `commands/design-lint.md`

```yaml
---
name: design-lint
description: Fast pattern-based lint — Grep for common violations across a directory in seconds. No agent — uses regex patterns to flag obvious issues (hardcoded #000, off-table font sizes, px-4/mx-4 instead of px-6/mx-6). For deep review use /design-review.
argument-hint: <path>
allowed-tools: Read, Grep, Glob, Bash
---
```

Body: a list of regex patterns (from styleseed `ss-lint`) that Grep applies and reports. No agent invocation.

```bash
git add commands/design-lint.md
git commit -m "feat(commands): add /design-lint fast pattern check"
```

### Task 6.6: `/design-a11y` and `/design-audit` commands

```bash
# After writing each:
git add commands/design-a11y.md && git commit -m "feat(commands): add /design-a11y wrapper for accessibility-reviewer agent"
git add commands/design-audit.md && git commit -m "feat(commands): add /design-audit wrapper for ux-auditor agent"
```

### Task 6.7: Phase 6 smoke test

**Step 1: Build a deliberately-broken file**

```bash
mkdir -p /tmp/scratch-tailwind/src/test
cat > /tmp/scratch-tailwind/src/test/Bad.svelte << 'EOF'
<script>
  let metric = 1234;
</script>

<div style="color: #000; font-size: 35px;">
  <div style="box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
    Revenue: ${metric}
  </div>
</div>
EOF
```

**Step 2: Run /design-review on it**

Expected: agent reports 3+ violations with line numbers and fix suggestions.

**Step 3: Run /design-review --fix**

Expected: agent proposes Edit operations.

**Step 4: Run /design-lint /tmp/scratch-tailwind/src/test/**

Expected: regex-flag violations in seconds without agent.

**Phase 6 done.** Audits work end-to-end.

---

## Phase 7 — Settings page generation

**Boundary deliverable:** `/design-settings-page` scaffolds a runtime settings UI per the active adapter. Web adapters get a dev-gated route; Obsidian gets a settings tab.

### Task 7.1: Settings page templates per adapter

**Files (one per adapter):**
- Create: `adapters/react-shadcn/templates/settings-page.tsx`
- Create: `adapters/astro/templates/settings-page.astro`
- Create: `adapters/sveltekit/templates/settings-page.svelte`
- Create: `adapters/obsidian-css/templates/settings-tab.ts` (already created in Task 4.4 — refine here)
- Create: `adapters/plain-css/templates/settings-page.html` (read-only, copyable snippet)

**Step 1: For each adapter, write a template** that:
- Reads token values from `theme.css` at runtime (or imports them)
- Renders editable controls per token category (color picker for colors, dropdown for fonts, slider for spacing/sizes)
- On change: POSTs to dev endpoint that writes back to `theme.css` and `.design-rules/config.json`
- Dev-gated per adapter (`import.meta.env.DEV` for Vite-based, always-on for Obsidian, n/a for plain-css)

**Step 2: Vite plugin or dev API endpoint per adapter**

For react-shadcn / astro / sveltekit, ship a small Vite plugin or dev integration that exposes `POST /__design/api/tokens` writing to theme.css. Include in adapter's scaffolding.

**Step 3: Commit each adapter's template**

```bash
git add adapters/react-shadcn/templates/settings-page.tsx
git commit -m "feat(adapters): add react-shadcn settings page template"
# Repeat per adapter
```

### Task 7.2: `/design-settings-page` command

**Files:**
- Create: `commands/design-settings-page.md`

```yaml
---
name: design-settings-page
description: Scaffold a runtime settings/tokens UI page in the current project using the active adapter's settings template. For web adapters generates a dev-gated route; for Obsidian generates a settings tab. Skipped if .design-rules/config.json:settingsPage is false.
argument-hint: (no arguments — uses active adapter)
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---
```

Body:
1. Read `.design-rules/config.json` for active adapter
2. Read adapter manifest's `settingsPage` config
3. If `writeCapable: false` (plain-css), generate read-only HTML page with copyable CSS snippet
4. Otherwise, generate adapter-specific template at `routePath`
5. Update `.design-rules/config.json:settingsPage = true`

```bash
git add commands/design-settings-page.md
git commit -m "feat(commands): add /design-settings-page generator"
```

### Task 7.3: Phase 7 smoke test

For each adapter, run `/design-settings-page` and verify the generated UI page:
- Reads current tokens correctly
- Edit controls work in dev mode (where applicable)
- Changes write back to theme.css

**Phase 7 done.** Settings page works per adapter.

---

## Phase 8 — Bundled data files

**Boundary deliverable:** All 5 skins, 5 recipes, 6 token files, and the awesome-design-md catalog ship in `data/`.

### Task 8.1: Port 5 bundled skins from styleseed

**Files:**
- Create: `data/skins/toss.json`
- Create: `data/skins/stripe.json`
- Create: `data/skins/linear.json`
- Create: `data/skins/vercel.json`
- Create: `data/skins/notion.json`

**Step 1: For each skin**

Read `/tmp/styleseed-source/skins/<name>/theme.css` (light + dark blocks). Extract palette and font choices. Build a JSON file matching the schema:

```json
{
  "name": "<name>",
  "version": 1,
  "source": "bundled",
  "colors": {
    "light": { "brand": "...", "primary": "...", ... },
    "dark": { "brand": "...", "primary": "...", ... }
  },
  "fonts": { "primary": "...", "mono": "..." }
}
```

**Step 2: Validate JSON**

```bash
for f in data/skins/*.json; do
  python -c "import json; json.load(open('$f'))" && echo "valid: $f"
done
```

**Step 3: Commit**

```bash
git add data/skins/
git commit -m "feat(data): port 5 bundled skins from styleseed (toss, stripe, linear, vercel, notion)"
```

### Task 8.2: Port 6 token files from styleseed

**Files:**
- Create: `data/tokens/colors.json`
- Create: `data/tokens/typography.json`
- Create: `data/tokens/spacing.json`
- Create: `data/tokens/radii.json`
- Create: `data/tokens/shadows.json`
- Create: `data/tokens/motion.json`

**Step 1: Copy from styleseed**

```bash
cp /tmp/styleseed-source/engine/tokens/*.json data/tokens/
```

**Step 2: Validate, commit**

```bash
for f in data/tokens/*.json; do
  python -c "import json; json.load(open('$f'))" && echo "valid: $f"
done
git add data/tokens/
git commit -m "feat(data): port 6 token JSON files from styleseed"
```

### Task 8.3: Build 5 recipes from rule 63

**Files:**
- Create: `data/recipes/saas.json`
- Create: `data/recipes/ecommerce.json`
- Create: `data/recipes/fintech.json`
- Create: `data/recipes/social.json`
- Create: `data/recipes/productivity.json`

**Step 1: For each recipe**

Read DESIGN-LANGUAGE.md rule 63 (Section Composition Recipes). For each app type, extract the section sequence and build a JSON file:

```json
{
  "name": "saas",
  "version": 1,
  "sections": [
    { "type": "hero-card", "props": { "metric": "primary-revenue", "trend": true } },
    { "type": "kpi-grid", "props": { "columns": 4 } },
    ...
  ]
}
```

**Step 2: Validate, commit**

```bash
git add data/recipes/
git commit -m "feat(data): add 5 composition recipes from DESIGN-LANGUAGE.md rule 63"
```

### Task 8.4: Build awesome-design-md catalog

**Files:**
- Create: `data/awesome-design-md-index.json`

**Step 1: Fetch upstream directory listing**

```bash
curl -fsSL "https://api.github.com/repos/VoltAgent/awesome-design-md/contents/design-md" | python -c "
import json, sys
data = json.load(sys.stdin)
brands = sorted([d['name'] for d in data if d['type'] == 'dir'])
print(json.dumps({'version': 1, 'fetchedAt': '2026-05-04', 'brands': brands}, indent=2))
" > data/awesome-design-md-index.json
```

**Step 2: Validate, commit**

```bash
test -s data/awesome-design-md-index.json
python -c "import json; json.load(open('data/awesome-design-md-index.json'))"
git add data/awesome-design-md-index.json
git commit -m "feat(data): add awesome-design-md catalog (pinned at 2026-05-04)"
```

**Phase 8 done.** All bundled data is in place.

---

## Phase 9 — Polish + pre-release checklist

**Boundary deliverable:** Plugin is ready for public release. README is complete, all attribution is correct, all checklist items pass.

### Task 9.1: Finalize README

Replace the skeleton README with a complete one covering:
- Description + tagline
- Quick start (install + `/design-init`)
- Full attribution (bitjaru, Google Stitch, VoltAgent)
- Command reference table (all 14 commands with one-line descriptions)
- Adapter list (with target stack per adapter)
- Skill list with trigger conditions
- Skin list (5 bundled + how to fetch from awesome-design-md + how to author custom)
- Recipe list (5 bundled + how to author custom)
- Settings page section
- Audit usage examples
- Contributing notes
- License + NOTICE links

```bash
git add README.md
git commit -m "docs: complete README with full command reference and attribution"
```

### Task 9.2: Run pre-release checklist

Per design doc §5 testing strategy:

- [ ] README has clear attribution (bitjaru, Google Stitch, VoltAgent)
- [ ] LICENSE/NOTICE files present and accurate
- [ ] All ported `.tsx` files in `react-shadcn` adapter retain MIT headers + porting note
- [ ] No leftover styleseed-internal references (`/ss-setup`, `/ss-review` etc.) in skill bodies
- [ ] All 14 commands have working frontmatter and argument hints
- [ ] All 3 agents return structured output (not freeform text)
- [ ] Plugin validator passes (`plugin-dev:plugin-validator` agent)
- [ ] All bundled JSON files valid

**Step 1: Grep check for styleseed references**

```bash
grep -rn "ss-setup\|ss-review\|ss-page\|ss-component\|ss-pattern\|ss-tokens\|ss-flow\|ss-copy\|ss-feedback\|ss-a11y\|ss-audit\|ss-lint\|ss-update" skills/ commands/ agents/ adapters/ data/ 2>/dev/null
```

Expected: empty output (no matches). Fix any that surface.

**Step 2: Grep check for MIT headers in ported components**

```bash
grep -L "Originally from bitjaru/styleseed" adapters/react-shadcn/components/ui/*.tsx adapters/react-shadcn/components/patterns/*.tsx
```

Expected: empty output (every file has the header).

**Step 3: Plugin validator**

Invoke `plugin-dev:plugin-validator` agent on the project root. Resolve any reported issues.

**Step 4: JSON validation pass**

```bash
find data adapters -name '*.json' -exec python -c "import json,sys; json.load(open(sys.argv[1])); print('valid:', sys.argv[1])" {} \;
```

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore: pre-release polish (validator fixes, missing headers)"
```

### Task 9.3: Manual smoke tests on real projects

Per design doc §5:

- `deflocksc-website` (Astro + Tailwind v4) → `astro` adapter
- `callyall` (SvelteKit + Tailwind v4) → `sveltekit` adapter
- `obsidian-link-ingest` (Obsidian plugin) → `obsidian-css` adapter
- Scratch React + Vite project → `react-shadcn` adapter

For each: run `/design-init`, generate a page, run `/design-review`. Document any breakages.

**Phase 9 done.** Plugin is release-ready.

---

## Phase 10 — Public release + feature issues

**Boundary deliverable:** Repo pushed to GitHub, plugin available in marketplace, three feature issues filed.

### Task 10.1: Create GitHub repo and push

**Step 1: Create repo via gh CLI**

```bash
gh repo create TimSimpsonJr/design-engine --public --description "Stack-agnostic design system toolkit for Claude Code. Adapted from bitjaru/styleseed (MIT)." --source=. --remote=origin
```

**Step 2: Push**

```bash
git push -u origin main
```

### Task 10.2: File three feature issues

**Step 1: Issue 1 — Monorepo / multi-stack adapter routing**

```bash
gh issue create --title "Monorepo / multi-stack adapter routing" --body "$(cat <<'EOF'
## Problem

Current model: one `.design-rules/config.json` at repo root, one adapter per project. Monorepos (web + admin + marketing in one repo) might want adapter-per-package or adapter-per-path.

## Proposal

Support adapter-per-subtree:
- Allow `.design-rules/config.json` at any depth (not just repo root)
- Plugin commands respect the nearest config in the directory ancestry
- `/design-init` in a subdirectory creates a local marker

## v0 workaround

Run `/design-init` per package directory.

## Tracking

See [design doc §3 Lifecycle 4](docs/plans/2026-05-04-design-engine-plugin-design.md) — flagged as v0.x.
EOF
)"
```

**Step 2: Issue 2 — Adapter migration**

```bash
gh issue create --title "Adapter migration via /design-init --migrate" --body "$(cat <<'EOF'
## Problem

User starts a project on `astro`, decides to migrate to `sveltekit` later. Need to:
- Regenerate theme files in new adapter's expected paths
- Update `.design-rules/config.json:adapter`
- Optionally clean up old adapter's files

## Proposal

Add `/design-init --migrate` flag:
- Detects current adapter from marker
- Walks user through new adapter selection
- Re-runs theme generation with new adapter's manifest
- Optionally rm old theme files (with confirmation)

## v0 workaround

Re-run `/design-init`, choose new adapter, manually clean old files.

## Tracking

See [design doc §3 Lifecycle 5](docs/plans/2026-05-04-design-engine-plugin-design.md) — flagged as v0.x.
EOF
)"
```

**Step 3: Issue 3 — `/design-recipe extract <url>`**

```bash
gh issue create --title "/design-recipe extract <url> agent" --body "$(cat <<'EOF'
## Problem

Currently recipes are bundled (5) or manually authored as JSON. Users may want to extract a recipe from an existing public site (e.g., notion.so, stripe.com/pricing).

## Proposal

Add `/design-recipe extract <url>` agent that:
1. Fetches the page
2. Parses HTML/CSS to identify section types (hero, KPI grid, chart, list, etc.)
3. Builds a recipe JSON
4. Optionally extracts reusable components alongside the recipe (research needed — what counts as a component vs a section?)
5. Saves to `.design-rules/recipes/<name>.json`

## Open questions

- How accurate can section identification be? (Need research — fuzzy heuristics, or ML-assisted?)
- Should this also extract assets (icons, illustrations)?
- License implications of extracting from copyrighted sites — agent should warn user about fair-use considerations

## Tracking

See [design doc §3 + Out of scope](docs/plans/2026-05-04-design-engine-plugin-design.md) — flagged as v0.x.
EOF
)"
```

### Task 10.3: Create marketplace entry

**Step 1: Determine marketplace location**

If user maintains a personal marketplace at `TimSimpsonJr/marketplace` (similar to other plugin authors), add an entry there. Otherwise, document plugin install via direct repo URL: `/plugin install TimSimpsonJr/design-engine`.

**Step 2: Verify install works**

In a fresh Claude Code session, run `/plugin install TimSimpsonJr/design-engine`. Confirm plugin loads, skills register, commands available.

**Step 3: Tag v0.1.0 release**

```bash
git tag -a v0.1.0 -m "Initial public release. Ports bitjaru/styleseed into a stack-agnostic Claude Code plugin with 14 commands, 3 skills, 3 audit agents, and 6 adapters."
git push origin v0.1.0
```

```bash
gh release create v0.1.0 --title "v0.1.0 — Initial public release" --notes "$(cat <<'EOF'
## What's New

Initial public release. Ports bitjaru/styleseed into a stack-agnostic Claude Code plugin.

### Components

- **3 skills**: design-engine (broad UI work), design-language (mobile dashboard specialty), composition-recipes (page scaffolding)
- **14 commands**: /design-init, /design-skin, /design-tokens, /design-page, /design-pattern, /design-component, /design-copy, /design-flow, /design-feedback, /design-review, /design-lint, /design-a11y, /design-audit, /design-settings-page
- **3 audit agents**: design-reviewer, accessibility-reviewer, ux-auditor
- **6 stack adapters**: tailwind-v4, react-shadcn, astro, sveltekit, obsidian-css, plain-css
- **Bundled data**: 5 skins (toss, stripe, linear, vercel, notion), 5 composition recipes, 6 token files, awesome-design-md catalog (71 brands)

### Attribution

- Adapted from [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT)
- DESIGN.md format from [Google Stitch](https://stitch.withgoogle.com/docs/design-md/overview/)
- Skin fetch from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)

See LICENSE and NOTICE for full attribution.

### Known limitations (v0.x roadmap)

See open issues for monorepo support, adapter migration, and `/design-recipe extract`.
EOF
)"
```

**Phase 10 done.** Plugin is publicly released.

---

## Post-release follow-ups

1. **Update memory** with new project entry for design-engine (path, repo, status, key architecture decisions)
2. **Update MEMORY.md index** with one-line entry pointing to a new `design-engine.md` memory file
3. **Test plugin in `deflocksc-website`** as the first real-world usage; document any issues as new GitHub issues

---

## Reference: full file count

Summary of files this plan creates:

- **Plugin manifest:** 1
- **License/Notice/README:** 3
- **Skills:** 3 SKILL.md files
- **Commands:** 14 .md files
- **Agents:** 3 .md files
- **Adapters:** 6 manifests + ~60 template/component/CSS files (mostly ported from styleseed)
- **Data:** 5 skins + 6 tokens + 5 recipes + 1 catalog = 17 JSON files
- **Docs:** design doc + this implementation plan = 2

Total: ~110 files. Ports ~50 from styleseed, writes ~60 fresh.

Vibecoded scope: achievable in an afternoon for a focused build with Claude doing the heavy lifting on file writes and adapter templates.
