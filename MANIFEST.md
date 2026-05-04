# MANIFEST

Structural map of `design-engine`. Regenerated before PR merge.

## Stack

Static Claude Code plugin — no build, no runtime. Distributed as a directory of skills, slash commands, audit agents, adapter templates, and JSON data. Adapter targets: Tailwind v4, React + shadcn, Astro, SvelteKit, Obsidian CSS, plain CSS. Ports `bitjaru/styleseed` (MIT) into Claude Code plugin form.

## Structure

```
.claude-plugin/
  plugin.json                                  Plugin manifest (name, version, keywords, attribution)
  marketplace.json                             Single-plugin self-marketplace declaration

adapters/                                      Stack-specific templates + theme assets
  tailwind-v4/                                 Base layer that other adapters extend
    manifest.json                                Adapter capabilities + paths
    README.md                                    Adapter usage notes
    theme/
      base.css                                     Global element resets, typography rules, a11y utilities
      fonts.css                                    @font imports + body font-family declaration
      index.css                                    Top-level CSS entrypoint that aggregates the others
      theme.css                                    Token declarations (:root + .dark blocks)
  react-shadcn/                                React + Vite + Tailwind v4 + shadcn adapter
    manifest.json                                Capabilities, settingsPage config, target paths
    README.md                                    Adapter notes + porting attribution
    components/
      ui/*.tsx                                    32 shadcn primitives (Button, Card, Input, Dialog, ...)
      patterns/*.tsx                              16 composed patterns (HeroCard, ChartCard, ListItem, ...)
    scaffold/                                    One-shot Vite project skeleton (vite.config.ts, package.json, tsconfig.json, index.html, postcss.config.mjs)
    templates/
      component.tsx                                Single-component template
      page.tsx                                     Page-shape template (recipe-driven)
      pattern.tsx                                  Pattern-shape template
      settings-page.tsx                            Runtime token editor (currently snippet-only)
  astro/                                       Astro + Tailwind v4 adapter
    manifest.json
    README.md
    templates/{component.astro, page.astro, settings-page.astro}
  sveltekit/                                   SvelteKit + Tailwind v4 adapter (Svelte 5 runes)
    manifest.json
    README.md
    templates/{component.svelte, +page.svelte, settings-page.svelte}
  obsidian-css/                                Obsidian plugin theme adapter
    manifest.json
    README.md
    theme/styles.css                             Obsidian CSS variables
    templates/settings-tab.ts                    PluginSettingTab template (direct write-back)
  plain-css/                                   Vanilla HTML+CSS drop-in
    manifest.json
    README.md
    theme/theme.css
    templates/{page.html, settings-page.html}    Static settings page (snippet-only)

skills/                                        Auto-loading rule sets
  design-engine/SKILL.md                         Token system, color hierarchy, prohibitions, a11y, pattern catalog (broad UI work)
  design-language/SKILL.md                       69 numbered visual rules for mobile dashboards, KPIs, fintech, charts
  composition-recipes/SKILL.md                   5 page-shape templates for new-page scaffolding

commands/                                      Slash command implementations
  design-init.md                                 Interactive wizard, bootstraps design system in project
  design-skin.md                                 Swap palette + fonts (4-source skin lookup); save current as named skin
  design-tokens.md                               List/add/update/remove individual tokens
  design-settings-page.md                        Scaffold runtime settings UI per active adapter
  design-page.md                                 Scaffold page using active recipe + adapter
  design-pattern.md                              Generate composed UI pattern
  design-component.md                            Generate primitive component
  design-copy.md                                 Generate UX microcopy (text only)
  design-flow.md                                 Design user flows + nav structure
  design-feedback.md                             Add loading/error/empty states to existing component
  design-review.md                               Compliance review (--fix applies edits)
  design-lint.md                                 Fast pattern-based lint (regex grep)
  design-a11y.md                                 Accessibility audit (auto-fixes mechanical issues)
  design-audit.md                                UX audit (Nielsen heuristics)

agents/                                        Audit agents invoked by /design-* commands
  design-reviewer.md                             Component/page review against design rules
  accessibility-reviewer.md                      WCAG AA review (touch targets, focus, contrast)
  ux-auditor.md                                  Usability heuristic review

data/                                          Static catalogs + token JSON
  awesome-design-md-index.json                   Pinned catalog of 70 brands fetchable from VoltAgent/awesome-design-md
  skins/{toss,stripe,linear,vercel,notion}.json  5 bundled skins (colors.light, colors.dark, fonts)
  tokens/{colors,typography,spacing,radii,shadows,motion}.json  Framework-agnostic token sources
  recipes/{saas,ecommerce,fintech,social,productivity}.json     5 page composition recipes (section sequences)

docs/
  plans/
    2026-05-04-design-engine-plugin-design.md    Original plugin design doc (lifecycles, decisions)
    2026-05-04-design-engine-implementation.md   Phased implementation plan (Phases 1-7)

LICENSE                                        MIT (own work)
NOTICE                                         Attribution to bitjaru/styleseed (MIT) + skin catalog source
README.md                                      User-facing intro, quick start, commands/skills/adapters reference
.gitignore                                     Standard ignores
```

## Key Relationships

**Skin → adapter → theme.css.** Skin JSON (`data/skins/<name>.json`) holds palette + fonts. `/design-skin` resolves a skin via 4-source lookup (project cache → user global → bundled → awesome-design-md fetch), then writes its values into the active adapter's `theme.css`. The 5 bundled skins currently all specify `Inter` regardless of upstream — bug fixed in feat/settings-page-write-back.

**Skin font value vs. fonts.css consumption.** Skin sets `--font-primary` in `theme.css` via `/design-skin` and `/design-settings-page`. But `adapters/tailwind-v4/theme/fonts.css` hardcodes `body { font-family: 'Inter', ...; }` instead of consuming the variable — so font edits never take effect. Fixed in feat/settings-page-write-back (body rule consumes `var(--font-primary)`; managed `@import` block).

**Adapter inheritance.** `react-shadcn`, `astro`, `sveltekit` all declare `extends: "tailwind-v4"` in their manifests, meaning their settings-page generation reads from both the framework adapter's templates and tailwind-v4's theme files.

**Settings-page mode (`writeCapable`).** Per-adapter manifest field declares whether the settings UI can write back to disk: `"snippet"` (web today — copy/paste only), `true` (Obsidian — direct via Settings API), `false` (tailwind-v4 base, no settings page). Migration to enum `"none" | "snippet" | "direct"` in feat/settings-page-write-back, with web adapters flipping to `"direct"`.

**styleseed porting.** All `react-shadcn/components/ui/*.tsx` and `react-shadcn/components/patterns/*.tsx` files retain their original `bitjaru/styleseed` MIT header comments and add a porting note. NOTICE file at repo root documents the upstream attribution.

**Composition recipes feed `/design-page`.** `data/recipes/*.json` declare ordered section sequences (e.g., fintech: Hero + KPI grid + chart + transactions list). `/design-page` reads the active recipe from `.design-rules/config.json` (created in user projects by `/design-init`) and the active adapter's `templates/page.*` to scaffold the page.

**The plugin is static; user-project state lives in `.design-rules/`.** `/design-init` writes `.design-rules/config.json` (skin, adapter, recipe, settingsPage flag) into the user's project. All subsequent commands read that file to know the active config. Skin caches live at `.design-rules/skins/`.
