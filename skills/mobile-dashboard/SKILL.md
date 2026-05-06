---
name: mobile-dashboard
description: Use when designing data-dense mobile-first UI — dashboards, KPI grids, fintech screens, analytics interfaces, admin panels, chart-heavy layouts. Provides mobile-dashboard-specialty rules covering page layout, section types, KPI variation, chart/list patterns, and visual rhythm. Layers on top of design-engine for dashboard-specific specialty work. Do not use for marketing pages, content sites, blog UIs, native iOS/Android (use apple-design or material-design instead), or non-UI code.
---

> **Active configuration:** Check `.design-rules/config.json` in the current project for the active adapter, skin, and recipe. This skill applies the mobile-dashboard specialty rules below to the active context.
>
> **Layered on design-engine:** This skill assumes `design-engine` is loaded for universal craft (color philosophy, typography hierarchy, accessibility, motion, prohibitions). The rules here are the dashboard-specific application — composition grammar, KPI variation, chart styling, section taxonomy. Universal principles live in `data/craft/<topic>.md` and are not duplicated here.
>
> **Tokens:** Concrete values (hex, dimensions, durations) live in `data/tokens.json`. Rules reference token names (`var(--brand)`, `bg-card`, `space-y-6`) rather than literal hex.
>
> **Stack mapping:** Tailwind v4 utility classes are the canonical examples. For non-Tailwind adapters: translate `text-[36px]` → `font-size: 36px`, `mx-6` → `margin-left/right: 24px`. Token names are the same regardless of stack.

# Mobile Dashboard Specialty
> Specialty rules for data-dense mobile dashboard UI (430px viewport)

## Table of Contents

| Group | Rules |
|---|---|
| **Composition Grammar** | 13 (Page Layout) · **14 (Four Section Types)** · 15 (Card Division) · 16 (Title Margins) · 18 (Layout Prohibitions) · **19 (New Page Checklist)** · 21 (Data Density) · 27 (Background Layering) |
| **Numbers, Charts, Components** | 2 (Number Display) · 4 (Trends) · 5 (Gauge/Progress) · 6 (Donut) · 7 (Icon Badge) · 8 (Card Anatomy) · 9 (List Item) · 10 (Pill Toggle) · 11 (Briefing Carousel) · 17 (Chart Style) · 32 (Large Numbers) · 38 (Chart Selection) · 39 (Notification Severity) |
| **Mobile Frame and Navigation** | 20 (Information Pyramid) · 24 (Clickable Surface) · 28 (Scroll & Spacing) · 37 (Viewport 430px) · 40 (Domain Adaptation) · 42 (Bottom Nav) · 44 (Forms Outside Cards) · 48 (Dividers) · 52 (Reference Width) · 53 (Screen Composition) |
| **Visual Rhythm and Recipes** | **61 (Visual Rhythm)** · **62 (KPI Variation)** · **63 (Composition Recipes)** · 64 (Element Diversity) · 65 (Accent Distribution) · 66 (Card Size) · 67 (Progressive Density) · 68 (Min Sections) · 69 (Chart + Context) |

> **Start here:** Rules 14, 19, 61–63 are the most critical for page construction.

---

## 2. Number/Currency Display Rules

### Core Principle: Large Numbers + Small Units
On dashboards, numbers are large and bold and units are small and attached so **the eye goes to the number first**. The 2:1 number-to-unit ratio is the metric-scale signature of this system.

### Unit Size Ratio Table

| Context | Number Size | Unit Size | Ratio | Gap | Example |
|---------|------------|-----------|-------|-----|---------|
| Hero metric | 48px | 24px | **2:1** | `ms-0.5` | 3.8`M` |
| KPI metric | 36px | 18px | **2:1** | `ms-0.5` | $48.2`K` |
| Donut center | 24px | 12px | **2:1** | `ms-0.5` | 66`%` |
| Chart bottom price | 18px | 10px | **1.8:1** | `ms-0.5` | 1,648`/mo` |
| List amount | 17px | 11px | **1.5:1** | `ms-0.5` | 840`K` |
| Inventory quantity | 15px | 10px | **1.5:1** | `ms-0.5` | 32.0`GB` |

These pairs ship as `metric-scale` tokens in `data/tokens.json`.

```tsx
{/* Hero: 48px + 24px */}
<p className="text-text-primary text-[48px] font-bold leading-none">
  3.8<span className="text-[24px] ms-0.5">M</span>
</p>

{/* KPI: 36px + 18px */}
<p className="text-text-primary text-[36px] font-bold leading-none">
  $48.2<span className="text-[18px] ms-0.5">K</span>
</p>
```

---

## 4. Trend Indicator Rules

A trend indicator is the dashboard idiom for expressing change: arrow icon + colored percentage. Direction colors come from `--success` and `--destructive` tokens.

### Trend Patterns by Size

| Context | % Size | Icon Size | Label |
|---------|--------|-----------|-------|
| Hero | 15px bold | 16px (`size-4`) | "vs. last month" (13px, `text-text-tertiary`) |
| KPI card | 13px bold | 14px (`size-3.5`) | none |
| Chart header | 13px bold | 14px (`size-3.5`) | none |

```tsx
{/* Hero trend: % + icon + label */}
<div className="flex items-center gap-3">
  <div className="flex items-center gap-1">
    <span className="text-success text-[15px] font-bold">+12.4%</span>
    <TrendingUp className="size-4 text-success" strokeWidth={2.5} />
  </div>
  <span className="text-[13px] text-text-tertiary font-medium">vs. last month</span>
</div>
```

### Rules
- **Percent text and icon share the same color** (`--success` or `--destructive` token).
- Icon `strokeWidth={2.5}`.
- Secondary label ("vs. last month") uses `text-text-tertiary`, separated with `gap-3`.
- Up: `+` prefix + `TrendingUp`. Down: `-` prefix + `TrendingDown`.
- At 0%, hide the trend icon and show only `0%` in default text color.

---

