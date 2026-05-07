# MANIFEST

Structural map of `design-engine`. Regenerated before PR merge.

## Stack

Static Claude Code plugin — no build, no runtime. Distributed as a directory of skills, slash commands, audit agents, adapter templates, and data files. Adapter targets: Tailwind v4, React + shadcn, Astro, SvelteKit, Obsidian CSS, plain CSS. Ports `bitjaru/styleseed` (MIT) into Claude Code plugin form. Schema contract: DESIGN.md (narrative) + tokens.json (W3C Design Tokens) + register.md (five-section posture).

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
      theme-io.ts                                  Surgical theme.css parser/writer + W3C tokens bridge (readTokensFromCss, writeTokensToCss); runs server-side
      theme-css-parse.ts                           Reverse-parse theme.css into grouped tokens (init derive mode)
      design-md-parse.ts                           DESIGN.md -> tokens.json one-way derivation parser
      design-md-emit.ts                            tokens.json -> DESIGN.md skeleton emitter (full + suggestion modes)
      upgrade-config.ts                            schemaVersion-2 upgrade detection, config migration, runDesignInitUpgrade pipeline
      google-fonts-catalog.ts                      Server-only proxy helper for Google Fonts metadata (TTL cache + single-flight + serve-stale-on-failure)
      vite-plugin-design-engine.ts                 Dev-only Vite plugin owning /__design/* (handleGetTokens/handlePostTokens read/write tokens.json)
      __design-page.html                           Settings page HTML shell with token-driven CSS
      __design-page.ts                             Settings page logic (vanilla TS, W3C token groups, autosave with debounce)
  astro/                                       Astro + Tailwind v4 adapter
    manifest.json
    README.md
    templates/
      component.astro                              Single-component template
      page.astro                                   Page-shape template (recipe-driven)
      settings-page.astro                          Legacy snippet-mode token editor (kept for reference; direct mode uses files below)
      theme-io.ts                                  Surgical theme.css parser/writer (byte-identical copy of react-shadcn template)
      google-fonts-catalog.ts                      Server-only Google Fonts proxy helper (byte-identical copy of react-shadcn template)
      astro-integration-design-engine.ts           Dev-only Astro integration (handleGetTokens/handlePostTokens inlined; parity with react-shadcn)
      __design-page.html                           Settings page HTML shell (copied from react-shadcn)
      __design-page.ts                             Settings page logic (byte-identical copy of react-shadcn template)
  sveltekit/                                   SvelteKit + Tailwind v4 adapter (Svelte 5 runes)
    manifest.json
    README.md
    templates/
      component.svelte                             Primitive component scaffold
      +page.svelte                                 Page scaffold (recipe-driven)
      settings-page.svelte                         Direct-mode token editor (Svelte 5 runes; W3C token groups, autosave)
      theme-io.ts                                  Surgical theme.css parser/writer (server-only, byte-identical copy of react-shadcn)
      google-fonts-catalog.ts                      Server-only Google Fonts proxy helper (byte-identical copy of react-shadcn)
      api-tokens-server.ts                         Dev-gated +server.ts content (handleGetTokens/handlePostTokens inlined)
      api-google-fonts-server.ts                   Dev-gated +server.ts content (GET /__design/api/google-fonts)
  obsidian-css/                                Obsidian plugin theme adapter
    manifest.json
    README.md
    theme/styles.css                             Obsidian CSS variables
    templates/settings-tab.ts                    PluginSettingTab template (W3C token groups, live DOM apply)
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
  design-init.md                                 Interactive wizard; bootstraps DESIGN.md + tokens.json + register.md; supports --migrate, --reset, upgrade path for pre-schemaVersion-2 projects
  design-skin.md                                 Swap palette + fonts (DESIGN.md format); 4-source lookup; save current as named skin; lazy-migrate old JSON skins
  design-tokens.md                               List/add/update/remove tokens in tokens.json; sync subcommand re-derives from DESIGN.md; sync --reverse generates DESIGN.md patch
  design-settings-page.md                        Scaffold runtime settings UI per active adapter
  design-page.md                                 Scaffold page using active recipe + adapter
  design-pattern.md                              Generate composed UI pattern
  design-component.md                            Generate primitive component
  design-copy.md                                 Generate UX microcopy (text only)
  design-flow.md                                 Design user flows + nav structure
  design-feedback.md                             Add loading/error/empty states to existing component
  design-review.md                               Compliance review against DESIGN.md + tokens.json (--fix applies edits)
  design-lint.md                                 Fast pattern-based lint — flags hardcoded values not in tokens.json
  design-a11y.md                                 Accessibility audit (auto-fixes mechanical issues)
  design-audit.md                                UX audit (Nielsen heuristics)
  design-recipe.md                               Extract a recipe from a URL via /design-recipe extract <url>; v1 supports extract subcommand only

agents/                                        Audit agents invoked by /design-* commands
  design-reviewer.md                             Component/page review against design rules
  accessibility-reviewer.md                      WCAG AA review (touch targets, focus, contrast)
  ux-auditor.md                                  Usability heuristic review
  recipe-extractor.md                            Multimodal section-identification agent invoked by /design-recipe extract

data/                                          Static catalogs + bundled design systems
  awesome-design-md-index.json                   Pinned catalog of 70 brands fetchable from VoltAgent/awesome-design-md
  font-sources.json                              Font-family -> source map (google/system/proprietary) used by /design-skin to decide @import
  tokens.json                                    Default W3C Design Tokens template (color, font, radius, shadow, spacing, motion groups)
  design-systems/                                Bundled DESIGN.md files (OD 9-section format)
    stripe/DESIGN.md                               Stripe design system (from awesome-design-md upstream)
    vercel/DESIGN.md                               Vercel design system (from awesome-design-md upstream)
    linear-app/DESIGN.md                           Linear design system (from awesome-design-md upstream)
    notion/DESIGN.md                               Notion design system (from awesome-design-md upstream)
    kami/DESIGN.md                                 Kami design system (from OD upstream)
    toss/DESIGN.md                                 Toss design system (hand-authored, not in upstream)
  craft/                                         Universal craft principles (OD baseline + design-engine layering)
    color.md                                       Color craft rules
    typography.md                                  Typography craft rules
    state-coverage.md                              Loading/empty/error state coverage
    animation-discipline.md                        Motion and animation rules
    accessibility-baseline.md                      Accessibility baseline
    form-validation.md                             Form validation patterns
    rtl-and-bidi.md                                RTL and bidirectional text support
    anti-ai-slop.md                                Anti-AI-slop detection rules
  recipes/{saas,ecommerce,fintech,social,productivity}.json  5 page composition recipes (section sequences)

docs/
  plans/
    2026-05-04-design-engine-plugin-design.md    Original plugin design doc
    2026-05-04-design-engine-implementation.md   Phased implementation plan (Phases 1-7)
    2026-05-04-settings-page-write-back-design.md   Design for runtime settings-page write-back
    2026-05-04-settings-page-write-back-implementation.md   Phased implementation of write-back UI
    2026-05-05-design-init-migrate-design.md     Design for /design-init --migrate
    2026-05-05-design-recipe-extract-design.md   Design for /design-recipe extract <url> agent
    2026-05-05-design-recipe-extract-implementation.md   Phased implementation of /design-recipe extract
    2026-05-05-google-fonts-autocomplete-design.md   Design for live Google Fonts catalog
    2026-05-06-foundation-od-schema-design.md    OD-aligned schema design (DESIGN.md + tokens.json + register.md)
    2026-05-06-foundation-od-schema-plan.md      Phase 5 implementation plan (command rewiring)
    2026-05-06-foundation-od-schema-phase5-handoff.md  Phase 5 session handoff notes

tests/                                         Unit tests for adapter template helpers
  package.json                                   Node --test runner config (devDeps: typescript, @types/node)
  theme-io.parse.test.ts                         parseTokens edge cases -- comments, strings, nested @media, dark inheritance
  theme-io.write.test.ts                         writeTokens round-trip + comment-safety + missing-var append
  theme-io.fonts.test.ts                         writeFontImports + buildGoogleFontsUrl
  theme-io.tokens.test.ts                        W3C tokens bridge -- readTokensFromCss, writeTokensToCss, surgical replacement
  design-md-parse.test.ts                        DESIGN.md -> tokens.json parser tests
  design-md-emit.test.ts                         tokens.json -> DESIGN.md emitter tests
  theme-css-parse.test.ts                        theme.css -> grouped tokens reverse derivation tests
  upgrade-config.test.ts                         detectOldFormat + upgradeConfig unit tests
  design-init-upgrade.test.ts                    runDesignInitUpgrade integration tests (fixture-based)
  vite-plugin-tokens-api.test.ts                 handleGetTokens/handlePostTokens API handler tests
  google-fonts-catalog.parse.test.ts             parseGoogleFontsResponse edge cases
  google-fonts-catalog.fetch.test.ts             createGoogleFontsCatalogFetcher -- TTL, single-flight, serve-stale
  fixtures/                                      Test fixtures (old-project config, theme CSS files)

LICENSE                                        MIT (own work)
NOTICE                                         Attribution to bitjaru/styleseed (MIT) + skin catalog source
README.md                                      User-facing intro, quick start, commands/skills/adapters reference
.gitignore                                     Standard ignores
```

## Key Relationships

**Three-file schema contract.** Every design-engine project produces three files at the project root: `DESIGN.md` (narrative 9-section OD format), `tokens.json` (W3C Design Tokens with `$type`/`$value`), and `.design-rules/register.md` (five-section posture). Derivation is one-way: DESIGN.md -> tokens.json -> theme.css. Each step is lossy by design.

**DESIGN.md -> tokens.json derivation.** `parseDesignMd()` in `templates/design-md-parse.ts` extracts structured tokens from DESIGN.md's Color Palette, Typography, and Component sections. The parser maps OD color names to CSS variable names via a slug table. Reverse direction: `emitDesignMdSkeleton()` in `templates/design-md-emit.ts` generates a DESIGN.md skeleton from tokens.json (used for derive mode and sync --reverse).

**tokens.json -> theme.css derivation.** `writeTokensToCss()` in `templates/theme-io.ts` flattens W3C token groups into CSS custom properties and performs surgical in-place replacement in existing CSS, preserving user-added unmanaged variables and comments. `readTokensFromCss()` reverses this for derive mode.

**Settings page data flow.** All direct-mode adapters (react-shadcn, astro, sveltekit) expose `/__design/api/tokens` endpoints. GET reads `tokens.json` from project root. POST validates W3C shape (every leaf has `$value`), writes `tokens.json`, then regenerates theme.css via `writeTokensToCss(tokens, { existing })`. The browser UI renders dynamic form fields driven by token group structure.

**Adapter inheritance.** `react-shadcn`, `astro`, `sveltekit` all declare `extends: "tailwind-v4"` in their manifests, meaning their settings-page generation reads from both the framework adapter's templates and tailwind-v4's theme files.

**Bundled design systems replace old skin JSON.** `data/design-systems/<slug>/DESIGN.md` files (OD 9-section format) replace the former `data/skins/<name>.json`. Six bundled: stripe, vercel, linear-app, notion, kami, toss. `/design-skin` resolves via 4-source lookup (project cache -> user global -> bundled -> awesome-design-md fetch). Old JSON skins at user/project level are lazy-migrated to DESIGN.md on first use.

**Craft topics feed review agents.** `data/craft/*.md` files contain universal design principles (OD baseline + design-engine layering). Skills declare `od.craft.requires` arrays; `/design-review` assembles the relevant craft files + DESIGN.md + tokens.json as context for the design-reviewer agent.

**Upgrade path.** `runDesignInitUpgrade()` in `templates/upgrade-config.ts` detects pre-schemaVersion-2 configs (missing `schemaVersion` field), stamps DESIGN.md/tokens.json/register.md, merges existing CSS token values (user values take precedence over DESIGN.md-derived values), and bumps config to schemaVersion 2.

**Adapter migration (`/design-init --migrate`).** Switches between web adapters while preserving DESIGN.md, tokens.json, register.md (adapter-agnostic, stay at project root). Theme.css is regenerated at the new adapter's target path via `writeTokensToCss`. Old settings-page artifacts cleaned up via set difference; old theme files land in manual-cleanup list.

**Composition recipes feed `/design-page`.** `data/recipes/*.json` declare ordered section sequences. `/design-page` reads the active recipe from `.design-rules/config.json` and the active adapter's templates to scaffold the page.

**The plugin is static; user-project state lives in `.design-rules/`.** `/design-init` writes `.design-rules/config.json` (skin, adapter, recipe, schemaVersion, themeFile) into the user's project. DESIGN.md, tokens.json at project root. register.md at `.design-rules/register.md`.
