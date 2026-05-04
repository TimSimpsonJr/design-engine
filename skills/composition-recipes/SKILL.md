---
name: composition-recipes
description: Use when scaffolding a new page, section structure, or screen layout — "scaffold a dashboard page", "what's the structure for a fintech screen", "lay out a new analytics page", new-page generation tasks. Provides 5 page composition recipes (SaaS, e-commerce, fintech, social, productivity) with section sequences, KPI variation rules, and visual rhythm principles. Loads when a recipe choice needs to be made or when /design-page runs. Do not use for component-level work (use design-engine instead) or non-UI tasks.
---

> **Active configuration:** Check `.design-rules/config.json` in the current project for active recipe. If `/design-page` has a `--recipe=<name>` flag, that overrides the project default.
>
> **Layered usage:** This skill provides recipes (page-level structural templates). The broader `design-engine` skill provides component-level rules. The `design-language` skill provides the full 69-rule mobile dashboard reference. Use this skill when scaffolding the *shape* of a page; use the others when working on individual sections or components within it.

# Page Composition Recipes

These recipes define the *structural shape* of a page — which sections appear in what order, how they vary, and how visual rhythm is maintained. Adapted from styleseed's DESIGN-LANGUAGE.md (rules 61-69, MIT). 5 app-type recipes plus general principles for breaking monotony, KPI variation, and progressive information density.

---

## 61. Visual Rhythm — Breaking Monotony

### The Core Problem
AI tends to generate repetitive layouts: 4 identical StatCards, then a list, then another list.
Professional designers create **visual rhythm** — alternating density, height, and element types.

### The Rhythm Rule: Never Repeat the Same Section Type Twice in a Row

```
✗ Bad: Grid → Grid → Grid (monotonous)
✗ Bad: Full Card → Full Card → Full Card (wall of cards)

✓ Good: Hero (D) → Grid (B) → Full Card (A) → Carousel (C) → Full Card (A)
✓ Good: Hero (D) → Grid (B) → Full Card with chart (A) → Full Card with list (A)
```

Even within the same type, **vary the internal content**:
```
✗ Bad: Two Full Cards both with lists
✓ Good: Full Card with chart → Full Card with list
```

### Height Variation Rule
Alternate between **tall** and **compact** sections:

| Section | Height Feel | Examples |
|---------|------------|---------|
| **Tall** | 200-300px | Hero card, chart card, donut card |
| **Medium** | 120-180px | KPI grid (2×2), usage breakdown with progress bars |
| **Compact** | 80-120px | Briefing carousel, ranked list (3 items) |

```
✓ Tall → Compact → Medium → Tall → Compact
✗ Tall → Tall → Tall (overwhelming)
✗ Compact → Compact → Compact (feels empty)
```

---

## 62. KPI Card Variation — The 4-Card Rule

### Never Make All 4 KPI Cards Identical
When displaying a 2×2 KPI grid, **vary the secondary element** in each card:

| Card | Primary | Secondary Element | Example |
|------|---------|------------------|---------|
| Card 1 | Metric + unit | **Trend arrow** (up/down %) | Revenue $48.2K ↑+8.2% |
| Card 2 | Metric only | **Trend arrow** (up/down %) | Users 12,840 ↑+3.1% |
| Card 3 | Metric + unit | **Mini progress bar** (h-2) | Storage 68% [████░░] |
| Card 4 | Metric + unit | **Comparison text** | Orders 342 (vs 380 last week) |

### Variation Toolkit for KPI Cards

| Element | When to Use | Visual |
|---------|------------|--------|
| **Trend % + arrow** | Time-based comparison | `+8.2% ↑` in green/red |
| **Mini progress bar** | Ratio/capacity metric | Thin bar (h-2) below metric |
| **Comparison text** | Period comparison | `vs 380 last week` in tertiary |
| **Sparkline** | Trend without specific % | Tiny inline chart (h-8, no axes) |
| **Status dot** | State indicator | `● Active` / `● Warning` |
| **Sub-metric** | Breakdown hint | `Desktop 60% · Mobile 40%` in caption |

### Rules
- Use **at most 2 cards with the same secondary element** in a 4-card grid
- If all 4 metrics have trends, still vary: 2 with trend %, 1 with progress, 1 with comparison
- The most important metric gets the **top-left** position (reading order)

---

## 63. Section Composition Recipes

### Recipe 1: SaaS Dashboard
```
1. Hero Card (D)          — MRR or total revenue, big number
2. KPI Grid (B)           — 4 varied cards (revenue, users, churn, conversion)
3. Chart Card (A)         — Revenue trend (area chart) + period toggle
4. Carousel (C)           — AI insights / alerts / briefings
5. Progress Card (A)      — Usage breakdown (3 progress bars)
6. List Card (A)          — Recent activity (3-4 items with status dots)
```

