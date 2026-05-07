# Color craft rules

> Verbatim from [nexu-io/open-design `craft/color.md`](https://github.com/nexu-io/open-design/blob/main/craft/color.md). design-engine additions block prepended in Phase 3.

## design-engine principles

### Single accent + grayscale (from rule 1)

Unity comes from one key color used only for active or selected states;
everything else stays grayscale so the accent reads. Pure black is
forbidden — use a soft near-black for primary text. Status / impact
colors (success, warning, urgent) are reserved for very small areas:
a 6 px dot plus 11 px label is the maximum size, never a large fill.

### Dark mode brightness ladder (from rule 45)

In dark mode, the relationship between page and card must invert
correctly — cards stay **brighter** than the page background, mirroring
the light-mode (#FAFAFA → #FFFFFF) gap. Maintain at least a noticeable
brightness step between page, card, and elevated-surface levels. In
dark mode, shadows disappear, so swap them for a low-opacity white
border (~6 % opacity) to keep card edges legible. Keep the accent
brighter (not darker) in dark mode — a darkened accent on a dark
background dies.

### Accent scarcity discipline (from rule 65)

The accent earns its impact through restraint, not distribution.
Establish a per-screen accent inventory and stop adding once it's full;
typical inventory is one CTA-equivalent + one navigation/active state +
one chart or progress highlight. Status colors in lists should also be
diversified rather than clustered — three "completed" greens in a row
flatten color into noise.

## OD baseline (verbatim from upstream)

Universal color rules applied on top of the active `DESIGN.md`. The
design system supplies the palette tokens; this file enforces how to
*use* them.

> Adapted from [refero_skill](https://github.com/referodesign/refero_skill)
> (MIT). All examples reference Open Design's standard tokens
> (`--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--accent`).

## Palette structure

A coherent palette has four layers. Plan all four before writing any CSS.

| Layer | Share of pixels | Tokens |
|---|---|---|
| **Neutrals** | 70–90% | `--bg`, `--surface`, `--fg`, `--muted`, `--border` |
| **Accent** (one) | 5–10% | `--accent` only — never invent a second accent |
| **Semantic** | 0–5% | `--success`, `--warn`, `--danger` |
| **Effect** | <1% | gradients, glows; rarely justified |

## Accent discipline

The single biggest readability failure in AI-generated UIs is accent
overuse. Hard caps:

- **At most 2 visible uses of `--accent` per screen.** Typical pair:
  one eyebrow / chip + one primary CTA. Or one accent card + one tab
  pill. Pick a pair, not a flood.
- Links count as accent; demote to `--fg` underline if you also have a
  CTA on the same screen.
- Hover/focus rings count as accent. Ration accordingly.

## Contrast minimums

Run these as gates, not goals:

| Pair | Minimum |
|---|---|
| Body text (≤16 px) on background | **4.5:1** |
| Large text (>18 px or 14 px bold) | **3:1** |
| UI components against adjacent surfaces | **3:1** |

When the brand color clashes (low-contrast indigo on light background is
common), darken the accent to a `600`-level shade for text use; reserve
the brand-bright variant for fills only.

## Dark themes

Avoid pure black and pure white — both cause vibration and eye strain.

| Token | Dark theme | Light theme |
|---|---|---|
| Background | `#0f0f0f` (not `#000`) | `#fafafa` (not `#fff`) |
| Foreground | `#f0f0f0` (not `#fff`) | `#111111` (not `#000`) |

On dark surfaces, prefer **semi-transparent white borders** over solid
dark borders — a 1px `rgba(255,255,255,0.08)` reads as structure
without adding visual noise.

## Semantic color naming

Always name tokens by **purpose**, never by hue:

```css
/* good */
--accent: #2f6feb;
--success: #17a34a;

/* bad — locks you out of theming */
--blue-500: #2f6feb;
--green-500: #17a34a;
```

## Anti-defaults

- **Indigo `#6366f1`** (Tailwind `indigo-500`) is the most reliable
  AI-slop tell. The active `DESIGN.md` provides `--accent`; use it. If
  the brief truly needs indigo, make the user say so explicitly. If
  your `DESIGN.md` encodes indigo as `--accent`, that is intentional —
  the linter only flags hardcoded hex, so `var(--accent)` uses are
  unaffected even when the resolved color happens to be `#6366f1`.
- **Two-stop "trust" gradient** (purple → blue, blue → cyan, etc.) on a
  hero is the second most reliable tell. A flat surface + one
  type-driven hierarchy beats it every time.
- **Decorative gradients with no functional purpose**. Gradients should
  separate hierarchies (header → body, primary CTA → secondary), not
  decorate empty space.
