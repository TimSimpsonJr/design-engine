# Typography craft rules

> Verbatim from [nexu-io/open-design `craft/typography.md`](https://github.com/nexu-io/open-design/blob/main/craft/typography.md). design-engine additions block prepended in Phase 3.

## design-engine principles

### Multi-level type scale (from rule 3)

A coherent UI defines a small, named set of type roles (display /
headline / title / body / label / caption / micro) and reuses them.
Don't invent ad-hoc sizes per screen. Every role binds size, weight,
color, and line-height as a unit — picking a role at use-site is
faster and more consistent than picking each property individually.
Six to seven levels is enough for most products.

### Label uppercase + tracking pattern (from rule 3)

Category labels (the small caps line that titles a card or section)
use uppercase plus positive letter-spacing as a fixed pattern. Without
the tracking, uppercase looks cramped and amateur — this is the same
floor noted under "Letter-spacing" below, applied as a recipe for
labels: ~12 px medium weight, uppercase, tracking around `0.05em`,
muted gray. Skipping any of the three ingredients (especially the
tracking) is the most reliable label-tier slop tell.

### Information pyramid (from rule 20)

When stacking information vertically, hierarchy comes from a
**decreasing font-size cascade**, not from extra weights or colors.
The top of a page reads largest (one hero number), each subsequent
section steps down (KPI grid → supporting block → list → detail). A
flat type scale across stacked sections feels accidental; a
descending scale feels designed.

### Number + unit must not wrap (from rule 23)

Any "number + unit" pair — `$48.2K`, `12.4%`, `3.8M`, `840K` — must
render as a single unbreakable unit. Apply `whitespace-nowrap` (or
the equivalent platform primitive) so the unit can never orphan to a
new line. Numbers without units lose context; numbers wrapped from
their unit lose readability. No exceptions for "long" lines — fix the
container, not the number.

### Wrapping behavior by text type (from rule 23)

Different text roles have different wrapping rules. Single-line roles
(metric numbers, dates, trend percentages, short status labels)
require `whitespace-nowrap`. Single-line names that *can* overflow
(company names, addresses) use `truncate` with ellipsis. Multi-line
roles (briefing titles, descriptions) cap with `line-clamp-2` plus
`leading-tight`. Body roles wrap naturally. Pick a wrapping behavior
per role at definition time, not per use site.

### Line-height by usage context (from rule 23)

Line-height tracks role, not just size. `leading-none` (1.0) is for
large numbers where you want zero air between digits and any wrapped
content; `leading-tight` (~1.25) is for short multi-line text like
briefing titles; `leading-snug` (~1.35) is for section titles;
`leading-normal` (~1.5) is the body default. Mismatches are a common
slop tell — body text at `leading-tight` reads cramped, big numbers
at `leading-normal` waste space and feel decorative.

### Text overflow strategy (from rule 32)

Pick the overflow strategy at the role level, with a per-element
character budget so designs don't break on real data:

- Inline single-line names → `truncate` (ellipsis)
- Multi-line titles → `line-clamp-2` plus `leading-tight`
- Labels that can't shrink → use a shorter abbreviation, never a
  smaller font

Set rough max-character budgets per role (e.g. company name at
14 px ≈ 12 chars before truncation) so layout reviews can flag the
real-data case before it ships.

### CJK typography craft (from rule 33)

For Korean / Chinese / Japanese runs, two universal rules: use
`word-break: keep-all` so lines break at word boundaries, not in the
middle of a syllable cluster, and pair with `overflow-wrap: break-word`
so long Latin URLs don't overflow. Minimum readable sizes are higher
than Latin: CJK below 13 px reads poorly, and 10–12 px should be
reserved for numbers / Latin abbreviations. Tall-ascender CJK fonts
(Pretendard, Noto Sans CJK) sit visually low at large sizes — apply a
small upward `padding-top` correction (≈2 px at 36–48 px) only after
visual inspection, never globally.

### Progressive density gradient (from rule 67)

Down the length of a page, font sizes step **down** while information
density steps **up** — the top is overview (one big number), the
bottom is detail (many small rows). White space tightens going down.
Reversing the gradient (small at the top, large at the bottom) feels
upside-down. The exact ladder is product-specific, but the direction
is universal.

## OD baseline (verbatim from upstream)

Universal typography rules that apply on top of any `DESIGN.md`. The
active design system decides *which* fonts; this file decides *how* they
behave at every size.

> Adapted from [refero_skill](https://github.com/referodesign/refero_skill)
> (MIT) — distilled and re-tuned for Open Design's token system.

## Type scale

Use a multiplicative scale (1.2 or 1.25). Cap at 6–8 sizes per artifact.

| Role | Range |
|---|---|
| Display | 48–72 px |
| H1 | 32–48 px |
| H2 | 24–32 px |
| H3 | 20–24 px |
| Body | 15–18 px |
| Small | 13–14 px |
| Caption | 11–12 px |

## Line height (leading)

| Text size | Line height |
|---|---|
| Display / H1 (≥32 px) | `1.0`–`1.2` (tight) |
| Body (15–18 px) | `1.5`–`1.6` |
| Small (≤14 px) | `1.5` |

## Letter-spacing — the rule that makes or breaks craft

This is the single most-skipped rule in AI-generated design. **No
exceptions.**

| Context | Letter-spacing |
|---|---|
| Body text (14–18 px) | `0` (default) |
| Small text (11–13 px) | `0.01em` to `0.02em` (positive) |
| UI labels and button text | `0.02em` |
| **ALL CAPS** | **`0.06em` to `0.1em` (required)** |
| Headings 32 px+ | `-0.01em` to `-0.02em` |
| Display 48 px+ | `-0.02em` to `-0.03em` |

ALL CAPS without positive tracking looks cramped and amateur. Display
text without negative tracking looks loose and weak. These two failures
are the most reliable AI-slop tells.

The `0.06em` floor is not arbitrary: it is the empirical lower bound
that print and web typographers have converged on for uppercase
tracking (cf. Bringhurst's *Elements of Typographic Style* §3.2.7,
which recommends 5–10% of the em for caps; modern screen practice
rounds the lower end to 0.06em). Anything tighter and the counters
collide on screen; the upper bound `0.1em` keeps the word from
disintegrating into letters.

## Font pairing

- Maximum 2 typefaces per artifact (display + body, or one variable face
  used at multiple weights).
- Always declare a system fallback chain. If the active `DESIGN.md`
  ships a webfont URL, the fallback must still produce a coherent look.
- Never set `font-family: system-ui` alone on a heading — that is the
  textbook AI default; always pair it with an intentional first choice.

## Line length

Limit body copy to **50–75 characters** per line. In CSS:
`max-width: 65ch` is a safe default.

## Three-weight system

Most well-crafted UIs use exactly 3 weights:
- **Read** (400 / 450) — body copy
- **Emphasize** (510 / 550) — UI text, labels, navigation
- **Announce** (590 / 600) — headlines, buttons

Weight 700+ is rarely needed. If your design uses bold for "emphasis on
emphasis," it likely lacks weight discipline elsewhere.

## Common mistakes (lint these)

- ALL CAPS without `letter-spacing` ≥ `0.06em`.
- Display text (≥32 px) without negative tracking.
- More than 3 type sizes visible above the fold.
- Mixed serif and slab on the same screen without a clear role split.
- Body copy in `text-align: justify` (creates rivers; never use on the web).