### Recipe 2: E-commerce Dashboard
```
1. Hero Card (D)          — Today's sales, big number
2. KPI Grid (B)           — Orders, AOV, returns, conversion
3. Donut Card (A)         — Sales by category (interactive donut)
4. Chart Card (A)         — Weekly sales trend (bar chart)
5. Carousel (C)           — Top products (horizontal scroll cards)
6. List Card (A)          — Recent orders (status: shipped/pending/delivered)
```

### Recipe 3: Analytics Dashboard
```
1. Hero Card (D)          — Total users or key metric
2. KPI Grid (B)           — DAU, session duration, bounce rate, pages/session
3. Chart Card (A)         — Traffic trend (area chart)
4. Split Card (A)         — Traffic sources (donut) + top pages (ranked list)
5. Chart Card (A)         — Conversion funnel (horizontal bar)
6. List Card (A)          — Real-time events (3-4 items)
```

### Recipe 4: Finance/Fintech
```
1. Hero Card (D)          — Total balance or portfolio value
2. KPI Grid (B)           — Income, expenses, savings rate, investments
3. Donut Card (A)         — Asset allocation (interactive)
4. Chart Card (A)         — Balance trend (area chart, 1W/1M/3M toggle)
5. List Card (A)          — Recent transactions (amount + status)
6. Carousel (C)           — Financial tips / alerts
```

### Recipe Rules
- **First screen (above the fold)**: Always Hero + KPI Grid — answer "how am I doing?" instantly
- **Middle sections**: Alternate between charts and lists — never two charts in a row
- **Bottom sections**: Lower priority info (activity logs, alerts)
- Every recipe has **exactly one chart type per card** — never combine two charts
- Every recipe includes **at least one non-data section** (carousel/briefing) to break the pattern

---

## 64. Element Diversity Within Cards

### Section Card Content Types (mix these across your page)

| Content Type | Visual Character | Best Paired After |
|-------------|-----------------|------------------|
| **Progress bars** (2-4 items) | Horizontal lines, compact | Chart card or KPI grid |
| **Ranked list** (3-4 items) | Numbers + names, dense | Donut chart or hero |
| **Status list** (3-4 items) | Dots + labels, scannable | Chart card |
| **Stat grid** (3-4 items below divider) | Numbers in columns | Chart (as footer below border-t) |
| **Donut + legend** | Circular + list, interactive | KPI grid |
| **Area/Bar chart** | Flowing/blocky, visual | List card |
| **Metric + trend** | Big number, minimal | Anything (versatile) |

### Forbidden Same-Page Combinations
```
✗ Two donut charts on one page (competing circular elements)
✗ Two area charts on one page (repetitive waves)
✗ Three list cards in a row (feels like a spreadsheet)
✗ Chart card immediately after chart card (visual fatigue)
```

### Required Variety
```
✓ At least 1 chart-based section per dashboard page
✓ At least 1 list-based section per dashboard page
✓ At least 1 metric-focused section (KPI grid or hero)
✓ Maximum 2 of the same content type per page
```

---

## 65. Color Accent Distribution

### The Accent Scarcity Rule
Key color creates impact through **scarcity**. Distribute it sparingly:

```
Per page, key color should appear in:
✓ 1 hero card icon badge
✓ 4 KPI card icon badges (small, 10% opacity)
✓ 1 active bottom nav item
✓ 1-2 progress bar fills
✓ 1 chart highlight (selected segment or line)

That's it. Everything else is grayscale.
```

### Status Color Distribution
Don't cluster all status colors in one area:

```
✗ Bad: All 3 list items have green "Completed" status
✓ Good: 1 green (Completed) + 1 blue (In Progress) + 1 yellow (Pending)
```

Vary status states in lists to create **visual interest through color diversity**.

---

## 66. Card Size Variation

### Not All Cards Should Be the Same Height

| Card Purpose | Padding | Internal Spacing | Resulting Height |
|-------------|---------|-----------------|-----------------|
| **Hero** | `p-8` (32px) | Generous `gap-3` | ~200px (tallest) |
| **Stat/KPI** | `p-6` (24px) | Tight `gap-2` | ~140px |
| **Chart** | `p-6` (24px) | Chart `h-40` + stats | ~280px |
| **List** | `p-6` (24px) | `space-y-3` items | ~200px (3 items) |
| **Progress** | `p-6` (24px) | `space-y-4` bars | ~180px |

### The Skyline Rule
Looking at your page from the side, the card heights should create an **interesting skyline**, not a flat wall:

