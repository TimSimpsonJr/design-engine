# Design Engine Plugin — Design Doc

**Date:** 2026-05-04
**Status:** Approved, ready for implementation planning
**Authors:** Tim Simpson (with Claude)

## Overview

`design-engine` is a public Claude Code plugin that ports the value of [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT) into a stack-agnostic, audit-capable, skin-driven design system toolkit.

StyleSeed was designed around a fixed React + Tailwind v4 + Vite + shadcn stack. Its substantive value — 69 numbered visual design rules, a typography token system, mobile-dashboard composition recipes, and a workflow of generators + auditors — is mostly stack-agnostic. This plugin extracts that value into a Claude Code plugin that works across stacks via an adapter system, while preserving the React + shadcn library as one first-class adapter.

### Goals
- Stack-agnostic core (rules, tokens, recipes) usable across web frameworks, Obsidian plugins, and plain CSS projects
- Per-stack adapters for `tailwind-v4`, `react-shadcn`, `astro`, `sveltekit`, `obsidian-css`, `plain-css`
- Clean integration with `superpowers:brainstorming` — design knowledge informs design conversations, configuration is a brainstorming-phase artifact
- Skin system supporting bundled defaults, user-authored skins (project + global), and on-demand fetch from VoltAgent/awesome-design-md
- Audit + lint + a11y tooling that checks semantic compliance against the design rules
- Public plugin with full attribution to bitjaru, Google Stitch (DESIGN.md format), and VoltAgent (awesome-design-md catalog)

### Non-goals (v0)
- Headless CI execution
- Monorepo / multi-stack adapter routing (deferred to v0.x as feature issue)
- Adapter migration (deferred to v0.x as feature issue)
- `/design-recipe extract <url>` automation (deferred to v0.x as feature issue)
- Component library versioning enforcement (adapters provide starter templates; users own them after install)

## Architecture

Three layers:

- **Knowledge layer** — auto-firing skills carry design rules into Claude's context when relevant
- **Action layer** — slash commands run wizards, generators, and audits
- **Artifact layer** — durable per-project config (`.design-rules/config.json`, `theme.css`, tokens, conventions block) records design decisions and is read by both Claude and the plugin's own commands

