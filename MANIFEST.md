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
      fonts.css                                    Body rule consumes `--font-primary` via var(); managed @import block delimited by markers
      index.css                                    Top-level CSS entrypoint that aggregates the others
      theme.css                                    Token declarations including `--font-primary` (:root + .dark blocks)
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
      settings-page.tsx                            Legacy snippet-mode token editor (kept for reference; direct mode uses files below)
      theme-io.ts                                  Surgical theme.css parser/writer; runs in user project as Vite plugin server-side helper
      vite-plugin-design-engine.ts                 Dev-only Vite plugin owning /__design/* (HTML + JSON API)
      __design-page.html                           Settings page HTML shell with token-driven CSS
      __design-page.ts                             Settings page logic (vanilla TS, safe DOM, autosave with debounce)
  astro/                                       Astro + Tailwind v4 adapter
    manifest.json
    README.md
    templates/
      component.astro                              Single-component template
      page.astro                                   Page-shape template (recipe-driven)
      settings-page.astro                          Legacy snippet-mode token editor (kept for reference; direct mode uses files below)
      theme-io.ts                                  Surgical theme.css parser/writer (copied from react-shadcn template)
      astro-integration-design-engine.ts           Dev-only Astro integration that registers Vite middleware owning /__design/*
      __design-page.html                           Settings page HTML shell (copied from react-shadcn)
      __design-page.ts                             Settings page logic (copied from react-shadcn)
  sveltekit/                                   SvelteKit + Tailwind v4 adapter (Svelte 5 runes)
    manifest.json
    README.md
    templates/
      component.svelte                             Primitive component scaffold
      +page.svelte                                 Page scaffold (recipe-driven)
      settings-page.svelte                         Direct-mode token editor (Svelte 5 runes; light/dark, font picker, autosave)
      theme-io.ts                                  Surgical theme.css parser/writer (server-only, copied verbatim from react-shadcn)
      api-tokens-server.ts                         Dev-gated +server.ts content (GET/POST /__design/api/tokens)
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
  design-init.md                                 Interactive wizard, bootstraps design system in project; supports --migrate for adapter swap (preserves skin/recipe/font/tokens)
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
  font-sources.json                              Font-family → source map (google/system/proprietary) used by /design-skin to decide @import
  tokens/{colors,typography,spacing,radii,shadows,motion}.json  Framework-agnostic token sources
  recipes/{saas,ecommerce,fintech,social,productivity}.json     5 page composition recipes (section sequences)

docs/
  plans/
    2026-05-04-design-engine-plugin-design.md    Original plugin design doc (lifecycles, decisions)
    2026-05-04-design-engine-implementation.md   Phased implementation plan (Phases 1-7)
    2026-05-05-design-init-migrate-design.md     Design for /design-init --migrate (issue #2)

tests/                                         Unit tests for theme-io helper template
  package.json                                   Node --test runner config (devDeps: typescript, @types/node)
  theme-io.parse.test.ts                         parseTokens edge cases — comments, strings, nested @media, dark inheritance
  theme-io.write.test.ts                         writeTokens round-trip + comment-safety + missing-var append
  theme-io.fonts.test.ts                         writeFontImports + buildGoogleFontsUrl
  fixtures/*.css                                 7 theme.css and fonts.css fixtures for the above

LICENSE                                        MIT (own work)
NOTICE                                         Attribution to bitjaru/styleseed (MIT) + skin catalog source
README.md                                      User-facing intro, quick start, commands/skills/adapters reference
.gitignore                                     Standard ignores
```

## Key Relationships

**Skin → adapter → theme.css.** Skin JSON (`data/skins/<name>.json`) holds palette + fonts. `/design-skin` resolves a skin via 4-source lookup (project cache → user global → bundled → awesome-design-md fetch), then writes its values into the active adapter's `theme.css`. The 5 bundled skins now specify accurate upstream fonts: Vercel→Geist, Stripe→SF Pro Display (sohne-var fallback), Toss→Pretendard. Linear and Notion stay on Inter (closest available match for their upstream specs).

**Skin font value vs. fonts.css consumption.** Skin sets `--font-primary` in `theme.css` via `/design-skin` and `/design-settings-page`. `fonts.css`'s body rule consumes `var(--font-primary)`, and `/design-skin` now also rewrites the managed `@import` block in `fonts.css` based on `data/font-sources.json` — `type: "google"` fonts get an `@import`; `system`/`proprietary`/unknown fonts do not (browser falls back via the variable's fallback chain).

**Adapter inheritance.** `react-shadcn`, `astro`, `sveltekit` all declare `extends: "tailwind-v4"` in their manifests, meaning their settings-page generation reads from both the framework adapter's templates and tailwind-v4's theme files.

**Settings-page mode (`writeCapable`).** Per-adapter manifest field declares whether the settings UI can write back to disk. Enum: `"direct" | "snippet" | "none"`. Current values: `react-shadcn`, `astro`, `sveltekit`, and `obsidian-css` are `"direct"` (live write-back — react-shadcn via dev-only Vite plugin in `templates/vite-plugin-design-engine.ts` + `theme-io.ts`; astro via dev-only Astro integration through `astro:server:setup`; sveltekit via dev-only `+server.ts` endpoint at `/__design/api/tokens`; obsidian-css via the Obsidian PluginSettingTab API). `plain-css` is `"snippet"` (copy/paste output — no dev server). `tailwind-v4` is `"none"` (base adapter, no settings page).

**Adapter migration (`/design-init --migrate`).** Switches a project from one web adapter to another while preserving skin/recipe/font/customized-tokens. Out of scope: obsidian-css migration (settings tab is too fragile to move automatically); generating new settings-page artifacts (user runs `/design-settings-page` separately); auto-reverting old build-config patches (always manual). Cleanup uses `oldArtifacts - newArtifacts` set difference so shared files (e.g., `theme-io.ts` between react-shadcn and astro) survive overwrite. Old theme files are never auto-deleted because `theme-io`'s `writeTokens()` only preserves user-added unmanaged CSS in-place — they always land in a manual-cleanup list. Adds optional `migratedAt` and `migratedFrom` fields to `.design-rules/config.json`.

**styleseed porting.** All `react-shadcn/components/ui/*.tsx` and `react-shadcn/components/patterns/*.tsx` files retain their original `bitjaru/styleseed` MIT header comments and add a porting note. NOTICE file at repo root documents the upstream attribution.

**Composition recipes feed `/design-page`.** `data/recipes/*.json` declare ordered section sequences (e.g., fintech: Hero + KPI grid + chart + transactions list). `/design-page` reads the active recipe from `.design-rules/config.json` (created in user projects by `/design-init`) and the active adapter's `templates/page.*` to scaffold the page.

**The plugin is static; user-project state lives in `.design-rules/`.** `/design-init` writes `.design-rules/config.json` (skin, adapter, recipe, settingsPage flag) into the user's project. All subsequent commands read that file to know the active config. Skin caches live at `.design-rules/skins/`.