## 5. Gauge/Progress Bar Rules

Linear vs segmented gauge selection is dashboard composition. The gauge dimensions are tied to card padding (`p-6` = 24px), which gives the proportional rules below.

### Gauge Variants

| Gauge | Height | vs Card `p-6` | Track | Fill | Corners | Use For |
|-------|--------|---------------|-------|------|---------|---------|
| **Linear progress** | `h-4` (16px) | 2/3 | `bg-surface-muted` | `bg-brand` | `rounded-full` | Continuous ratio (%) — supplementary indicator below metric |
| **Segment bar** (10-seg) | `h-6` (24px) | same | `bg-surface-muted` | `bg-brand` | `rounded` (4px), `gap-1` | Discrete achievement (n/N) — primary visualization, equal weight to metric |
| **Progress + label** | `h-4` + 11px text | — | `bg-surface-muted` | `bg-brand` | `rounded-full` | Continuous ratio with numeric display |
| **Donut** (rule 6) | `size-32` | 5x+ | — | — | — | Multi-item ratio comparison |

```tsx
{/* Linear progress */}
<div className="bg-surface-muted rounded-full h-4 overflow-hidden">
  <div className="bg-brand h-full w-[30%] rounded-full" />
</div>

{/* Segment bar */}
<div className="flex gap-1">
  {[...Array(10)].map((_, i) => (
    <div className={`h-6 flex-1 rounded ${i < filled ? 'bg-brand' : 'bg-surface-muted'}`} />
  ))}
</div>

{/* Progress + label */}
<div className="flex items-center gap-2">
  <div className="flex-1 bg-surface-muted rounded-full h-4">
    <div className="bg-brand h-full w-[68%] rounded-full" />
  </div>
  <span className="text-[11px] text-text-primary font-bold">68%</span>
</div>
```

Fill percentage uses `w-[{n}%]` inline style for dynamic rendering. Track is always `bg-surface-muted`; fill is always `bg-brand`.

---

## 6. Donut Chart Rules

The donut is the dashboard idiom for part-to-whole composition. Rule: **only the selected slice uses `var(--brand)`** at opacity 1.0; the rest are grayscale at opacity 0.3. Selected glow: `box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand) 25%, transparent)`. Click toggles selection; legend rows mirror state at 0.4 opacity for unselected.

### Chart Dimensions

| Property | Value | Ratio |
|----------|-------|-------|
| Container | 128×128px (`size-32`) | — |
| Inner radius | 50px | 39% of container |
| Outer radius | 64px | 50% of container |
| Ring thickness | 14px | outer − inner |
| Segment gap | `paddingAngle={4}` | — |
| Segment corners | `cornerRadius={8}` | — |
| Center number | 24px bold + 12px unit | metric-scale token |
| Center label | 10px medium uppercase | — |

Unselected gray ladder ships as `chart-gray-1..4` tokens (`#D4D4D4 → #A8A8A8 → #8B8B8B → #6B6B6B`) — reference by name.

### Legend List
- Dot: `size-3 rounded-full`, gap `gap-2.5` to name
- Name: 13px semibold; Quantity: 15px bold (both `text-text-primary`)
- Row spacing: `space-y-3.5`
- `cursor-pointer`, `transition-all duration-300`

---

## 7. Icon Badge Rules

Icon badges sit at the top of every metric-bearing card. The size scales with card type, but the rule is constant: **brand color at 10% opacity background, brand color icon**.

### Icon Badges by Size

| Context | Container | Icon | Corners | Background |
|---------|-----------|------|---------|------------|
| KPI card | `size-7` (28px) | `size-4` (16px) | `rounded-lg` | `bg-brand/10` |
| Hero card | `size-8` (32px) | `size-[18px]` | `rounded-xl` | `bg-brand/10` |
| Nav button | `size-10` (40px) | `size-[18px]` | `rounded-full` | `bg-card` + `shadow-button` |

### Rules
- Background opacity always **10%** (`/10`).
- Icon and background base color always the brand token.
- Icon `strokeWidth={2}` default, `{2.5}` for trend/emphasis.

---

## 8. Card Internal Structure

The dashboard card has a 3-part anatomy: **Header → Content → Footer**.

```
[🟣] Today's Revenue          ← Header (gap-2, mb-3)
$48.2K                        ← Content (large + small, mb-3)
+8.2% ↑                       ← Footer (trend or gauge)

─── border-t ───              ← optional divider (rule 15)
Web    Mobile    API          ← bottom stats grid
```

Optional divider: `border-surface-muted`, `pt-5` above, `mt-6` below stats. Bottom grid: `grid grid-cols-{3|4} gap-3`.

---

## 9. List Item Rules

Dashboard list rows display status with a **same-color dot + same-color text** pattern. Status colors come from semantic tokens (`--success`, `--info`, `--warning`).

### Status Indicator
```
●  Completed   →  --success dot + --success text
●  In Progress →  --info dot + --info text
●  Pending     →  --warning dot + --warning text
```

| Element | Size | Ratio |
|---------|------|-------|
| Status dot | `size-1.5` (6px) | — |
| Dot-to-text gap | `me-1.5` (6px) | Same as dot |
| Status text | 11px bold | — |

