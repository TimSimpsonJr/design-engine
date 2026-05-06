# Foundation: OD-aligned schema + craft layer

**Status:** Draft · 2026-05-06
**Scope:** Issues [#16](https://github.com/TimSimpsonJr/design-engine/issues/16) (shared design contract schema) and [#17](https://github.com/TimSimpsonJr/design-engine/issues/17) (triage 69 design-language rules) from RFC [#23](https://github.com/TimSimpsonJr/design-engine/issues/23).
**Goal:** Adapt nexu-io/open-design's data model into design-engine for **format compatibility**, layer our universal craft principles on top, and add the two design-engine-specific contract files (`tokens.json`, `register.md`) the RFC calls for. Compatibility, not improvement on OD.

---

## 1. Why

The RFC ([#23](https://github.com/TimSimpsonJr/design-engine/issues/23)) splits design work into two products that share a contract: design-engine (codebase enforcer) and a future fork of OD (canvas explorer). The contract is the load-bearing piece. This foundation pass adopts OD's schema for the bundled assets and skill structure so artifacts round-trip between the two products without translation loss when the fork ships.

It also makes the plugin's bundled data more useful in its own right: where today we parse OD-format `DESIGN.md` from upstream into a lossy `{colors, fonts}` JSON, we'll cache it verbatim and read the full 9-section narrative.

## 2. Scope

**In scope:**
- Reorganize `data/` to mirror OD's layout (design-systems, craft, templates).
- Spec `DESIGN.md` (9-section, OD format), `tokens.json` (W3C Design Tokens), `register.md` (5-section taste capture).
- Triage all 69 rules in `skills/design-language/SKILL.md`; layer universal portions into `data/craft/<topic>.md` (OD's 8 topics) or `skills/design-engine/SKILL.md` (universals that don't fit those 8); narrow what remains into `skills/mobile-dashboard/SKILL.md`.
- Update `/design-init`, `/design-skin`, `/design-tokens`, `/design-review`, `/design-lint` to read/write the new contract files. Add reverse-derivation for existing-themed repos.
- Rewire settings page across all 4 adapters to write `tokens.json` (canonical) instead of `theme.css` (derived).

**Out of scope:**
- The OD fork itself (#19), its sync command (#20), advisory UX (#18), extraction/learning subsystem (#21), adapter consolidation (#22).
- OD artifacts irrelevant to codebase enforcement: `prompt-templates/` (media JSONs), `assets/frames/` (device chrome), `apps/daemon/` (OD's runtime infrastructure).
- Changes to non-foundation generation commands beyond a one-line "read DESIGN.md narrative if present" instruction. `/design-page`, `/design-pattern`, `/design-component`, `/design-copy`, `/design-flow`, `/design-feedback`, `/design-audit`, `/design-a11y`, `/design-recipe` keep their current implementations.
- Any modifications to external repos (`dc-v1-onboarding` is reference-only; smoke-tested by the user post-merge).

## 3. Data-model rework

`data/` reorganizes to mirror OD's layout for content compatibility. The `data/` prefix on bundled assets is acknowledged plugin-internal divergence — design-engine is a Claude Code plugin and assets must live under `${CLAUDE_PLUGIN_ROOT}/data/`. User-project artifacts (`DESIGN.md`, `tokens.json`, `register.md`) land at project root, matching OD's user-facing layout.

### Mapping table

| Current | New | Notes |
|---|---|---|
| `data/skins/<name>.json` | `data/design-systems/<od-slug>/DESIGN.md` | OD format, OD slugs (`linear-app` not `linear`, etc.). 4 of 5 pulled verbatim from awesome-design-md upstream; Toss hand-authored. Kami added (so `data/templates/kami-deck.html` has its DESIGN.md). |
| `data/tokens/{colors,typography,spacing,radii,shadows,motion}.json` | `data/tokens.json` (W3C Design Tokens, single file) | **Plugin-only addition** (not in OD). Default starter template stamped on `/design-init`. |
| (new) `data/craft/<topic>.md` | OD's 8 topics by exact slug: `anti-ai-slop`, `accessibility-baseline`, `animation-discipline`, `color`, `form-validation`, `rtl-and-bidi`, `state-coverage`, `typography` | Universal rules from our 69 layered in. |
| (new) `data/templates/<name>.html` | OD's deck templates pulled verbatim: `deck-framework.html`, `kami-deck.html` | OD-imported; awaits a future consuming skill (e.g., `skills/html-ppt/`). Pre-positioning, zero current consumers. |
| `skills/design-language/SKILL.md` (mixed univ + UI-specific) | `skills/mobile-dashboard/SKILL.md` (UI-specific only) | Frontmatter description stays broad ("data-dense mobile-first UI — dashboards, KPI grids, fintech screens, …") to keep triggering on data-dense mobile websites too. |
| `skills/{design-engine,composition-recipes}/SKILL.md` | unchanged, **labeled plugin-only extras** | Acknowledged divergence from OD. |
| `data/recipes/*.json` | unchanged, **plugin-only** | Don't try to mismap to OD's `templates/` (deck HTML starters) or `prompt-templates/` (media JSONs); different artifact types. |
| `data/{awesome-design-md-index,font-sources}.json` | unchanged, **plugin-only helpers** | Discovery + font-import. |

**Plugin-only additions** (RFC-justified, not in OD):
- `tokens.json` (W3C precise tokens, derived one-way from DESIGN.md)
- `register.md` (taste capture, prose-craft pattern)

### Architectural constraints

1. **DESIGN.md → tokens.json is one-way.** Prose rules and behavioral constraints in DESIGN.md don't round-trip from tokens alone. tokens.json is a derived, lossy precise-tokens projection. Edits to narrative happen in DESIGN.md; edits to precise values happen in tokens.json. `/design-tokens sync` re-derives tokens.json from DESIGN.md. `/design-tokens sync --reverse` produces a *suggested* DESIGN.md diff for user review (no auto-merge into prose).

2. **Active DESIGN.md is runtime context.** The active design system's DESIGN.md gets read at runtime by skills (currently `.design-rules/config.json` points at the active skin JSON; new flow: `<project-root>/DESIGN.md` is the active narrative source).

3. **Sidecar support.** OD's skills protocol allows `assets/`, `references/`, `templates/`, `scripts/`, `tests/` subdirs per skill. Structure permits them in `skills/mobile-dashboard/`; none ship today.

## 4. Schema specs

### 4.1. DESIGN.md — 9-section format

Adopted verbatim from awesome-claude-design / OD:

1. **Visual Theme & Atmosphere** — narrative description + key characteristics list
2. **Color Palette & Roles** — primary, secondary/accent, surface/background, neutrals/text, semantic, gradient (subsections optional)
3. **Typography Rules** — font family, hierarchy table, principles, font substitution notes
4. **Component Stylings** — buttons, inputs, cards, etc.
5. **Layout Principles** — grid, spacing rhythm, page structure
6. **Depth & Elevation** — shadows, blur, glass, radius scale
7. **Do's and Don'ts** — bullet list of brand-specific guardrails
8. **Responsive Behavior** — breakpoints, mobile transforms
9. **Agent Prompt Guide** — short instructions for AI consumers

Section numbering is optional in OD-the-format (see `design-systems/default/DESIGN.md` unnumbered vs. `design-systems/airbnb/DESIGN.md` numbered). design-engine **emits numbered** for parser determinism but **accepts both** for round-trip.

### 4.2. tokens.json — W3C Design Tokens spec

Strict W3C compliance ([Design Tokens Community Group draft](https://www.designtokens.org/)):

```json
{
  "color": {
    "$type": "color",
    "brand": { "$value": "#ff385c", "$description": "Rausch coral" },
    "background": {
      "page": { "$value": "#ffffff" },
      "card": { "$value": "#ffffff" }
    }
  },
  "font": {
    "$type": "fontFamily",
    "primary": { "$value": ["Inter", "system-ui", "sans-serif"] }
  },
  "spacing": { "$type": "dimension", "1": { "$value": "4px" }, "2": { "$value": "8px" } }
}
```

Top-level groups: `color`, `font`, `typography` (sizes, weights, line-heights), `spacing`, `radius`, `shadow`, `motion`. Each group sets `$type` once; children inherit. Aliases via `$value: "{color.brand}"` permitted.

**Derivation rule:** DESIGN.md → tokens.json is **one-way and lossy**:
- Section 2 (Color Palette) → `color.*`
- Section 3 (Typography) → `font.*` and `typography.*`
- Section 5 (Layout Principles) → `spacing.*` if explicit values present
- Section 6 (Depth & Elevation) → `radius.*` and `shadow.*`
- Sections 1, 4, 7, 8, 9 → narrative-only, not derived

Anything in DESIGN.md prose that the parser can't extract gets left out of tokens.json (lossy by design).

### 4.3. register.md — 5-section taste capture

```markdown
# Visual Register: <name>

## 1. Color Stance
<temperature, saturation behavior, accent rules, neutral character>

## 2. Spatial Logic
<density, breathing room, asymmetry tendencies, grid relationship>

## 3. Type Behavior
<weight contrast, scale jumps, tracking habits, italic/serif role>

## 4. Composition Moves
<focal restraint, repetition tolerance, hierarchy mechanisms, ornament posture>

## 5. Material Posture
<flatness vs. depth, texture, gloss/matte, photographic vs. illustrative>
```

In foundation: `/design-init` scaffolds an empty template with these 5 headings and a stub note. Population happens later via canvas-side extraction (#21). design-engine reads it if present, treats absence as "no register active."

### 4.4. Schema spec doc

A single `docs/spec.md` (matching OD's filename) with the three formats above. Linked from README. Authoring/parsing reference.

## 5. Rule triage methodology

### 5.1. Classification

Each of the 69 rules in `skills/design-language/SKILL.md` gets one of four primary classifications. A rule may produce material in multiple destinations (HYBRID is common):

| Class | Destination |
|---|---|
| **UNIV** — universal craft principle, fits one of OD's 8 topics | `data/craft/<topic>.md` |
| **UNIV-EXTRA** — universal but doesn't fit OD's 8 | `skills/design-engine/SKILL.md` |
| **UI-DASH** — mobile-dashboard specialty | `skills/mobile-dashboard/SKILL.md` |
| **TOK** — token-expressible values | `data/tokens.json` (defaults) |
| **HYBRID** — splits | Multiple destinations |

### 5.2. Craft layer policy

Each `data/craft/<topic>.md` is structured with **design-engine additions first**, then OD's verbatim block:

```markdown
# craft/color.md

## design-engine principles

### Single accent (from rule 1)
Create unity with a single key color (the brand color, defined by skin).
Key color is used only for active/selected states; everything else is grayscale.

### Status color contract (from rule 4)
Trend up = green, trend down = red, neutral = gray, …

## OD baseline (verbatim from upstream)

<OD's existing craft/color.md content here>
```

Each design-engine addition cites its source rule by number. The "## OD baseline" delimiter makes upstream sync mechanical when the OD fork ships.

### 5.3. Triage deliverable

A single tracking sheet `docs/triage-69-rules.md`:

| Rule # | Title | Primary | Dest(s) | Notes |
|---|---|---|---|---|
| 1 | Color Philosophy | UNIV+TOK | craft/color.md, craft/anti-ai-slop.md, tokens.json | "single accent" → anti-ai-slop; status colors → tokens; specific dot+text combos → mobile-dashboard |
| 2 | Number/Currency Display | UI-DASH+UNIV-EXTRA | mobile-dashboard, design-engine SKILL | Big-number/small-unit ratio is universal but doesn't fit OD's 8 topics |
| … | | | | |

The sheet is committed; future contributors can see where any rule landed and why.

### 5.4. Mobile-dashboard skill rewrite

After universal content is lifted out, what remains in `skills/mobile-dashboard/SKILL.md`:

- Donut chart, gauge, KPI grid rules
- 430px viewport assumption
- Four section types (A/B/C/D layout grammar)
- Mobile-specific scroll, snap, responsive rules
- Page composition checklist (mobile-dashboard variant)

**Frontmatter description stays broad** (per user direction): "data-dense mobile-first UI — dashboards, KPI grids, fintech screens, analytics interfaces, admin panels, chart-heavy layouts" — to keep triggering on data-dense mobile websites generally, not just dashboards.

### 5.5. tokens.json default population

Token-expressible values pulled out during triage land in `data/tokens.json`:

- Trend/status colors (`#6B9B7A`, `#FF4444`, `#3B82F6`, etc.) from rules 1, 4, 39
- Shadow opacity defaults (4%, 6%, 8%) from rule 12
- Type scale defaults from rule 3
- Spacing scale from rules 13/14
- Motion durations from rules 43/59

These are **defaults stamped into user projects on `/design-init`**; the active skin/DESIGN.md still overrides them per-project.

## 6. Command updates

### 6.1. Commands that change

**`/design-init`** — auto-detects mode:

- **Scratch mode** (no existing theme): pick from bundled `data/design-systems/<slug>/DESIGN.md`, stamp `<root>/DESIGN.md` + `<root>/tokens.json` + `<root>/register.md`, generate theme.css from tokens.json.
- **Derive mode** (existing theme detected): reverse-derive `tokens.json` from existing CSS, template-fill `DESIGN.md` skeleton from tokens (Sections 2/3/5/6 derived; Sections 1/4/7/8/9 left as TODO stubs), stamp `register.md` empty. **Don't overwrite the existing theme file** — it stays as the runtime artifact; `tokens.json` becomes canonical going forward.

Detection priority for derive mode: `components.json` (shadcn) → `tailwind.config.{js,ts}` v3 → `@theme` directive in any `*.css` → Astro/Svelte equivalents → fallback to scratch with confirmation prompt.

**`/design-skin`**:
- 4-source lookup unchanged in structure; Source 4 caches DESIGN.md verbatim to `.design-rules/design-systems/<slug>/DESIGN.md` (no parse-and-discard).
- On apply: copy resolved DESIGN.md to `<root>/DESIGN.md`, derive tokens.json, regenerate theme.css.
- New subcommand `/design-skin save <name>` writes the current `<root>/DESIGN.md` (possibly user-edited) into `~/.design-rules/design-systems/<slug>/DESIGN.md`.

**`/design-tokens`** — operates on `<root>/tokens.json` (W3C):
- list/add/update/remove unchanged in UX; underlying file format is W3C tokens.json instead of CSS variables.
- On any write to tokens.json, regenerate theme.css via theme-io.
- New subcommand `/design-tokens sync` — re-derive tokens.json from DESIGN.md.
- New subcommand `/design-tokens sync --reverse` — produce a suggested DESIGN.md diff from tokens.json edits, for user review and manual merge.

**`/design-review`, `/design-lint`** — gain real enforcement authority:
- Load `<root>/tokens.json` as the canonical value set.
- Flag any hardcoded color/spacing/radius/etc. that doesn't match a token.
- DESIGN.md's "Do's and Don'ts" (section 7) feeds the review agent's narrative checks.

### 6.2. theme-io.ts pipeline change

Current: `theme.css` is canonical; theme-io reads/writes it directly.

New:

```
DESIGN.md  ─derive──▶  tokens.json  ─emit──▶  theme.css
(narrative)            (W3C precise)          (per-adapter CSS)
```

`theme-io.ts` gets a `tokens.json`-aware mode. Generators emit `:root { --color-brand: <value>; ... }` blocks from tokens.json walks. Existing per-adapter `theme.css` markers (managed @import block, etc.) survive.

### 6.3. Settings-page rewire (all 4 adapters)

Settings page reads/writes `tokens.json`; theme.css regenerates. All four adapters (react-shadcn, astro, sveltekit, obsidian-css) get their `__design-page.ts` and `theme-io.ts` retargeted from theme.css to tokens.json. Pilot order:

1. **react-shadcn** — pattern-establishing pilot. Validate dev-server hot reload, write-back round-trip, the new derive mode.
2. **astro** — apply same pattern.
3. **sveltekit** — apply same pattern.
4. **obsidian-css** — apply (Obsidian's settings-tab API is different but same idea: writes target tokens.json, plugin re-emits CSS).

### 6.4. Commands that don't change

`/design-page`, `/design-pattern`, `/design-component`, `/design-copy`, `/design-flow`, `/design-feedback`, `/design-audit`, `/design-a11y`, `/design-recipe`, `/design-settings-page` (the scaffolding command), `/design-init --migrate` — each gets a one-line instruction update ("read `<root>/DESIGN.md` for narrative context if present"). No architectural changes.

## 7. Phasing and gates

One continuous session, gates serve as natural pause points. Mid-session breakpoint after Phase 3 (~5 hours in) is a recommended walk-away point: triage actioned, craft layer populated, no command code touched.

### Phase 1 — Schema spec (no code changes)

1. Write `docs/spec.md` with the three formats (DESIGN.md 9-section, tokens.json W3C, register.md 5-section).
2. Write `docs/triage-69-rules.md` skeleton (table headers, no classifications yet).

**Gate 1:** User reviews `docs/spec.md`. Codex-reviewed as part of design-doc / plan-doc cross-model-review pass.

### Phase 2 — Triage classification (no rule moves yet)

1. Pull OD's 8 craft files verbatim into `data/craft/<topic>.md` (preserves OD attribution; awaits design-engine additions block).
2. Read all 69 rules; fill in `docs/triage-69-rules.md`: classification, destination(s), notes.

**Gate 2 (HARD):** User reviews and approves classifications. **No content moves until signed off.** This is the load-bearing gate; if classifications are wrong, all later work compounds bad assumptions.

### Phase 3 — Apply triage

Topic-by-topic:

1. For each `data/craft/<topic>.md`, prepend design-engine additions block per Section 5.2.
2. Update `skills/design-engine/SKILL.md` with universals that don't fit OD's 8 topics (UNIV-EXTRA bucket).
3. Build `data/tokens.json` (W3C default template) by aggregating TOK values pulled out during triage.
4. Rewrite `skills/design-language/SKILL.md` → `skills/mobile-dashboard/SKILL.md` with only UI-DASH content remaining.
5. Delete `data/tokens/{6 files}.json` (subsumed by `data/tokens.json`).

**Gate 3:** Spot-check 4-5 rules to confirm they landed where the sheet said. Quick.

### **Mid-session breakpoint (recommended walk-away)**

At this point: triage done, craft layer populated, mobile-dashboard skill cleaned. No command code touched. Safe to step away and resume with fresh eyes if desired.

### Phase 4 — Restructure design systems + helper additions

1. `data/skins/<name>.json` → `data/design-systems/<od-slug>/DESIGN.md`. Pull 4 from upstream verbatim (Stripe, Vercel, Linear→`linear-app`, Notion); hand-author Toss; add Kami.
2. `data/templates/{deck-framework.html, kami-deck.html}` pulled verbatim from OD.
3. Update `data/awesome-design-md-index.json` if needed (slug normalizations).

### Phase 5 — Command rewiring

In dependency order:

1. `theme-io.ts` — gain `tokens.json` reader/writer; theme.css emission becomes derived. Tests for round-trip.
2. **DESIGN.md → tokens.json derivation module** (`design-md-parse.ts`) — parse Sections 2/3/5/6 into W3C tokens. Tests with airbnb / stripe / linear-app / kami DESIGN.md fixtures. **Codex-reviewed before downstream commands consume it** — wrong parser = bad data downstream.
3. theme.css → tokens.json reverse derivation (init derive mode only). Tests with shadcn/Tailwind v4 fixtures committed under `tests/fixtures/` (not external repos).
4. `/design-init` — both scratch and derive modes; auto-detect; stamp DESIGN.md + tokens.json + register.md.
5. `/design-skin` — Source 4 caches DESIGN.md verbatim; on apply, copy to root + derive + regen theme.css.
6. `/design-tokens` — operates on tokens.json; new `sync` and `sync --reverse` subcommands.
7. `/design-review`, `/design-lint` — load tokens.json as canonical value set; flag deviations.
8. **Settings page rewire (4 adapters)** — react-shadcn first as pattern-establishing pilot. **Codex-reviewed after the first adapter** before fanning out to astro/sveltekit/obsidian-css.
9. `/design-init --migrate` — verify still works with new contract files.
10. Other commands — one-line updates to read DESIGN.md narrative when available.

**Gate 4:** All tests pass; manual smoke-test of `/design-init` scratch and derive against bundled fixtures; version bump in `.claude-plugin/plugin.json`; MANIFEST.md regenerated; PR opened.

### 7.1. Cross-model reviews (codex)

Per `/cross-model-review` plugin:
- After this design doc lands → `/cross-model-review-now design`
- After the implementation plan lands → `/cross-model-review-now plan`
- After Phase 5.2 (DESIGN.md parser) → ad-hoc codex review before commands consume the parser
- After Phase 5.8 first adapter (react-shadcn settings-page rewire) → ad-hoc codex review before fanning out to other 3 adapters

## 8. Validation

After PR merges and plugin reinstalls (out of foundation scope, post-merge):

1. **Scratch-mode smoke test.** Empty test repo. Run `/design-init`. Verify DESIGN.md (9 sections from chosen design-system), tokens.json (W3C, populated from DESIGN.md), register.md (empty 5-section template).
2. **Derive-mode smoke test against `dc-v1-onboarding`.** User runs `/design-init` inside the repo as a real user. Verify:
   - Derive mode auto-detected (shadcn `components.json` + Tailwind v4 `@theme` in `globals.css`).
   - tokens.json populated from existing variables.
   - DESIGN.md skeleton has Sections 2 and 3 (and 5/6 if applicable) filled; Sections 1/4/7/8/9 are TODO stubs.
   - register.md is empty 5-section template.
   - **Existing `globals.css` unchanged.**
3. **Round-trip test.** Edit tokens.json via `/design-tokens` → theme.css regenerates → settings page reflects values → save in settings page → tokens.json updates → theme.css regenerates.
4. **`/design-review` enforcement test.** Hardcode a non-token color in a component; verify `/design-review` flags it with a reference to the active tokens.json.

## 9. Open items / follow-ups

- **OD slug normalization for awesome-design-md-index.** Verify our index uses OD's exact normalized slugs (`linear-app` not `linear`, `x-ai` not `x.ai`). One-time pass during Phase 4.
- **`/design-init --migrate` interaction with derive mode.** When migrating between adapters, does the new adapter pick up the derive-mode `tokens.json` cleanly? Verified in Phase 5.9.
- **Toss DESIGN.md authoring.** Toss isn't in awesome-design-md upstream; we hand-author. Source: existing `data/skins/toss.json` + Toss's public design system documentation.
- **Reverse-derive coverage gaps.** Some shadcn/Tailwind v4 patterns may not parse cleanly (e.g., `oklch()` color values, complex `hsl()` math expressions). Phase 5.3 fixtures should cover the common cases; edge cases land as `# TODO` stubs in the generated DESIGN.md for the user to address.
- **OD-fork PR-back surface.** When the OD fork ships (#19), the design-engine additions in `data/craft/<topic>.md` are candidate upstream PRs. Out of scope here, but the "design-engine first / OD baseline second" structure makes the PR surface mechanical.

---

*Filed under: foundation, schema, tokens, taste-extraction. References: [RFC #23](https://github.com/TimSimpsonJr/design-engine/issues/23), [nexu-io/open-design](https://github.com/nexu-io/open-design), [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md), [W3C Design Tokens spec](https://www.designtokens.org/), [TimSimpsonJr/prose-craft](https://github.com/TimSimpsonJr/prose-craft) (register pattern).*
