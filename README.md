# design-engine

> Stack-agnostic design system toolkit for Claude Code. Adapted from [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT).

A Claude Code plugin that gives any project a coherent, audit-able design system: tokens, color hierarchy, typography rules, and a catalog of composed UI patterns — wired into commands that generate code in your stack and agents that review code against the rules. Skills auto-load the rules whenever you touch styling or UI work, so the design system is enforced without ceremony.

## Quick start

```bash
/plugin install TimSimpsonJr/design-engine
```

Then in any project:

```
/design-init
```

The init wizard detects your stack, picks an adapter (`react-shadcn`, `astro`, `sveltekit`, `obsidian-css`, `plain-css`), lets you choose a starting skin and composition recipe, and writes `.design-rules/config.json` plus the bootstrap files for your stack.

## What it does

**Skills auto-load design rules.** When you start UI, component, or styling work, the `design-engine` skill loads the token system, color hierarchy, prohibitions, accessibility rules, and pattern catalog. The `design-language` skill adds 69 numbered visual design rules (mobile dashboard, KPI, fintech, chart conventions). The `composition-recipes` skill provides 5 page-shape templates for new-page scaffolding. Skills compete for attention based on what you're working on; you don't have to invoke them.

**Commands generate and audit.** Generators (`/design-page`, `/design-pattern`, `/design-component`, `/design-copy`, `/design-flow`, `/design-feedback`) produce code that satisfies the active rules in your active stack via the active adapter. Audits (`/design-review`, `/design-lint`, `/design-a11y`, `/design-audit`) run agents over your code and surface violations — `/design-review --fix` and `/design-a11y` can auto-apply mechanical fixes.

**Adapters cover the common stacks.** A `react-shadcn` adapter ships 32 component primitives and 16 composed patterns ported from styleseed; `astro` and `sveltekit` adapters provide framework-native templates; `obsidian-css` and `plain-css` cover plugin/static use cases. All extend `tailwind-v4` for the base token system.

**Skin system + brand catalog.** 5 bundled skins (Toss, Stripe, Linear, Vercel, Notion) plus 70 brand palettes fetchable on demand from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md). Swap in seconds with `/design-skin <name>`.

## Skills

| Skill | Triggers on | Provides |
|---|---|---|
| `design-engine` | UI / component / styling work | Token system, color hierarchy, prohibitions, a11y rules, pattern catalog |
| `design-language` | Mobile dashboard / KPI / fintech / chart work | 69 numbered visual design rules |
| `composition-recipes` | New page scaffolding | 5 page composition recipes |

## Commands

### Setup

- `/design-init` — interactive wizard, bootstraps design system in project
- `/design-skin <name>` — swap palette (4-source lookup: project → user global → bundled → awesome-design-md)
- `/design-tokens <action>` — list/add/update/remove individual tokens
- `/design-recipe extract <url>` — extract a recipe from a URL (HTML + screenshot via Chrome MCP)
- `/design-settings-page` — scaffold runtime settings UI

### Generators

- `/design-page <name>` — scaffold page using active recipe + adapter
- `/design-pattern <type>` — generate composed UI pattern
- `/design-component <name>` — generate primitive component
- `/design-copy <context>` — generate UX microcopy
- `/design-flow <name>` — design user flows
- `/design-feedback <path>` — add loading/error/empty states

### Audits

- `/design-review <path>` — compliance review (use `--fix` to auto-apply)
- `/design-lint <path>` — fast pattern-based lint
- `/design-a11y <path>` — accessibility audit (auto-fixes mechanical issues)
- `/design-audit <path>` — UX audit (Nielsen heuristics)

## Adapters

| Adapter | Target stack | Notes |
|---|---|---|
| `tailwind-v4` | Tailwind v4 base | Foundation for framework adapters |
| `react-shadcn` | React + Vite + Tailwind v4 + shadcn | Full component library (32 primitives + 16 patterns), Vite scaffold |
| `astro` | Astro + Tailwind v4 | `.astro` templates, extends tailwind-v4 |
| `sveltekit` | SvelteKit + Tailwind v4 | `.svelte` templates with Svelte 5 runes |
| `obsidian-css` | Obsidian plugin | Theme variables + settings tab template |
| `plain-css` | Vanilla HTML+CSS | Drop-in for static sites and prototypes |

## Skins

5 bundled (Toss, Stripe, Linear, Vercel, Notion) + 70 brands fetchable from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) on demand.

Run `/design-skin list` to see available, `/design-skin <name>` to apply.

## Composition recipes

5 page-shape templates: `saas`, `ecommerce`, `fintech`, `social`, `productivity`. Picked during `/design-init`, override per-page with `/design-page --recipe=<name>`.

## Settings page

Optional runtime UI for tweaking tokens (color pickers, font selectors). Generated by `/design-init --with-settings` or `/design-settings-page`. Currently produces copy/download CSS output; live two-way write-back is a v0.x feature.

## Audits

- `/design-review`: agent reads code, applies all 69 design-language rules + design-engine prohibitions, returns structured violation report. With `--fix`, proposes Edit operations.
- `/design-lint`: fast Grep-based pattern check (off-table font sizes, hardcoded `#000`, wrong margin/padding utilities, missing `data-slot`).
- `/design-a11y`: WCAG AA review (touch targets, focus rings, contrast, alt text, semantic HTML).
- `/design-audit`: Nielsen heuristics + mobile UX patterns.

## Architecture

Per-project state in `.design-rules/config.json` (active adapter, skin, recipe, font). Global cross-project skins in `~/.design-rules/skins/`. Plugin-bundled defaults in `data/`.

See `docs/plans/2026-05-04-design-engine-plugin-design.md` for the full architectural specification.

## Attribution

This plugin adapts content from:

- **[bitjaru/styleseed](https://github.com/bitjaru/styleseed)** (MIT) — original design system this plugin is based on. Components in `adapters/react-shadcn/`, design rules in `skills/`, bundled skins in `data/skins/`, generator/audit workflows in `commands/`.
- **[Google Stitch](https://stitch.withgoogle.com/docs/design-md/overview/)** — DESIGN.md format inventor
- **[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** — community brand palette catalog used by `/design-skin`

Full attribution in `LICENSE` and `NOTICE`.

## License

MIT. See `LICENSE` and `NOTICE`.

## Status

v0.1.0 — initial public release. Roadmap (filed as GitHub issues after release):

- Monorepo / multi-stack adapter routing
- Adapter migration via `/design-init --migrate`
- `/design-recipe extract <url>` agent
- Settings page live two-way write-back via Vite plugin