### Highlighted Row (My Item / Selected)
```
Normal row:   bg-surface-subtle
My row:       bg-brand-tint + border-2 border-brand
Normal rank:  bg-surface-muted + text-text-tertiary
My rank:      bg-brand + text-white
Normal name:  text-text-primary
My name:      text-brand
```
The "my row" highlight is dashboard-specific (rankings, leaderboards, transaction history with the user's own row called out).

---

## 10. Selection UI Placement

In dashboards, selection UI lives in **two places only**: the card header (period/category toggles) and inside charts (donut segment selection). Dropdowns and 5+-option toggles must be moved out of cards into a dedicated page or sheet.

### Allowed Patterns

| Pattern | Usage | Position |
|---------|-------|----------|
| **Pill toggle** | Period/category switch (2–4 options) | Card header right |
| **Chart item selection** | Donut/legend item highlight | Inside chart |

### Pill Toggle (Card Header Right)
- Container: `bg-surface-muted rounded-full p-1`
- Active: `bg-brand text-white rounded-full shadow-sm`, 11px bold, `px-4 py-1.5`
- Inactive: transparent + `text-text-disabled`, same dimensions

```tsx
<div className="flex gap-1 bg-surface-muted p-1 rounded-full">
  <button className="px-4 py-1.5 text-[11px] font-bold rounded-full bg-brand text-white shadow-sm">1W</button>
  <button className="px-4 py-1.5 text-[11px] font-bold rounded-full text-text-disabled">1M</button>
</div>
```

Placement: title on the **left**, toggle on the **right** (`flex justify-between`) inside the card header. Toggle belongs in the header area only, not card content.

### Chart Item Selection (Donut)
Click to toggle one at a time. Selected: brand color + opacity 1.0 + glow. Unselected: gray + opacity 0.3 (legend rows mirror at 0.4). `cursor-pointer` + `transition-all duration-300`.

---

## 11. Briefing/Alert Card Rules

Briefings are the carousel idiom — short alerts/insights stacked horizontally so the user can scan or scroll through them.

### Horizontal Scroll Carousel
- Card width: `w-[280px]` fixed (`flex-shrink-0`).
- Gap: `gap-3` (12px).
- Scrollbar: hidden (`scrollbar-hide`).
- Card style: same as standard cards (`rounded-2xl p-6 shadow-card`).

### Severity Badge Colors
- **Urgent**: `#C85A54` brownish-red (token `--severity-urgent`) — strong but not vivid.
- **Info / Notice**: `text-text-tertiary` — informational kept restrained.
- Icon and text share the same color.
- `uppercase tracking-wide` emphasis on the label.

---

## 13. Page Layout Structure

The 430px page is the dashboard frame. Section gap, bottom-nav clearance, and the max-width are non-negotiable.

### Page Skeleton
```
max-w-[430px]
  TopBar (px-6 pt-8 pb-6)
  PageContent (space-y-6, pb-24)
    Hero card (mx-6)
    KPI grid (px-6)
    Full card section (mx-6)
    Carousel section (px-6)
    Full card section (mx-6)
    h-8 (scroll-end breathing)
  BottomNav (fixed bottom-0)
```

### Key Values

| Property | Value | Description |
|----------|-------|-------------|
| Container max width | `max-w-[430px]` | Mobile viewport |
| Page background | `bg-surface-page` | Light gray (`#FAFAFA` token) — not pure white |
| Section gap | `space-y-6` (24px) | Between all sections |
| Bottom-nav clearance | `pb-24` (96px) | Prevents nav overlap |
| Bottom-most margin | `h-8` (32px) | Scroll-end breathing room |

The page background is **deliberately not white** — the contrast between `bg-surface-page` and `bg-card` is what visually separates sections. See rule 18 for why dividers between sections are forbidden.

---

## 14. Four Section Types

The dashboard has four section types: **A (full card)**, **B (grid)**, **C (carousel)**, **D (hero)**. Every section on every dashboard page belongs to exactly one of these.

### Absolute Rule: All Content Lives Inside Cards
Only TopBar, BottomNav, and carousel titles may sit directly on the page. Everything else (metrics, charts, lists, text) must be wrapped in a card with `bg-card rounded-2xl shadow-card`. Placing content directly on `bg-surface-page` breaks the design.

### Type A: Full Card (Title Inside Card) — `mx-6`
```
bg-card rounded-2xl p-6 shadow-card
  Title (18px bold, mb-4/5/6 by content type — rule 16)
  Content
  ─── border-t ─── (optional, rule 15)
  Bottom stats grid
```
- **Use for**: usage breakdown, charts, recent activity, competitor pricing.
- `mx-6` margin: card appears to float.

### Type B: Grid Container (Collection of Cards) — `px-6`
```
grid grid-cols-2 gap-4
[ Card 1 ] [ Card 2 ]
[ Card 3 ] [ Card 4 ]   each: rounded-2xl p-6 shadow-card
```
- **Use for**: KPI grid (4 metric cards).
- `px-6` padding: grid feels full-width.

### Type C: Carousel (Horizontal Scroll) — `px-6`
```
Title (18px bold, mb-4) ← outside card
[ 280px ][ 280px ][ 280px ] →→→
flex gap-3 overflow-x-auto scrollbar-hide
```
- **Use for**: briefing cards, top products, tips.
- **Title sits outside the card** (above carousel).
- Fixed card width `w-[280px]`, `flex-shrink-0`.

### Type D: Hero Card (Special Large Format) — `mx-6`
```
bg-card rounded-2xl p-8 shadow-card relative overflow-hidden
  [background chart/watermark]    (rule 27)
  [🟣] Label                       z-10
  3.8M (48px)
  +12.4% ↑  vs. last month
```
- **Use for**: hero revenue card, single-most-important metric.
- `p-8` (32px): more generous padding than standard.
- No title, straight to metric.

### `mx-6` vs `px-6` Usage

| Wrapping | Usage | Visual Effect |
|----------|-------|---------------|
| `mx-6` | Single card (Type A, D) | Card appears **floating** |
| `px-6` | Multiple cards or carousel (Type B, C) | Content feels **full-width** |

---

## 15. Card Internal Division Rules

Inside a Type A card with both a chart and a stats grid, a **divider is required** between the two regions. This is the only place dividers appear inside cards.

### Divider Structure
```tsx
{/* Chart area */}
<div className="h-40 -mx-2 mb-6">
  {/* Chart */}
</div>

{/* Divider + bottom stats */}
<div className="grid grid-cols-3 gap-3 pt-5 border-t border-surface-muted">
  {/* Stat items */}
</div>
```

### Bottom Stats Grid

| Columns | Use Case | Example |
|---------|----------|---------|
| `grid-cols-3` | 3 price/stat types | Web, Mobile, API |
| `grid-cols-4` | 4 item types | Remaining days by category |

### Stats Cell Structure
Centered. Label: 11px medium uppercase `text-text-secondary`, `mb-1.5`. Value: 18px bold `text-text-primary leading-none` + 10px unit `ms-0.5`.

---

## 16. Title Margin Rules

The gap between a section title and its content scales with the visual weight of the content.

| Content Type | Title `mb` |
|-------------|-----------|
| List | `mb-4` (16px) — high-density, keep close |
| Donut + legend | `mb-4` — compact |
| Table | `mb-5` (20px) — slightly more room |
| Chart | `mb-6` (24px) — heavy visual weight, give generous space |

---

## 17. Chart Style Rules

Area and bar charts have specific styling that ties them to the brand color and the surface palette.

### Area Chart
- Line: `stroke="var(--brand)"` + `strokeWidth={2.5}`.
- Gradient fill: brand color 15% → 0% (top → bottom).
- No dots displayed (`dot={false}`).
- X-axis: 10px `text-text-tertiary`, axis line/ticks hidden.
- Y-axis: completely hidden.

### Bar Chart
- Only the highest value uses `var(--brand)`; the rest use `bg-surface-muted`.
- Only top corners rounded: `radius={[8, 8, 0, 0]}`.
- Axis lines/ticks hidden.

### Chart Heights

| Chart Type | Height | Margin Adjustment |
|-----------|--------|-------------------|
| Area | `h-40` (160px) | `-mx-2` |
| Bar | `h-44` (176px) | `-mx-1` |

Negative `-mx`: makes the chart slightly wider than the card padding, giving visual breathing room without escaping the card frame.

---

## 18. Layout Prohibitions

These prohibitions are dashboard-specific (universal "no pure black", "no key-color background", and shadow rules live in `craft/anti-ai-slop.md` — don't repeat them here).

### Section Layout Forbidden
```
✗ Placing content directly outside cards (text, metrics, lists)
✗ Placing dividers (hr, border-b, Separator) between sections
✗ Changing section gap to anything other than space-y-6
✗ Using left/right margin/padding other than mx-6 / px-6
✗ Changing card padding to anything other than p-6 (or p-8 for hero)
✗ Changing card radius to anything other than rounded-2xl
✗ Placing floating buttons above the BottomNav
```
**Section separation is achieved through cards + spacing only.** The contrast between `bg-surface-page` and `bg-card` is the natural divider. Dividers (`border-t`) are used **only inside cards** to separate chart from stats grid (rule 15).

### Selection UI Forbidden in Cards
```
✗ Select dropdown (with ▼ arrow) inside cards
✗ Radio buttons / checkbox filters inside cards
✗ Expressing 5+ options as a toggle (use a separate page)
✗ Placing toggles in card content area (header right only)
```

### Card Content Forbidden
```
✗ CTA buttons inside cards (Order, View More, etc.)
✗ Input fields inside cards (input, textarea, select) — see rule 44
✗ Images/illustrations inside data cards
✗ 5+ list items inside one card
✗ 2+ levels of nested cards
```
Cards are **for displaying data**, not **for prompting actions**.

---

## 19. New Page Creation Checklist

When building a new dashboard page from scratch, follow this order.

### Step 1: Page Skeleton
```tsx
<PageShell>           {/* bg-surface-page, max-w-[430px] */}
  <TopBar />          {/* logo + actions + date */}
  <PageContent>       {/* pb-24 space-y-6 */}
    {/* Sections */}
  </PageContent>
  <BottomNav />       {/* fixed bottom */}
</PageShell>
```

### Step 2: Choose One of Four Section Types per Section

| Data Type | Recommended Section Type |
|-----------|------------------------|
| 1 key metric (large number) | **Type D** Hero card |
| 2–4 key metrics | **Type B** Grid (`grid-cols-2`) |
| Chart + supporting data | **Type A** Full card (with `border-t` divider) |
| List (orders, rankings, etc.) | **Type A** Full card (`space-y-3` list) |
| Multiple alerts/briefings | **Type C** Carousel (`w-[280px]`) |
| Status summary (donut, etc.) | **Type A** Full card (chart + legend) |

### Step 3: Internal Structure for Each Card
```
1. Header: [icon badge] + [label 12px uppercase]      (gap-2, mb-3)
2. Metric: [large number] + [small unit]               (2:1 ratio, ms-0.5)
3. Supporting: [trend % + icon] or [gauge]             (mb-3)
4. (Optional) divider + bottom stats grid
```

### Step 4: Color Check
- [ ] Is the brand color used only for active/selected states?
- [ ] Are all card backgrounds `bg-card`?
- [ ] Do all text elements use only `--text-primary/secondary/tertiary/disabled` tokens?
- [ ] Are status colors limited to dot + text (11px) or smaller?

### Step 5: Layout Check
- [ ] Are all section gaps `space-y-6`?
- [ ] Single cards use `mx-6`, multiples/carousels use `px-6`?
- [ ] Card padding is `p-6` (`p-8` for hero only)?
- [ ] Card radius is `rounded-2xl`?
- [ ] No overlapping elements?

### Step 6: Composition Check (rules 61–69)
- [ ] At least 4 sections, no more than 7?
- [ ] No two consecutive sections of the same type?
- [ ] At least 1 chart, 1 list, 1 metric-focused section?
- [ ] KPI grid varies its secondary element across cards (rule 62)?
- [ ] Skyline alternates tall and compact?

---

## 20. Information Pyramid Structure

The dashboard page has a vertical importance gradient. The most important number is at the top; detail rows are at the bottom.

```
▲ Hero (48px) — The single most important metric
▲▲ KPI grid (36px) — 2–4 key metrics
▲▲▲ Status summary (donut/gauge) — Current situation
▲▲▲▲ Alerts/briefings — Items requiring attention
▲▲▲▲▲ Charts — Trends/changes
▲▲▲▲▲▲ Lists — Detailed data
```

### Dashboard-Specific First-Screen Rule
**Above the fold (first screen): only Hero + KPI grid should be visible.** This is dashboard-specific composition — the user's first second of attention answers "how am I doing right now?" with the hero number; the KPI grid answers "which dimensions matter today?" Anything else has to scroll into view.

(The font-size ladder behind this — 48 → 36 → 24 → 18 → 14px — is universal typography craft and lives in `craft/typography.md`. Rule 67 below applies it to dashboard section positions.)

---

## 21. Data Density Rules

A dashboard card surfaces a small, fixed amount of data. More than 4 items per card defeats at-a-glance readability and pushes you toward a list pattern that should live on its own page.

### Items per Card

| Context | Max Items | Reason |
|---------|-----------|--------|
| KPI grid | **4** (2×2) | Maximum for at-a-glance comparison |
| Donut legend | **4** | Limit of distinguishable colors |
| List (orders) | **3–4** | Amount visible without scrolling |
| Rankings | **4** | Top items + my position only |
| Bottom stats | **3–4** (`grid-cols-3/4`) | Fits in one row |
| Carousel cards | **3+** | Flexible since scrollable |

Forbidden inside cards: CTA buttons, input fields, images/illustrations, 5+ list items, 2+ levels of nested cards. Cards display data; they don't prompt actions.

---

## 24. Clickable Surface

In dashboards, only a small set of elements are clickable. Cards and list rows are static — that's a deliberate composition rule, not an oversight.

### Clickable Elements

| Element | Interaction | Feedback |
|---------|-------------|----------|
| TopBar icon button | Tap | Shadow change |
| Donut chart segment | Tap → select/deselect | opacity 0.3 ↔ 1 + brand color change |
| Donut legend item | Tap → select/deselect | opacity 0.4 ↔ 1 + glow |
| Period toggle button | Tap → switch | `bg-brand` + `text-white` |
| Bottom nav item | Tap → page switch | `text-brand` |

### Dashboard-Specific Interaction Forbidden
```
✗ Hover/click effects on cards themselves
✗ Hover highlight on list rows
```
(Universal motion craft — duration tokens, reduced-motion handling, "no parallax", "no card zoom" — lives in `craft/animation-discipline.md`.)

---

## 27. Layering Rules (z-index / Background Decoration)

The hero card uses background decoration — a watermark icon and an underlying chart at low opacity. This is a dashboard-specific pattern and applies **only to hero cards**.

### Card Structure with Background Decoration
```
Layer 0: Background chart   → absolute inset-0 opacity-[0.15]
Layer 1: Watermark icon      → absolute right-6 top-1/2 opacity-[0.06]
Layer 2: Content             → relative z-10
```

- Hero card requires `overflow-hidden` (prevents background from overflowing).
- Content uses `relative z-10` to sit above the background.
- **Background decoration is used only in hero cards** — not in standard Type A cards.

---

## 28. Scroll & Spacing Detail Rules

Dashboard mobile scroll behavior is opinionated: fixed bars top and bottom, smooth carousel snap, generous bottom clearance.

### Content End Spacing

| Position | Value | Reason |
|----------|-------|--------|
| Below last section | `h-8` (32px) | Breathing room at scroll end; fingers don't cover content |
| Above BottomNav | `pb-24` (96px) | Nav doesn't cover content (nav ~56px + safety) |
| Below TopBar | Auto-handled by `space-y-6` | No extra spacing |

### Scroll Behavior
```
✓ TopBar: Always fixed (does not disappear on scroll)
✓ BottomNav: Always fixed (fixed bottom-0)
✓ Only main content scrolls
✗ TopBar collapse/expand (collapsible header forbidden)
✗ BottomNav hide on scroll
```

### Overscroll
- iOS bounce shows `bg-surface-page` (`#FAFAFA` token).
- Top overscroll: page background visible above TopBar (not white/black).
- Bottom overscroll: page background below the `h-8` end spacing.

### Carousel Scroll
```css
scroll-snap-type: x mandatory;     /* Snap per card */
scroll-snap-align: start;          /* Card left-aligned */
-webkit-overflow-scrolling: touch; /* Smooth momentum */
scrollbar-width: none;             /* Hide scrollbar */
```

---

## 32. Large Number Handling

When a metric overflows the card width, **never shrink the font** — bump the unit up one level.

### When Numbers Overflow
- `$18,700,000` → `$18.7M` (bump from raw → M).
- If still overflowing: drop a decimal `$3.84M` → `$3.8M`.
- **Never reduce font size** (it breaks the 2:1 number-to-unit ratio).

### Format Ranges

| Range | Format | Example |
|-------|--------|---------|
| up to 9,999 | Comma + $ | $3,500 |
| 10,000 – 999,999 | K | $18.7K, $999K |
| 1,000,000+ | M | $3.8M |
| 1,000,000,000+ | B | $1.2B |

(Universal text-overflow rules — `truncate` vs `line-clamp-2`, `whitespace-nowrap` for numbers — live in `craft/typography.md`. The dashboard-specific bit is the unit-bumping discipline tied to the 2:1 ratio above.)

---

## 37. Viewport & Responsive Rules

Mobile dashboards are designed at **430px fixed**. Wider screens center the 430px column; they don't scale up.

### Default Frame
```
max-w-[430px] mx-auto    /* Center when exceeding 430px */
min-h-screen              /* Minimum screen height */
bg-surface-page           /* Page background outside 430px */
```

### Screens > 430px (Tablet/Desktop)
- Cards and content **stay within 430px as-is**.
- Outside-430px area: `bg-surface-page` (or `bg-background`).
- No font/padding scaling — maintain mobile proportions.
- **Desktop sidebar / multi-column layouts are out of scope** (design separately).

### Safe Area Handling
```
TopBar:    pt-safe (top notch / Dynamic Island)
BottomNav: pb-safe (bottom home indicator)
Content:   Automatic (pb-24 provides clearance)
```
- `viewport-fit=cover` required (set in `index.html`).

---

## 38. Chart Type Selection Guide

Picking the right chart for the data shape is part of dashboard composition.

| Data Characteristic | Chart Type | Reason |
|--------------------|------------|--------|
| Change over time | **Area chart** | Visualize trend as filled area |
| Compare items (by period) | **Bar chart** | Optimal for size comparison |
| Part-to-whole ratio | **Donut chart** | Visualize composition |
| Simple progress (%) | **Progress bar** | Express 0–100% |
| Achievement (n/N) | **Segment bar** | Express discrete progress |
| Single key figure | **Large number (metric)** | Number is more effective than chart |

### Chart Prohibitions (Dashboard-Specific)
```
✗ 3D charts
✗ Dual-axis charts (dual Y-axis)
✗ Stacked bar charts
✗ Radar / radial charts
✗ More than 1 chart per card
```

---

## 39. Notification Severity

Inline notifications inside cards use a 4-color severity system. Inline (in-card) is the dashboard idiom; toasts are for action results, not data warnings.

| Severity | Background | Left Border | Icon | Text Color | Example |
|----------|-----------|-------------|------|-----------|---------|
| Critical | `bg-destructive/8` | 4px `border-destructive` | AlertCircle | `text-destructive` | Storage depleted |
| Warning | `bg-warning/8` | 4px `border-warning` | AlertTriangle | `text-warning` | Price change |
| Info | `bg-info/8` | 4px `border-info` | Info | `text-info` | Goal achievement |
| Success | `bg-success/8` | 4px `border-success` | CheckCircle | `text-success` | Delivery complete |

### Inline vs Toast Decision

| Situation | UI |
|-----------|-----|
| Data-related warning (inventory, price) | **Inline** (inside the relevant card) |
| Action result confirmation (save, delete) | **Toast** |
| Connection status change | **Toast** |
| System maintenance | **Page-top banner** |

```tsx
<div className="rounded-xl p-4 bg-destructive/8 border-l-4 border-destructive">
  <div className="flex items-center gap-2">
    <AlertCircle className="size-4 text-destructive" />
    <span className="text-[14px] font-medium text-destructive">Storage warning</span>
  </div>
</div>
```

---

## 40. Design System Application Guide

When porting this dashboard system to a new domain (fintech, healthcare, e-commerce), change the brand color and the data labels — keep the structure.

### Step 1: Change Key Color
```css
:root {
  --brand: /* your brand color here */;
}
```
- Updating just the brand token shifts: icon badges, progress bars, toggles, nav, donut highlight — every brand-color use.
- Keep grayscale and surface tokens **as-is** (they work with any brand color).

### Step 2: Domain Adaptation

| Generic | E-Commerce | Healthcare | Finance |
|--------------------|---------------|----------------|-------------|
| Sales Hero | Sales Hero | Steps Today | Total Assets |
| 4 KPIs | Orders/Shipping/Returns/Visits | Heart Rate/BP/Sleep/Calories | Income/Expenses/Savings/Investments |
| Inventory Donut | Category Breakdown | Nutrient Ratio | Asset Allocation |
| Price Chart | Sales Trend | Weight Change | Returns Trend |
| Order List | Recent Orders | Recent Records | Recent Transactions |
| Competitor Ranking | Popular Products | Rankings | Fund Returns |

### Step 3: Keep the Page Structure
```
1. TopBar (logo + actions)
2. Hero card (the single most important metric)
3. KPI grid (2–4 key indicators)
4. Detail sections (charts, lists, donuts)
5. BottomNav (3–5 tabs)
```

### Step 4: Do NOT Change These
```
✗ 5-level grayscale palette
✗ Card radius (rounded-2xl)
✗ Card shadow (`shadow-card`)
✗ Section spacing (space-y-6)
✗ Number/unit 2:1 ratio
✗ Label uppercase + tracking
✗ Page background (`bg-surface-page`)
```
These are the dashboard system's signature. Changing only brand color and domain labels keeps a unified feel.

---

## 42. Bottom Nav Details

The dashboard's bottom nav is fixed, shows up to 5 tabs, and supports a notification badge.

| Property | Value |
|----------|-------|
| Max tabs | **5** (4 recommended) |
| Icon size | 20px |
| Label size | 10px semibold |
| Active color | `text-brand` |
| Inactive color | `text-text-disabled` |
| Notification badge | Top-right of icon, `size-1.5 bg-alert-badge` |
| Re-tap active tab | **Scroll to top of page** |

(Universal nav semantics — back button, page transitions — live in `skills/design-engine/SKILL.md`. The bottom-nav 5-tab layout, the notification badge styling, and the re-tap-to-top behavior are dashboard-specific.)

---

## 44. Forms Outside Cards

**No input fields inside dashboard cards.** If a form is needed, push it to a separate page or a bottom sheet. Inputs and CTAs break the data-density discipline of cards (rule 21).

### Why Not in Cards
- Cards are read-only at-a-glance data surfaces.
- Inputs require focus, validation, error states — none of which compose with KPI density.
- A "settings inside a card" pattern always degrades to nested cards or scrolling-inside-cards. Move it out.

(Universal form-validation rules — 16px iOS-zoom-prevention minimum, `validate-on-blur`, label + error wiring, IME `compositionend` handling — live in `craft/form-validation.md`.)

---

## 48. Divider & Border Detail Rules

Inside dashboards, dividers appear in only two places.

### Allowed Dividers

| Position | Style | Spacing |
|----------|-------|---------|
| Inside card: between chart and stats grid | `border-t border-surface-muted` | Above `pt-5`, below `mt-6` |
| Top of BottomNav | `border-t border-surface-muted` | None |

### Border Usage (Dashboard-Specific)

| Purpose | Style |
|---------|-------|
| Highlighted "my row" | `border-2 border-brand` |
| Notification severity | `border-l-4 border-{severity}` (rule 39) |

(Universal anti-slop rules — "separate cards with shadow not border", "no vertical dividers", "no card borders by default" — live in `craft/anti-ai-slop.md`.)

---

## 52. Design Reference Width & Resolution

Dashboards are designed at 430px (iPhone Pro Max), not 375px (iPhone SE). 1x and 2x assets are sufficient.

### Reference Width

| System | Reference Width | Description |
|--------|----------------|-------------|
| Common reference | 375px | iPhone SE / 8 |
| **This System** | **430px** | iPhone Pro Max |

- Screens > 430px: `max-w-[430px] mx-auto` center alignment.
- Screens < 430px: content scales down naturally — watch fixed-px elements.

### Asset Resolution
- **1x + 2x** is sufficient. 3x only when graphic quality is critical.
- Avoid excessive resolution group management (memory + load delays).

### Test Devices
- 2–3 devices with different aspect ratios.
- 1 device with large safe-area (iPhone 15 Pro etc.).
- 1 small-screen device (iPhone SE / compact Android).

---

## 53. Component Composition & Screen Structure

The dashboard screen has a fixed top-to-bottom order, and certain compositions are forbidden because they nest data containers inside data containers.

### Screen Composition Order
```
1. TopBar — required, top of every screen
2. Hero / Main content — most important information
3. Supporting sections — grouped in cards with space-y-6
4. BottomNav (or BottomCTA on non-dashboard pages)
```

### Composition Prohibitions
- No nested cards (SectionCard inside SectionCard, StatCard inside HeroCard).
- No carousel inside carousel; no bottom sheet inside bottom sheet.

Pattern components have built-in padding — use auto-layout `gap` rather than ad-hoc margin. Solve with composition before reaching for new primitives.

---

# Part 3: Visual Rhythm and Composition Recipes

> Rules 61–69 are also exposed via the `composition-recipes` skill when scaffolding pages. They live here because the section-type vocabulary (A/B/C/D) is dashboard-specific.

---

## 61. Visual Rhythm — Breaking Monotony

### The Core Problem
AI tends to generate repetitive layouts: 4 identical StatCards, then a list, then another list. Professional designers create **visual rhythm** — alternating density, height, and element types.

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
| **Tall** | 200–300px | Hero card, chart card, donut card |
| **Medium** | 120–180px | KPI grid (2×2), usage breakdown with progress bars |
| **Compact** | 80–120px | Briefing carousel, ranked list (3 items) |

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
| Card 1 | Metric + unit | **Trend arrow** (up/down %) | Revenue $48.2K ↑ +8.2% |
| Card 2 | Metric only | **Trend arrow** | Users 12,840 ↑ +3.1% |
| Card 3 | Metric + unit | **Mini progress bar** (`h-2`) | Storage 68% [████░░] |
| Card 4 | Metric + unit | **Comparison text** | Orders 342 (vs 380 last week) |

### Variation Toolkit

| Element | When to Use | Visual |
|---------|------------|--------|
| **Trend % + arrow** | Time-based comparison | `+8.2% ↑` in success/destructive |
| **Mini progress bar** | Ratio/capacity metric | Thin bar (`h-2`) below metric |
| **Comparison text** | Period comparison | `vs 380 last week` in tertiary |
| **Sparkline** | Trend without specific % | Tiny inline chart (`h-8`, no axes) |
| **Status dot** | State indicator | `● Active` / `● Warning` |
| **Sub-metric** | Breakdown hint | `Desktop 60% · Mobile 40%` in caption |

### Rules
- Use **at most 2 cards with the same secondary element** in a 4-card grid.
- If all 4 metrics have trends, vary anyway: 2 with trend %, 1 with progress, 1 with comparison.
- The most important metric gets the **top-left** position (reading order).

---

## 63. Section Composition Recipes

### Recipe 1: SaaS Dashboard
```
1. Hero Card (D)          — MRR or total revenue, big number
2. KPI Grid (B)           — 4 varied cards (revenue, users, churn, conversion)
3. Chart Card (A)         — Revenue trend (area chart) + period toggle
4. Carousel (C)           — AI insights / alerts / briefings
5. Progress Card (A)      — Usage breakdown (3 progress bars)
6. List Card (A)          — Recent activity (3–4 items with status dots)
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
6. List Card (A)          — Real-time events (3–4 items)
```

### Recipe 4: Finance / Fintech
```
1. Hero Card (D)          — Total balance or portfolio value
2. KPI Grid (B)           — Income, expenses, savings rate, investments
3. Donut Card (A)         — Asset allocation (interactive)
4. Chart Card (A)         — Balance trend (area chart, 1W/1M/3M toggle)
5. List Card (A)          — Recent transactions (amount + status)
6. Carousel (C)           — Financial tips / alerts
```

### Recipe Rules
- **First screen (above the fold)**: Always Hero + KPI Grid — answer "how am I doing?" instantly.
- **Middle sections**: Alternate between charts and lists — never two charts in a row.
- **Bottom sections**: Lower priority info (activity logs, alerts).
- Every recipe has **exactly one chart type per card** — never combine two charts.
- Every recipe includes **at least one non-data section** (carousel/briefing) to break the pattern.

---

## 64. Element Diversity Within Cards

### Section Card Content Types
Mix these across your page so the content shapes alternate:

| Content Type | Visual Character | Best Paired After |
|-------------|-----------------|------------------|
| **Progress bars** (2–4 items) | Horizontal lines, compact | Chart card or KPI grid |
| **Ranked list** (3–4 items) | Numbers + names, dense | Donut chart or hero |
| **Status list** (3–4 items) | Dots + labels, scannable | Chart card |
| **Stat grid** (3–4 items below divider) | Numbers in columns | Chart (as footer below `border-t`) |
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
✓ At least 1 chart-based section per page
✓ At least 1 list-based section per page
✓ At least 1 metric-focused section (KPI grid or hero)
✓ Maximum 2 of the same content type per page
```

---

## 65. Color Accent Distribution

### Per-Page Accent Inventory
The brand color creates impact through **scarcity**. On a single dashboard page, the accent should appear in roughly:

```
✓ 1 hero card icon badge
✓ 4 KPI card icon badges (small, 10% opacity)
✓ 1 active bottom nav item
✓ 1–2 progress bar fills
✓ 1 chart highlight (selected segment or line)

That's it. Everything else is grayscale.
```

(The universal "accent through restraint" principle is in `craft/color.md`. The list above is the dashboard-specific budget.)

### Status Color Diversity in Lists
Don't cluster all status colors in one area:
```
✗ Bad: All 3 list items have green "Completed" status
✓ Good: 1 green (Completed) + 1 blue (In Progress) + 1 yellow (Pending)
```
Vary status states across rows to create visual interest through color diversity.

---

## 66. Card Size Variation

### Not All Cards Should Be the Same Height

| Card Purpose | Padding | Internal Spacing | Resulting Height |
|-------------|---------|-----------------|-----------------|
| **Hero** | `p-8` | Generous `gap-3` | ~200px (tallest) |
| **Stat / KPI** | `p-6` | Tight `gap-2` | ~140px |
| **Chart** | `p-6` | Chart `h-40` + stats | ~280px |
| **List** | `p-6` | `space-y-3` items | ~200px (3 items) |
| **Progress** | `p-6` | `space-y-4` bars | ~180px |

### The Skyline Rule
Looking at your page from the side, the card heights should create an **interesting skyline**, not a flat wall:
```
✓ Good skyline:  ██ ▄▄ ████ ▄▄ ██ ▄▄▄
✗ Bad skyline:   ██ ██ ██ ██ ██ ██
```

Achieve this by alternating between:
- KPI Grid (short individual cards) and Full Cards (taller).
- Chart cards (tall) and list cards (medium).
- Carousel (compact, horizontal) after any tall section.

---

## 67. Progressive Information Density

### Top-to-Bottom Density Gradient (Dashboard Section Position)

| Position | Density | Elements | Font Sizes |
|----------|---------|----------|-----------|
| **Top** (Hero) | Low — 1 big number | Single metric + trend | 48px / 24px |
| **Upper** (KPI) | Medium — 4 numbers | Grid of metrics | 36px / 18px |
| **Middle** (Charts) | Medium — visual data | Chart + 3–4 stat items | 18px / 11px |
| **Lower** (Lists) | High — many items | 3–4 rows of data | 14px / 11px |
| **Bottom** (Activity) | Highest — detailed | Timestamps, statuses | 13px / 11px |

### Rules
- Information density **increases** as you scroll down.
- Font sizes **decrease** as you scroll down.
- White space **decreases** as you scroll down.
- This creates a natural "zooming in" effect: overview → details.

(The general decreasing-font-size hierarchy is universal typography in `craft/typography.md`. The exact size ladder by dashboard section position above is the specialty application.)

---

## 68. Empty Page Prevention

### Minimum Section Count
A dashboard page should have **at least 4 sections** to feel complete:
```
✗ Too sparse: Hero + KPI Grid only (2 sections — feels empty)
✗ Too sparse: Hero + KPI + one list (3 sections — almost there)
✓ Minimum viable: Hero + KPI + chart/progress + list (4 sections)
✓ Ideal: Hero + KPI + chart + progress/donut + list + carousel (5–6 sections)
✗ Too dense: 8+ sections (overwhelming, consider splitting into tabs)
```

### When a Section Has No Data
- Show the section with an EmptyState — **don't remove it**.
- Removing sections changes the page rhythm and makes it feel broken.
- Empty states maintain layout consistency: "No activity yet. Create your first project."

(Universal empty-state structure — icon + message + suggested next action, zero-as-zero, retry pattern — is in `craft/state-coverage.md`. The "min 4 / max 7" count and "show empty state, never remove the section" composition rule is dashboard-specific.)

---

## 69. Chart + Context Pairing

### Never Show a Chart Alone — Always Pair with Context

| Chart Type | Required Context | Placement |
|-----------|-----------------|-----------|
| **Area chart** | Period toggle (1W/1M/3M) + 2–3 stat items below `border-t` | Toggle in header, stats in footer |
| **Bar chart** | Category labels on X-axis + highlight color on max bar | Labels below bars |
| **Donut chart** | Center value + legend list (3–4 items) with click interaction | Legend beside or below |
| **Progress bars** | Label + percentage text on each bar | Label left, % right |

### Stat Footer Patterns (below `border-t` in chart cards)
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
- A chart without context numbers is **decoration, not information**.
- Always show the **current value** prominently (not just the trend line).
- Period toggles: max 3 options (1W / 1M / 3M), use pill toggle style.
- Stat footer items: max 4 columns (`grid-cols-3` or `grid-cols-4`).

---

## Core Composition Principles Summary

### Composition Grammar (4)
1. All content lives inside cards. Page background is the natural divider.
2. `mx-6` = single card; `px-6` = grid or carousel.
3. `space-y-6` between every section. Card radius `rounded-2xl`. Card padding `p-6` (`p-8` for hero).
4. Section separation comes from cards + spacing only — never `border-b`/`hr`/`Separator` between sections.

### Section Vocabulary (4)
5. Four section types: A (full card), B (grid), C (carousel), D (hero).
6. The first screen is Hero + KPI Grid. Everything else scrolls.
7. Max 4 items per card — anything more belongs on its own page.
8. No CTAs, inputs, or 5+ list items inside cards.

### Numbers and Charts (3)
9. 2:1 number-to-unit ratio. Bump units (`$18.7M`), never shrink fonts.
10. Brand color highlights one chart segment, not the whole chart.
11. Charts always pair with context (period toggle + stat footer).

### Rhythm (4)
12. Never repeat the same section type twice in a row.
13. Vary KPI secondary element across the 4-card grid.
14. Skyline: alternate tall and compact section heights.
15. Min 4, max 7 sections per page. Empty sections show an EmptyState, never get removed.