The plugin integrates with `superpowers:brainstorming` by treating `/design-init` as a design-decision-capture wizard (analogous to brainstorming's design doc) rather than implementation. After `/design-init` runs once per project, subsequent brainstorming sessions auto-load the captured config and skip setup prompts.

## Components

### Repository structure

```
design-engine/
├── .claude-plugin/plugin.json
├── README.md                          ← attribution to bitjaru/styleseed, Google Stitch, VoltAgent
├── LICENSE                            ← MIT
├── NOTICE                             ← styleseed MIT + porting note
├── skills/
│   ├── design-engine/SKILL.md         ← from CLAUDE.md, broad UI trigger
│   ├── design-language/SKILL.md       ← from DESIGN-LANGUAGE.md, narrow mobile-dashboard trigger
│   └── composition-recipes/SKILL.md   ← rule 63, narrow page-scaffolding trigger
├── commands/
│   ├── design-init.md                 ← interactive wizard, runs once per project
│   ├── design-skin.md                 ← swap palette (4-source lookup) + install global skin
│   ├── design-tokens.md               ← list/add/update individual tokens
│   ├── design-page.md                 ← scaffold page using recipe (--recipe flag for override)
│   ├── design-pattern.md              ← compose UI pattern
│   ├── design-component.md            ← generate primitive
│   ├── design-copy.md                 ← microcopy generator
│   ├── design-flow.md                 ← user flow design
│   ├── design-feedback.md             ← loading/error/empty states
│   ├── design-review.md               ← invokes design-reviewer agent (--fix flag for retrofit)
│   ├── design-lint.md                 ← fast pattern-based lint (no agent)
│   ├── design-a11y.md                 ← invokes accessibility-reviewer agent
│   ├── design-audit.md                ← invokes ux-auditor agent
│   └── design-settings-page.md        ← scaffold runtime settings UI per active adapter
├── agents/
│   ├── design-reviewer.md             ← rule compliance check, --fix mode for refactor
│   ├── accessibility-reviewer.md      ← WCAG AA + touch target + focus ring
│   └── ux-auditor.md                  ← Nielsen heuristics
├── adapters/
│   ├── tailwind-v4/                   ← Base CSS layer (Tailwind v4 only)
│   ├── react-shadcn/                  ← Extends tailwind-v4, FULL component library port
│   ├── astro/                         ← Extends tailwind-v4, fresh .astro templates
│   ├── sveltekit/                     ← Extends tailwind-v4, fresh .svelte templates
│   ├── obsidian-css/                  ← Standalone, Obsidian theme + DOM patterns
│   └── plain-css/                     ← Standalone, vanilla CSS
└── data/
    ├── skins/                         ← 5 bundled: toss, stripe, linear, vercel, notion
    ├── tokens/                        ← 6 JSON: colors, typography, spacing, radii, shadows, motion
    ├── recipes/                       ← 5 markdown: saas, ecommerce, fintech, social, productivity
    └── awesome-design-md-index.json   ← catalog of fetchable brand names (pinned at release)
```

### Skill triggers

| Skill | Source | Trigger | Role |
|---|---|---|---|
| `design-engine` | CLAUDE.md (adapted) | Broad — any UI/component/styling work | The always-on engine reference. Tokens, patterns, prohibitions, a11y, color hierarchy. Loads `.design-rules/config.json` to know active project state. |
| `design-language` | DESIGN-LANGUAGE.md | Narrow — data-dense / dashboard / KPI / fintech / chart work | The 69 mobile-dashboard rules. Layers on top of `design-engine` when the work is dashboard-shaped. |
| `composition-recipes` | DESIGN-LANGUAGE.md rule 63 | Narrow — "new page", "scaffold", "section structure" | The 5 app-type page recipes. |

Each skill's frontmatter includes negative triggers ("do not use for backend, API, database, build config, tests, or non-UI code") to prevent firing during non-UI brainstorming sessions.

### Adapter capabilities (manifest schema)

```json
{
  "name": "sveltekit",
  "extends": "tailwind-v4",
  "theme": { "targetPath": "src/lib/styles/" },
  "components": { "targetPath": null },
  "scaffold": { "available": false },
  "templates": { "page": "+page.svelte", "component": "*.svelte" },
  "settingsPage": { "writeCapable": true, "devGate": "import.meta.env.DEV", "routePath": "/__design" },
  "cursorRules": true
}
```

`extends` resolution: shallow merge, child wins per top-level key, except `templates` which is keyed-merge.

## Data flow

### Lifecycle 1: New project with brainstorming

```
User: "let's build a fintech dashboard"
  ↓
brainstorming skill fires (process driver)
design-engine skill fires (UI work detected)
design-engine reads .design-rules/config.json → not found
design-engine notes "no design system initialized"
  ↓
brainstorming asks clarifying questions → reaches look/feel
design-engine suggests: "want to run /design-init to capture design decisions?"
  ↓
User: /design-init
Wizard runs (inside brainstorming):
  Step 1: app type           → fintech
  Step 2: brand color        → #2563EB
  Step 3: skin               → stripe (or awesome-design-md fetch)
  Step 4: font               → Inter
  Step 5: stack adapter      → auto-detect: tailwind-v4 + sveltekit, confirm
  Step 6: settings page?     → asks user (yes/no)
Wizard writes:
  src/lib/styles/theme.css        (adapter: tailwind-v4 base + sveltekit)
  src/lib/styles/{fonts,base,index}.css
  .design-rules/skins/stripe.json (cached)
  .design-rules/config.json       (marker: skin=stripe, adapter=sveltekit, recipe=fintech)
  CLAUDE.md (conventions block appended)
  .cursorrules
  src/routes/__design/+page.svelte (if settings page = yes)
  ↓
brainstorming continues with config in context
brainstorming writes design doc referencing artifacts
brainstorming → writing-plans → implementation plan with /design-page steps
  ↓
Execution phase:
  /design-page Dashboard "main fintech overview"
  → reads .design-rules/config.json (recipe=fintech, adapter=sveltekit)
  → loads composition recipe (rule 63 fintech variant)
  → uses sveltekit adapter's templates/+page.svelte
  → outputs src/routes/+page.svelte with Hero + KPI grid + chart + transactions list
```

### Lifecycle 2: Existing project, new feature

Marker present. design-engine loads config silently. No `/design-init` suggestion. Brainstorming proceeds with engine context, hands off to writing-plans, execution proceeds with config-driven commands.

### Lifecycle 3: Skin swap mid-project

```
User: /design-skin linear
  ↓
4-source lookup:
  1. .design-rules/skins/linear.json → not cached
  2. ~/.design-rules/skins/linear.json → not in user global
  3. plugin's data/skins/linear.json → found (bundled)
  4. (skipped — found at step 3)
Adapter writes new palette to theme.css (palette swap, structure unchanged)
.design-rules/config.json updated: skin=linear
```

### Lifecycle 4: awesome-design-md fetch

```
User: /design-skin airbnb
  ↓
4-source lookup falls through to step 4
Check awesome-design-md-index.json → "airbnb" present
Fetch https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/airbnb/DESIGN.md
Parse palette (primary, secondary, text, background)
Write to .design-rules/skins/airbnb.json (cache)
Adapter writes palette to theme.css
.design-rules/config.json updated: skin=airbnb
```

### Lifecycle 5: Audit (with retrofit-fix flow)

```
User: /design-review src/routes/+page.svelte
  ↓
/design-review command invokes design-reviewer agent
Agent reads file + adapter manifest + .design-rules/config.json
Agent applies design-engine + design-language rules
Agent returns structured report: violations + line numbers + suggested fixes

User: /design-review src/routes/+page.svelte --fix
  ↓
Same agent in fix mode: proposes Edit operations to address violations
User reviews diff, accepts or rejects
```

### Lifecycle 6: Retrofit existing project

```
User: /design-init (in existing project)
  ↓
Wizard detects existing files (theme.css, tokens, palette)
Offers three modes:
  A. Extract current palette as custom skin (default if palette detected)
  B. Replace with bundled or awesome-design-md skin
  C. Bring-your-own (don't write theme.css; install knowledge only)
  ↓
Mode A: reads existing CSS → builds .design-rules/skins/<projectname>.json
Mode B: full palette swap
Mode C: marker only, no theme files written
  ↓
Iterate: /design-review src/ for compliance report
        /design-review <file> --fix for guided refactor
        /design-a11y src/ for a11y auto-fix
        /design-lint src/ for fast lint check
```

## Specifications

### Adapter detection rules

- `react-shadcn`: `package.json` has `react` + (`tailwindcss` v4 or `@tailwindcss/vite`) + (`vite` or `next`)
- `astro`: `astro.config.{mjs,ts}` exists
- `sveltekit`: `svelte.config.{js,ts}` exists + `package.json` has `@sveltejs/kit`
- `obsidian-css`: `manifest.json` with `id` field at root + `main.ts`/`main.js` + `package.json` has `obsidian` dep
- `plain-css`: explicit user choice only (no auto-default)

Multiple matches → wizard surfaces all signals, user picks. Zero matches → wizard prompts user with full adapter list.

Detection is lockfile-agnostic: checks `package.json` contents, not `node_modules/`.

### Skin lookup (4-source order)

1. Project's `.design-rules/skins/<name>.json` (user-authored or previously cached)
2. User's `~/.design-rules/skins/<name>.json` (global, cross-project)
3. Plugin's bundled `data/skins/<name>.json`
4. awesome-design-md fetch (cache-on-success to project's `.design-rules/skins/`)

### Recipe lookup (3-source order)

1. Project's `.design-rules/recipes/<name>.json`
2. User's `~/.design-rules/recipes/<name>.json`
3. Plugin's bundled `data/recipes/<name>.md`

### Skin JSON schema (Stripe-flavored example)

```json
{
  "name": "stripe",
  "version": 1,
  "source": "bundled",
  "colors": {
    "light": {
      "brand": "#635BFF",
      "primary": "#0A2540",
      "destructive": "#DF1B41",
      "success": "#00A896",
      "warning": "#D97706",
      "info": "#3B82F6",
      "background": "#FAFAFA",
      "card": "#FFFFFF",
      "foreground": "#2A2A2A",
      "text-secondary": "#6A6A6A",
      "text-tertiary": "#7A7A7A",
      "text-disabled": "#9B9B9B",
      "border": "#E8E6E1"
    },
    "dark": {
      "brand": "#9B8BFF",
      "primary": "#F8FAFC",
      "destructive": "#F87171",
      "success": "#34D399",
      "warning": "#FBBF24",
      "info": "#60A5FA",
      "background": "#0A0E1A",
      "card": "#141826",
      "foreground": "#E8E6E1",
      "text-secondary": "#A1A1AA",
      "text-tertiary": "#71717A",
      "text-disabled": "#52525B",
      "border": "#27272A"
    }
  },
  "fonts": { "primary": "Inter", "mono": "DM Mono" }
}
```

Compliance with styleseed principles: no pure black, paired light/dark blocks, 5-level text hierarchy, single accent (`brand`).

### Marker schema (`.design-rules/config.json`)

```json
{
  "version": "0.1.0",
  "adapter": "sveltekit",
  "skin": "stripe",
  "recipe": "saas",
  "font": "Inter",
  "mode": "fresh",
  "settingsPage": true,
  "createdAt": "2026-05-04T14:32:00Z",
  "lastInitVersion": "0.1.0"
}
```

`mode` values: `fresh` | `retrofit-extract` | `retrofit-replace` | `retrofit-byo`.

### Recipe schema (matching rule 63 SaaS recipe)

```json
{
  "name": "saas",
  "version": 1,
  "sections": [
    { "type": "hero-card", "props": { "metric": "primary-revenue", "trend": true } },
    { "type": "kpi-grid", "props": { "columns": 4, "items": ["mrr", "active-users", "churn", "growth"] } },
    { "type": "chart-card", "props": { "title": "Revenue Trend", "periods": ["1W", "1M", "3M"] } },
    { "type": "progress-section", "props": { "title": "Goal Progress" } },
    { "type": "list-section", "props": { "title": "Recent Activity", "maxItems": 4 } }
  ]
}
```

### Token JSON files

`data/tokens/{colors,typography,spacing,radii,shadows,motion}.json` — flat key-value source-of-truth for each token category, framework-agnostic. Skins reference token names; adapters translate token names to stack-specific output (CSS variables, Tailwind theme directive, Obsidian `--var`, etc.).

### Settings page write mechanism (per adapter)

| Adapter | Mechanism | Dev gate |
|---|---|---|
| `react-shadcn` | Vite plugin exposes `POST /__design/api/tokens` writing theme.css | `import.meta.env.DEV` |
| `astro` | Integration hook in `astro.config.mjs` runs only in dev | dev-only integration |
| `sveltekit` | Dev-only `+server.ts` endpoint | `import.meta.env.DEV` |
| `obsidian-css` | Vault API via plugin code | always-on (Obsidian convention) |
| `plain-css` | Read-only, returns CSS snippet for manual paste | n/a |

### Version migration rule

Plugin checks `config.json:version` against own version on each invocation:
- Major version bump → required migration step (prompt user)
- Minor → silent
- Patch → silent

### awesome-design-md catalog freshness

Pinned at plugin release. New brands added upstream require plugin update to appear in the bundled catalog. Manual fetch by exact name still works regardless (`/design-skin <unknown-name>` falls through to network fetch attempt).

### License compliance for ported components

Each `.tsx` file in the `react-shadcn` adapter that's ported from styleseed retains its original MIT header and adds a porting note:

```tsx
// Originally from bitjaru/styleseed (MIT) — see /LICENSE for full attribution.
// Ported to design-engine plugin under MIT.
```

### Generation conflicts

`/design-page` and similar generators confirm before overwriting existing files. Default behavior: don't overwrite — append suffix (`<name>-2.svelte`) or skip with user prompt.

## Testing strategy

### Plugin structure validation

- `plugin-dev:plugin-validator` agent on every commit before push
- JSON schema validation on bundled data files

### Skill trigger validation

Manual dry-run brainstorm sessions in scratch project for each prompt category:

| Skill | Should fire | Should NOT fire |
|---|---|---|
| `design-engine` | "build a profile component", "edit theme.css", "design a dashboard layout", "review this UI file" | "fix the auth API", "refactor the database schema", "write tests for the parser" |
| `design-language` | "build a fintech dashboard", "design a KPI grid", "lay out an analytics screen" | "build a marketing landing page", "blog post styling", "iOS settings screen" |
| `composition-recipes` | "scaffold a new dashboard page", "what's the structure for a fintech screen" | general UI work without "page" or "scaffold" terms |

### End-to-end lifecycle smoke tests

One test per lifecycle from §3, executed manually on real or scratch projects.

### Adapter output validation

For each of the 6 adapters, run `/design-init` in a fresh project and verify:
- Files written to expected paths (per manifest)
- `theme.css` (or equivalent) contains both light and dark blocks
- Conventions block appended cleanly to CLAUDE.md
- `.design-rules/config.json` marker valid

### Real-project smoke tests

- `deflocksc-website` (Astro + Tailwind v4) → `astro` adapter
- `callyall` (SvelteKit + Tailwind v4) → `sveltekit` adapter
- `recap` or `obsidian-link-ingest` (Obsidian plugin) → `obsidian-css` adapter
- Scratch React + Vite project → `react-shadcn` adapter

### Pre-release checklist

- README has clear attribution (bitjaru, Google Stitch, VoltAgent)
- LICENSE/NOTICE files present and accurate
- All ported `.tsx` files in `react-shadcn` adapter retain MIT headers + porting note
- No leftover styleseed-internal references (e.g., `/ss-setup` mentions in skill bodies)
- All 14 commands have working frontmatter and argument hints
- All 3 agents return structured output (not freeform text)
- Plugin validator passes
- Public marketplace metadata complete

## Out of scope (post-launch feature issues)

To be filed when GitHub repo is created:

1. **Monorepo / multi-stack adapter routing** — adapter-per-package or adapter-per-path mapping
2. **Adapter migration** — `/design-init --migrate` flag to swap adapter mid-project
3. **`/design-recipe extract <url>`** — agent that fetches a page, identifies sections, produces a recipe JSON; may also extract reusable components alongside the recipe (research needed)

## Attribution

- **bitjaru/styleseed** — original MIT-licensed design system that this plugin adapts
- **Google Stitch** — DESIGN.md format inventor
- **VoltAgent/awesome-design-md** — community catalog of brand DESIGN.md files used by skin fetch flow

All attribution surfaced in README, plugin.json, LICENSE, and NOTICE.
