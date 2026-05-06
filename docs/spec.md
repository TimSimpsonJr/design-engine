# design-engine schema spec

**Status:** Draft · 2026-05-06
**Audience:** authors and parsers of the contract files (`DESIGN.md`, `tokens.json`, `register.md`).

This document specifies the three contract files design-engine reads and writes, the derivation rules between them, and the craft-consumption protocol skills use to declare auxiliary context. It is format-compatible with [nexu-io/open-design](https://github.com/nexu-io/open-design) (OD) so artifacts round-trip between design-engine (codebase enforcer) and a future OD fork (canvas explorer) without translation loss.

---

## 1. Overview

design-engine's contract is three files:

- **`DESIGN.md`** — narrative, 9-section, human-authored. The source of truth for taste and rationale. Adopted verbatim from OD.
- **`tokens.json`** — W3C Design Tokens, machine-precise. Derived **one-way** from `DESIGN.md`. The canonical value set for code enforcement (linting, settings UI, theme emission). Plugin-only addition.
- **`register.md`** — 5-section taste capture, prose-craft pattern. Notes the ineffable shape of the system (color stance, spatial logic, type behavior, composition moves, material posture). Plugin-only addition; canvas-side population deferred to RFC [#21](https://github.com/TimSimpsonJr/design-engine/issues/21).

### Locations

| Role | Path |
|---|---|
| Bundled (plugin assets) | `${CLAUDE_PLUGIN_ROOT}/data/design-systems/<slug>/DESIGN.md` |
| Saved global (per-user) | `~/.design-rules/design-systems/<slug>/DESIGN.md` |
| Active (user project) | `<project-root>/DESIGN.md`, `<project-root>/tokens.json`, `<project-root>/register.md` |

The `data/` prefix on bundled assets is plugin-internal divergence from OD: design-engine ships as a Claude Code plugin, and assets must live under `${CLAUDE_PLUGIN_ROOT}/data/`. User-project layout matches OD's user-facing layout exactly.

### Active-DESIGN.md-as-runtime-context

The active `<project-root>/DESIGN.md` is the runtime narrative source. design-engine commands read it (when present) and inject relevant sections into agent context for generation, review, and lint. This replaces the prior model where `.design-rules/config.json` pointed at an active skin JSON. tokens.json is read as the canonical value set; DESIGN.md is read as the canonical narrative.

---

## 2. DESIGN.md format

A 9-section markdown document. Sections appear in this order:

1. **Visual Theme & Atmosphere** — narrative description plus key-characteristics list.
2. **Color Palette & Roles** — primary, secondary/accent, surface/background, neutrals/text, semantic, gradient. Subsections optional.
3. **Typography Rules** — font family, hierarchy table, principles, font-substitution notes.
4. **Component Stylings** — buttons, inputs, cards, etc.
5. **Layout Principles** — grid, spacing rhythm, page structure.
6. **Depth & Elevation** — shadows, blur, glass, radius scale.
7. **Do's and Don'ts** — bullet list of brand-specific guardrails.
8. **Responsive Behavior** — breakpoints, mobile transforms.
9. **Agent Prompt Guide** — short instructions for AI consumers.

### Section numbering

Numbering is **optional** in OD-the-format. Both unnumbered (`## Color Palette & Roles`) and numbered (`## 2. Color Palette & Roles`) variants are accepted on read. design-engine **emits numbered** for parser determinism.

Parsers MUST match sections by H2 text (after stripping leading `N.` if present), tolerate missing sections (emit empty token groups), tolerate reordering, and warn on unknown H2 headings without failing.

### Header metadata

Header metadata varies by file location:

| Location | H1 | Category line |
|---|---|---|
| Bundled (`data/design-systems/<slug>/`) | **Required**: `# Design System Inspired by <Name>` | **Required**: `> Category: <Group>` immediately after H1 |
| Saved global (`~/.design-rules/design-systems/<slug>/`) | Same as bundled | Same as bundled |
| Project-local (`<project-root>/DESIGN.md`) | Carries through whatever the source stamped | Carries through whatever the source stamped |

When `/design-skin <name>` stamps a bundled DESIGN.md into a project, the H1 and Category line travel with it. When derive mode generates DESIGN.md from existing CSS, the H1 is stubbed (`# Design System`) and the Category line is omitted — acceptable per OD's parser, which treats absence as "uncategorized" / bottom-of-dropdown.

### Worked example (header)

```markdown
# Design System Inspired by Airbnb

> Category: Travel & Hospitality

## 1. Visual Theme & Atmosphere

Airbnb's design language balances warmth and trust …
```

---

## 3. tokens.json format

Strict compliance with the [W3C Design Tokens Community Group draft](https://www.designtokens.org/). Single JSON file at the root.

### Top-level groups

`color`, `font`, `typography`, `spacing`, `radius`, `shadow`, `motion`. Other groups MAY be added by extension; the seven above are the canonical set.

### `$type` inheritance

Each top-level group sets `$type` once; descendants inherit. Override by setting `$type` on a child token.

### Aliases

Aliases use brace syntax referencing dotted paths: `"$value": "{color.brand}"`. Resolution is recursive; cycle detection is the reader's responsibility.

### Required and optional fields

- `$value` — required on leaf tokens.
- `$type` — required on a leaf or an ancestor group. Inherited downward.
- `$description` — optional, free text.
- `$extensions` — optional, namespaced object for non-spec metadata. design-engine reserves `od.*` and `de.*`.

### Worked example

```json
{
  "color": {
    "$type": "color",
    "brand": { "$value": "#ff385c", "$description": "Rausch coral" },
    "background": {
      "page":   { "$value": "#ffffff" },
      "card":   { "$value": "#ffffff" },
      "muted":  { "$value": "{color.background.page}" }
    },
    "text": {
      "primary":   { "$value": "#222222" },
      "secondary": { "$value": "#717171" }
    }
  },
  "font": {
    "$type": "fontFamily",
    "primary": { "$value": ["Inter", "system-ui", "sans-serif"] },
    "mono":    { "$value": ["JetBrains Mono", "monospace"] }
  },
  "typography": {
    "size":   { "$type": "dimension", "base": { "$value": "16px" }, "lg": { "$value": "20px" } },
    "weight": { "$type": "fontWeight", "regular": { "$value": 400 }, "bold": { "$value": 700 } }
  },
  "spacing": {
    "$type": "dimension",
    "1": { "$value": "4px" }, "2": { "$value": "8px" }, "4": { "$value": "16px" }
  },
  "radius": {
    "$type": "dimension",
    "sm": { "$value": "4px" }, "md": { "$value": "8px" }, "lg": { "$value": "12px" }
  },
  "shadow": {
    "$type": "shadow",
    "sm": { "$value": { "color": "#0000000a", "offsetX": "0", "offsetY": "1px", "blur": "2px", "spread": "0" } }
  },
  "motion": {
    "duration": { "$type": "duration", "fast": { "$value": "120ms" }, "base": { "$value": "200ms" } }
  }
}
```

---

## 4. register.md format

A short markdown document with five fixed H2 headings. Captures the taste signature of the system in prose — the parts that don't survive a values-only projection.

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

In foundation, `/design-init` scaffolds the empty template with the five headings and a stub note. Population happens later via canvas-side extraction (RFC [#21](https://github.com/TimSimpsonJr/design-engine/issues/21)). design-engine reads register.md if present and treats absence as "no register active."

---

## 5. Derivation rules

`DESIGN.md → tokens.json` is **one-way and lossy**. Section-to-group mapping:

| DESIGN.md section | tokens.json group(s) |
|---|---|
| 2. Color Palette & Roles | `color.*` |
| 3. Typography Rules | `font.*`, `typography.*` |
| 5. Layout Principles | `spacing.*` (when explicit values present) |
| 6. Depth & Elevation | `radius.*`, `shadow.*` |
| 1, 4, 7, 8, 9 | narrative-only, not derived |

Anything in DESIGN.md prose the parser can't extract is left out of tokens.json. This is by design: the narrative is the source of truth for taste and rationale, the tokens are the source of truth for precise values, and the projection drops what doesn't survive.

### Reverse direction

`tokens.json → DESIGN.md` is **suggestion-mode only**. `/design-tokens sync --reverse` produces a suggested DESIGN.md diff for user review and manual merge. It never auto-merges into prose. Prose rules and behavioral constraints in DESIGN.md don't round-trip from tokens alone.

### Edit locations

- Edits to narrative happen in `DESIGN.md`.
- Edits to precise values happen in `tokens.json` (or in the settings UI, which writes tokens.json).
- `/design-tokens sync` re-derives `tokens.json` from `DESIGN.md` (forward).
- `/design-tokens sync --reverse` produces a suggested DESIGN.md diff (reverse, advisory).

---

## 6. Craft consumption contract

Skills declare auxiliary craft topics they want loaded into agent context via the `od.craft.requires` frontmatter field:

```yaml
---
name: mobile-dashboard
description: data-dense mobile-first UI — dashboards, KPI grids, fintech screens, …
od.craft.requires: [color, typography, anti-ai-slop, state-coverage, animation-discipline]
---
```

The values are slugs matching files at `${CLAUDE_PLUGIN_ROOT}/data/craft/<slug>.md`. The canonical set (from OD) is: `anti-ai-slop`, `accessibility-baseline`, `animation-discipline`, `color`, `form-validation`, `rtl-and-bidi`, `state-coverage`, `typography`.

### Consumption side

When a design-engine command runs in a context where a skill's craft requirements matter (`/design-review`, `/design-lint`, generation commands), the command-side prompt:

1. Reads the active skill's frontmatter.
2. Globs the requested `data/craft/<topic>.md` files.
3. Prepends them to the agent's working context, after the active `DESIGN.md` and before the skill body.

This is design-engine's analog to OD's daemon-injected craft context. OD's daemon does the injection at runtime; design-engine commands do it at prompt-assembly time. Same effect, different mechanism — the frontmatter declaration is identical so skills are portable.

---

## 7. Compatibility

design-engine's contract is **format-compatible with OD**: a `DESIGN.md` authored for one product reads cleanly in the other, and an OD-format `DESIGN.md` pulled from upstream (e.g., [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)) drops into design-engine's bundled `data/design-systems/<slug>/` without modification.

### Acknowledged divergences

- **`data/` prefix on bundled assets.** design-engine is a Claude Code plugin; bundled assets must live under `${CLAUDE_PLUGIN_ROOT}/data/`. User-project layout (`<project-root>/DESIGN.md` etc.) matches OD exactly.
- **`tokens.json` and `register.md`.** Plugin-only additions, RFC-justified ([#23](https://github.com/TimSimpsonJr/design-engine/issues/23)). Not in OD. tokens.json is the W3C-precise projection of DESIGN.md needed for code enforcement; register.md captures the taste signature for prose-craft-style review.
- **Plugin-only skills.** `skills/design-engine/`, `skills/composition-recipes/` are design-engine-specific and labeled as such.

### Round-trip discipline

When the OD fork ships ([#19](https://github.com/TimSimpsonJr/design-engine/issues/19)), `data/craft/<topic>.md` files use a `## design-engine principles` block first, `## OD baseline` block second, so the upstream PR surface stays mechanical. The `od.craft.requires` field is identical across both products.

---

*References: [OD docs/spec.md](https://github.com/nexu-io/open-design/blob/main/docs/spec.md), [OD design-systems/README.md](https://github.com/nexu-io/open-design/blob/main/design-systems/README.md), [W3C Design Tokens spec](https://www.designtokens.org/), foundation design doc at `docs/plans/2026-05-06-foundation-od-schema-design.md` Section 4.*