```
✓ Good skyline:  ██ ▄▄ ████ ▄▄ ██ ▄▄▄
✗ Bad skyline:   ██ ██ ██ ██ ██ ██
```

Achieve this by alternating between:
- KPI Grid (short individual cards) and Full Cards (taller)
- Chart cards (tall) and list cards (medium)
- Carousel (compact, horizontal) after any tall section

---

## 67. Progressive Information Density

### Top-to-Bottom Density Gradient

| Position | Density | Elements | Font Sizes |
|----------|---------|----------|-----------|
| **Top** (Hero) | Low — 1 big number | Single metric + trend | 48px / 24px |
| **Upper** (KPI) | Medium — 4 numbers | Grid of metrics | 36px / 18px |
| **Middle** (Charts) | Medium — visual data | Chart + 3-4 stat items | 18px / 11px |
| **Lower** (Lists) | High — many items | 3-4 rows of data | 14px / 11px |
| **Bottom** (Activity) | Highest — detailed | Timestamps, statuses | 13px / 11px |

### Rules
- Information density **increases** as you scroll down
- Font sizes **decrease** as you scroll down
- White space **decreases** as you scroll down
- This creates a natural "zooming in" effect: overview → details

---

## 68. Empty Page Prevention

### Minimum Section Count
A dashboard page should have **at least 4 sections** to feel complete:

```
✗ Too sparse: Hero + KPI Grid only (2 sections — feels empty)
✗ Too sparse: Hero + KPI + one list (3 sections — almost there)
✓ Minimum viable: Hero + KPI + chart/progress + list (4 sections)
✓ Ideal: Hero + KPI + chart + progress/donut + list + carousel (5-6 sections)
✗ Too dense: 8+ sections (overwhelming, consider splitting into tabs)
```

### When a Section Has No Data
- Show the section with an EmptyState — don't remove it
- Removing sections changes the page rhythm and makes it feel broken
- Empty states maintain layout consistency: "No activity yet. Create your first project."

---

## 69. Chart + Context Pairing

### Never Show a Chart Alone — Always Pair with Context

| Chart Type | Required Context | Placement |
|-----------|-----------------|-----------|
| **Area chart** | Period toggle (1W/1M/3M) + 2-3 stat items below border-t | Toggle in header, stats in footer |
| **Bar chart** | Category labels on X-axis + highlight color on max bar | Labels below bars |
| **Donut chart** | Center value + legend list (3-4 items) with click interaction | Legend beside or below |
| **Progress bars** | Label + percentage text on each bar | Label left, % right |

### Stat Footer Patterns (below border-t in chart cards)

```tsx
{/* 3-column stat footer */}
<div className="grid grid-cols-3 gap-3 pt-5 border-t border-surface-muted">
  <div className="text-center">
    <p className="text-[11px] text-text-secondary font-medium uppercase mb-1.5">Web</p>
    <p className="text-text-primary font-bold text-[18px]">$1,648<span className="text-[10px] ms-0.5">/mo</span></p>
  </div>
  {/* ... more columns */}
</div>
```

### Rules
- A chart without context numbers is **decoration, not information**
- Always show the **current value** prominently (not just the trend line)
- Period toggles: max 3 options (1W / 1M / 3M), use pill toggle style
- Stat footer items: max 4 columns (`grid-cols-3` or `grid-cols-4`)

---

## Core Composition Principles Summary

### Rhythm (3)
1. Never repeat the same section type twice in a row
2. Alternate between tall and compact sections (skyline rule)
3. Every page needs at least 1 chart, 1 list, 1 metric section

### Variety (3)
4. Vary KPI card secondary elements (trend, progress, comparison, sparkline)
5. Maximum 2 of the same content type per page
6. Distribute status colors across list items (don't cluster same color)

### Density (3)
7. Information density increases top-to-bottom
8. Font sizes decrease top-to-bottom (48→36→18→14→11px)
9. Minimum 4 sections per dashboard, maximum 7

### Context (2)
10. Charts always paired with stat context (footer or header)
11. Empty sections show EmptyState, never removed from layout

---

## Using these recipes

When scaffolding a new page (`/design-page <name>`):
1. Read `.design-rules/config.json` for active recipe (or use `--recipe=<name>` flag override)
2. Apply the matching recipe's section sequence (rule 63)
3. Verify visual rhythm rules (rule 61): no consecutive same-section-types
4. Apply KPI variation if grid present (rule 62): max 4 cards, vary secondary elements
5. Verify density (rule 67), section count (rule 68), and chart pairing (rule 69)

The active adapter's page template provides the markup idiom; this skill defines the structural rules.
