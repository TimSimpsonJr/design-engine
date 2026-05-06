---
name: design-engine
description: Use when building, modifying, reviewing, or designing UI — components, pages, screens, layouts, styles, themes, design tokens, or visual patterns. Carries design rules, the typography token system, color hierarchy, accessibility minimums, and the prohibited-practices list. Do not use for backend, API, database, build config, tests, or non-UI code.
---

> **Active configuration:** When working in a project, check `.design-rules/config.json` for the active adapter, skin, and recipe. If the file is not present, this skill provides reference content but no project-specific config — suggest the user run `/design-init` to capture design decisions as artifacts.
>
> **Stack-agnostic note:** This skill describes the canonical engine. The reference implementation uses React + Tailwind v4 + shadcn-style primitives — see the `react-shadcn` adapter for verbatim port from styleseed. Other adapters (`astro`, `sveltekit`, `obsidian-css`, `plain-css`) translate the same engine to their idioms. Code examples below use Tailwind v4 utility classes; non-Tailwind adapters apply the same semantic rules using their stack's idiom.

# Design Engine

A brand-agnostic design engine that makes AI produce professional-quality UI.
The engine provides layout rules, components, and skills. The skin provides colors and fonts.

## Golden Rules (NEVER break these)

```
 1. All content inside cards — NEVER on bare page background
 2. Single accent color (--brand) — everything else grayscale
 3. No pure black (#000) — darkest text is defined by skin (~#2A2A2A)
 4. Numbers 2:1 with units — 48px number + 24px unit, always
 5. space-y-6 between sections · mx-6 for single cards · px-6 for grids
 6. Never repeat same section type consecutively — create visual rhythm
 7. Card shadows ≤ 8% opacity — if visible, it's too strong
 8. Touch targets ≥ 44×44px — no tiny tap areas
 9. Semantic tokens only (text-brand, bg-card) — NEVER hardcode hex in components
10. Font sizes from the "Font Size by Context" table ONLY — don't guess
11. After generating ANY page → run /design-review to verify compliance
```

Reference this guide when Claude Code sets up a new project or implements UI.

## Token Customization

### Colors
Modify in `:root` of `src/styles/theme.css`:

| Variable | Purpose | Default |
|----------|---------|---------|
| `--brand` | Brand accent color | Defined by skin (e.g. `#721FE5` for Toss) |
| `--primary` | Buttons, links, primary UI | `#030213` |
| `--destructive` | Error/danger | `#d4183d` |
| `--success` | Success indicator | `#6B9B7A` |
| `--warning` | Warning | `#D97706` |
| `--info` | Information | `#3B82F6` |

Other semantic tokens (`--background`, `--foreground`, `--muted`, etc.) typically don't need changes.

### Typography
- Default font: Inter (Latin) + Pretendard (option for Korean/CJK projects)
- To change: modify the `css/fonts.css` import + update font-family in `css/base.css`
- Default size: 16px (`--font-size`)

#### Font Size Scale (14 steps)
| Token | Size | Usage |
|-------|------|-------|
| `2xs` | 10px | Micro text, units |
| `xs` | 11px | Small labels, status text |
| `sm` | 12px | Captions, badges, secondary labels |
| `caption` | 13px | Subtitles, dates, trend values |
| `base` | 14px | Body default, list titles |
| `body` | 15px | In-card body text |
| `md` | 16px | Inputs, buttons |
| `subhead` | 17px | Amounts, emphasized text |
| `lg` | 18px | Section titles, card headers |
| `xl` | 20px | h2 |
| `2xl` | 24px | h1 |
| `3xl` | 30px | Large headings |
| `4xl` | 36px | KPI metrics |
| `5xl` | 48px | Hero numbers |

#### Line Height Rules (by size)
| Text Size | Line Height | Tailwind | Reason |
|-----------|-------------|----------|--------|
| 36-48px (display) | 1.0 | `leading-none` | Large numbers stay tight |
| 18-24px (heading) | 1.35 | `leading-snug` | Headings slightly tighter |
| 14-17px (body) | 1.5 | `leading-normal` | Readability |
| 10-13px (caption) | 1.5–1.65 | `leading-normal`–`leading-relaxed` | Small text needs more space |

#### Letter Spacing Rules (by size)
| Text Size | Tracking | Value | Reason |
|-----------|---------|-------|--------|
| 36-48px (display) | tighter | `-0.02em` | Large text needs tighter tracking |
| 18-24px (heading) | tight | `-0.01em` | Headings slightly tighter |
| 14-17px (body) | normal | `0em` | Default |
| 10-13px uppercase | wide | `0.05em` | Uppercase labels need wider tracking |

#### Font Weights
- **400 (normal)**: Body text, descriptions
- **500 (medium)**: Labels, buttons, default headings
- **600 (semibold)**: Nav labels, emphasized captions
- **700 (bold)**: Metric values, list titles, section headers

#### Font Size by Context (USE THIS — don't guess sizes)

| Context | Number | Unit | Label | Tailwind Example |
|---------|--------|------|-------|-----------------|
| **Hero card** | `text-[48px]` | `text-[24px]` | `text-[12px] uppercase` | `<p class="text-[48px] font-bold">3.8<span class="text-[24px]">M</span></p>` |
| **KPI card** | `text-[36px]` | `text-[18px]` | `text-[12px] uppercase` | `<p class="text-[36px] font-bold">$48.2<span class="text-[18px]">K</span></p>` |
| **Section title** | — | — | `text-[18px] font-bold` | `<h3 class="text-[18px] font-bold">Recent Activity</h3>` |
| **List item name** | — | — | `text-[14px] font-bold` | `<p class="text-[14px] font-bold">Acme Corp</p>` |
| **List item amount** | `text-[17px]` | `text-[11px]` | — | `<span class="text-[17px] font-bold">$8,400</span>` |
| **Chart stat footer** | `text-[18px]` | `text-[10px]` | `text-[11px] uppercase` | `<span class="text-[18px] font-bold">42<span class="text-[10px]">ms</span></span>` |
| **Trend %** | `text-[13px]` | — | — | `<span class="text-[13px] text-success font-bold">+8.2%</span>` |
| **Subtitle/date** | — | — | `text-[13px] text-text-tertiary` | `<p class="text-[13px] text-text-tertiary">April 7, 2026</p>` |
| **Status dot text** | — | — | `text-[11px] font-bold` | `<span class="text-[11px] font-bold" style="color: #22C55E">Completed</span>` |
| **Badge label** | — | — | `text-[12px] uppercase tracking-wide` | `<span class="text-[12px] font-bold uppercase tracking-[0.05em]">ALERT</span>` |

**Rule: NEVER pick a font size that's not in this table.** If unsure, use the closest context match.

#### IMPORTANT: Font Size Anti-Pattern

```
✗ NEVER create CSS variables for font sizes (e.g., --text-sm, --fs-body)
  → Tailwind v4 uses --text-* namespace internally. Custom --text-* variables
    WILL conflict and break line-height, letter-spacing, and icon sizing.

✗ NEVER use text-[var(--anything)] for font sizes
  → Tailwind v4 interprets text-[var(--x)] as COLOR, not font-size!
  → Result: `color: 13px` (invalid) instead of `font-size: 13px`
  → Even text-[length:var(--x)] is fragile — requires 860+ replacements if wrong

✗ NEVER change --font-size in theme.css
  → All rem-based spacing (h-14, px-6, gap-3) depends on root font-size
  → Changing it breaks icon sizes, nav text, button padding — everything

✓ ALWAYS use explicit px values: text-[36px], text-[18px], text-[13px]
  → This is intentional, not a hack. The "Font Size by Context" table above
    IS the token system. Look up the context, use the exact class.
  → Explicit px values are predictable, don't conflict, and never break.
```

### Spacing
- Uses Tailwind default utilities
- 6px multiples recommended: `p-1.5`(6px), `p-3`(12px), `p-6`(24px)
- Page horizontal padding: `px-6` (24px)
- Between sections: `space-y-6` (24px)

### Border Radius
- Default: `--radius: 0.625rem` (10px)
- Cards: `rounded-2xl` (16px)
- Inputs/buttons: `rounded-md` (based on --radius)

### Shadows
- `--shadow-card`: Card default (`0 1px 3px rgba(0,0,0,0.04)`)
- `--shadow-card-hover`: Hover (`0 2px 4px rgba(0,0,0,0.08)`)
- `--shadow-elevated`: Floating (`0 4px 12px rgba(0,0,0,0.08)`)
- `--shadow-modal`: Modal (`0 8px 24px rgba(0,0,0,0.12)`)

## Critical Layout Rule: mx-6 vs px-6

> **This is the most common mistake. Get this right.**

| Wrapping | Use For | Effect |
|----------|---------|--------|
| `mx-6` | Single card (SectionCard, HeroCard) | Card **floats** with side margins |
| `px-6` | Multi-card grid or carousel | Content **fills** edge to edge |

```
✓ SectionCard already has mx-6 built in — do NOT add another mx-6 wrapper
✓ HeroCard already has mx-6 built in — do NOT add another mx-6 wrapper
✓ KPI grid needs px-6 on the grid container: <div className="grid grid-cols-2 gap-4 px-6">
✓ Carousel needs px-6 on the scroll container
✗ Never use px-4, mx-4, px-8, mx-8 — only px-6 and mx-6
```

## Component Usage Rules

### Import Pattern
```tsx
import { Button } from "@/components/ui/button"
import { cn } from "@/components/ui/utils"
```

### Component Conventions
- Use `data-slot="component-name"` attribute on all components
- Always use `cn()` for className composition (no template literals)
- Use CVA (`class-variance-authority`) for variant management
- Use `React.ComponentProps<>` for props typing
- Support `className` prop on all visual components
- Use `asChild` + Radix `Slot` for composition

### New Component Template
```tsx
import * as React from "react"
import { cn } from "./utils"

function MyComponent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="my-component"
      className={cn("base-classes-here", className)}
      {...props}
    />
  )
}

export { MyComponent }
```

### Adding Tier 2 Components
For components not included in the seed, check shadcn/ui registry for additional components:
(calendar, carousel, chart, command, context-menu, drawer, hover-card, input-otp, menubar, navigation-menu, pagination, resizable, sidebar, slider, sonner, breadcrumb, collapsible, alert-dialog, aspect-ratio)

## Color Usage Cheatsheet

All values below are defined by the active skin.

### Text Hierarchy
| Usage | Tailwind Class |
|-------|---------------|
| Metrics/titles | `text-text-primary` |
| Labels/captions | `text-text-secondary` |
| Subtitles/axis labels | `text-text-tertiary` |
| Inactive/disabled | `text-text-disabled` |
| Default icons | `text-icon-default` |

### Backgrounds/Surfaces
| Usage | Tailwind Class |
|-------|---------------|
| Page background | `bg-surface-page` |
| List items | `bg-surface-subtle` |
| Progress bars/borders | `bg-surface-muted` |
| Brand tint (selected row) | `bg-brand-tint` |
| Card background | `bg-card` |
| Pure background | `bg-background` |

### UI Colors
| Usage | Tailwind Class |
|-------|---------------|
| Brand accent | `text-brand` / `bg-brand` |
| Primary button | `bg-primary` |
| Success/up | `text-success` |
| Error/danger | `text-destructive` |
| Warning | `text-warning` |
| Info | `text-info` |
| Alert badge | `bg-alert-badge` |
| Border | `border-border` |

## Pattern Components

Below are 12 patterns defined as both **structural specs** (what each pattern *is*, abstractly) and **React/Tailwind v4 reference implementations** (canonical, in `react-shadcn` adapter). Other adapters provide their own templates implementing the same structural specs.

When generating UI in a non-React project, follow the structural spec — element hierarchy, sizing, spacing, color usage — but use your active adapter's idiom for the markup.

### `<StatCard>` — Stats Card

**Structural spec:** Card with leading icon; small uppercase label; large metric value (36px) paired 2:1 with unit (18px); optional trend indicator below. Used in 2-column grids.

```tsx
import { StatCard } from "@/components/patterns/stat-card"
import { CreditCard } from "lucide-react"

<StatCard
  icon={CreditCard}
  label="Today's Revenue"
  value="48.2"
  unit="K"
  trend={{ value: "+8.2%", direction: "up" }}
/>
```

### `<PageShell>` + `<PageContent>` — Mobile Page Wrapper

**Structural spec:** Outer fixed-width container (default 430px) centered on viewport; vertical stack of TopBar + scrollable PageContent + BottomNav; safe-area aware.

```tsx
import { PageShell, PageContent } from "@/components/patterns/page-shell"

<PageShell maxWidth="430px">
  <TopBar />
  <PageContent>
    {/* sections */}
  </PageContent>
  <BottomNav />
</PageShell>
```

### `<TopBar>` + `<TopBarAction>` — App Header

**Structural spec:** Fixed-height header row; logo or title on the left, optional 13px subtitle below; right-aligned action icons in 44×44 hit areas; optional notification badge.

```tsx
import { TopBar, TopBarAction } from "@/components/patterns/top-bar"
import { Bell } from "lucide-react"

<TopBar
  logo={<Logo />}
  subtitle="March 30, 2026"
  actions={
    <TopBarAction badge>
      <Bell className="size-[18px] text-icon-default" />
    </TopBarAction>
  }
/>
```

### `<BottomNav>` — Bottom Navigation

**Structural spec:** Fixed bottom row of 3-5 equal-width items; each item is icon + 11px label, vertically stacked, 44×44 minimum hit area; active item uses brand color.

```tsx
import { BottomNav } from "@/components/patterns/bottom-nav"
import { Home, Package, TrendingUp, Settings } from "lucide-react"

<BottomNav
  items={[
    { name: "Home", icon: Home },
    { name: "Orders", icon: Package },
    { name: "Analytics", icon: TrendingUp },
    { name: "Settings", icon: Settings },
  ]}
  activeIndex={0}
/>
```

### `<EmptyState>` — Empty State

**Structural spec:** Centered vertical stack inside a card; large neutral icon, 18px bold title, 14px secondary description, optional primary action button below.

```tsx
import { EmptyState } from "@/components/patterns/empty-state"
import { Package } from "lucide-react"
import { Button } from "@/components/ui/button"

<EmptyState
  icon={Package}
  title="No orders yet"
  description="Add a new order to get started"
  action={<Button>Add Order</Button>}
/>
```

### `<ListItem>` — List Item

**Structural spec:** Horizontal row inside a card; leading content (avatar/icon optional), title (14px bold) + optional status pill, trailing value or chevron; minimum 44px tall.

```tsx
import { ListItem } from "@/components/patterns/list-item"

<ListItem
  title="Acme Corp, Downtown"
  status={{ label: "Completed", color: "#22C55E" }}
  trailing={<span className="font-bold">$8.4K</span>}
/>
```

### `<HeroCard>` — Hero Metric Card

**Structural spec:** Card with watermark icon background; large 48px metric value with 24px unit; label above; trend indicator below. Single hero card per page, mx-6 wrapping.

```tsx
import { HeroCard } from "@/components/patterns/hero-card"
import { Wallet } from "lucide-react"

<HeroCard
  icon={Wallet}
  label="Total Revenue This Month"
  value="3.8"
  unit="M"
  trend={{ value: "+12.4%", direction: "up", label: "vs last month" }}
  watermarkIcon={Wallet}
/>
```

### `<SectionCard>` — Section Card Wrapper

**Structural spec:** Standard card with built-in mx-6 horizontal margin, rounded-2xl corners, subtle shadow; optional 18px bold title; arbitrary children inside; used as the default content container.

```tsx
import { SectionCard } from "@/components/patterns/section-card"

<SectionCard title="Recent Activity">
  {/* inner content */}
</SectionCard>
```

### `<BriefingCarousel>` — Alert Card Carousel

**Structural spec:** Horizontal-scrolling row of alert cards; each card has icon, colored badge, 14px bold title, 13px description; container uses px-6 (not mx-6) for edge-to-edge scroll.

```tsx
import { BriefingCarousel } from "@/components/patterns/briefing-carousel"
import { AlertCircle } from "lucide-react"

<BriefingCarousel
  title="Today's Briefing"
  items={[
    { icon: AlertCircle, badge: "Urgent", badgeColor: "#C85A54",
      title: "Storage capacity warning", description: "18.2 GB remaining" },
  ]}
/>
```

### `<ChartCard>` — Chart Card (Period Toggle + Bottom Stats)

**Structural spec:** Card with 18px title row + period toggle pills (1W/1M/3M etc.); chart area in the middle; footer row of label/value/unit stats below. Single chart card per section.

```tsx
import { ChartCard } from "@/components/patterns/chart-card"

<ChartCard
  title="Revenue Trend"
  periods={["1W", "1M", "3M"]}
  activePeriod="1W"
  onPeriodChange={setPeriod}
  stats={[
    { label: "Web", value: "1,648", unit: "/unit" },
    { label: "Mobile", value: "1,520", unit: "/unit" },
  ]}
>
  {/* Recharts or other chart component */}
</ChartCard>
```

### `<DonutChartCard>` — Donut Chart Card

**Structural spec:** Card with donut chart; center value (large) + unit + label stacked in the donut hole; legend list of items with values/units; optional bottom stats row.

```tsx
import { DonutChartCard } from "@/components/patterns/donut-chart-card"

<DonutChartCard
  title="Usage Breakdown"
  centerValue={66}
  centerUnit="%"
  centerLabel="Average"
  items={[{ name: "Web", value: 80, stock: 32.0, unit: "GB" }]}
  chartElement={/* PieChart */}
  bottomStats={[{ label: "Web", value: 8, subLabel: "days" }]}
/>
```

### `<RankedList>` — Ranked List

**Structural spec:** Card with ordered list of items showing rank number, name, value; one row may be highlighted with brand-tint and a "you" badge; optional footer line for context.

```tsx
import { RankedList } from "@/components/patterns/ranked-list"

<RankedList
  title="Competitor Pricing"
  items={[
    { rank: 1, name: "Acme Corp", value: "$1,520" },
    { rank: 2, name: "My Store", value: "$1,528", isHighlighted: true, badge: "My Store" },
  ]}
  footer="Last 30 days · All regions"
/>
```

## Tech Stack (canonical reference)

- React 18 + TypeScript (in `react-shadcn` adapter)
- Vite 6 + @tailwindcss/vite
- Tailwind CSS v4 (CSS-first, no tailwind.config.js)
- Radix UI-based components
- class-variance-authority + clsx + tailwind-merge
- Lucide React icons
- Optional additions: Recharts, Motion (Framer Motion), react-hook-form

Other adapters target different stacks. Check `.design-rules/config.json:adapter` for what's active in the current project.

## File Structure

```
src/
  styles/
    fonts.css          # Font imports
    theme.css          # CSS custom properties + @theme inline
    base.css           # Base element styles
    index.css          # Entry point
  components/
    ui/                # Primitive components (shadcn-style)
    patterns/          # Composed pattern components
  app/
    App.tsx            # Main app component
  main.tsx             # React entry point
```

## Dark Mode

Uses `.dark` class strategy:
```css
@custom-variant dark (&:is(.dark *));
```
All semantic tokens have dark mode values defined in theme.css.

## Motion / Animation

Uses motion tokens defined as CSS variables:
- `--duration-fast` (100ms): Hover, color changes
- `--duration-normal` (200ms): Enter animations, expand
- `--duration-slow` (350ms): Page transitions, spring effects
- `--ease-default`: Default easing
- `--ease-spring`: Elastic micro-interactions

```tsx
// Example: using tokens in transitions
className="transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)]"

// For simple cases, Tailwind shorthand also works
className="transition-colors"  // Uses Tailwind defaults
```

All animations auto-disable when `prefers-reduced-motion: reduce` is set (`base.css`).

## Accessibility (a11y) Rules

### Required
- **Touch targets**: Interactive elements minimum 44x44px (`min-h-11 min-w-11` or `.touch-target`)
- **Focus rings**: All interactive elements need `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- **Don't convey info by color alone**: Pair with icons or text
- **Image alt text**: All `<img>` must have `alt` attribute
- **Screen reader**: Use `sr-only` class for visually hidden content

### Color Contrast (WCAG AA)
Exact contrast ratios depend on your skin's color values. Verify your skin meets these minimums:

| Token | Minimum Contrast | Usage |
|-------|-----------------|-------|
| `--foreground` | 7:1+ | Body text |
| `--muted-foreground` | 4.5:1+ | Secondary text |
| `--brand` | 4.5:1+ | Accent (verify with your brand color) |
| `--destructive` | 4.5:1+ | Error |
| `--warning` | 4.5:1+ | Warning text |
| `--success` | 3:1+ | Large text/icons only |

### Safe Area
For notch/Dynamic Island support on mobile:
- Use `pb-safe`, `pt-safe`, `px-safe` classes (base.css)
- `viewport-fit=cover` is already set in `index.html`

## Practices & Prohibitions

**Prohibitions:**
- Do not use inline hex for colors that have semantic tokens
- Do not create wrapper components that only add className (use `cn()` at the call site)
- Do not use `@mui/material` (use Radix UI instead)
- Avoid px values in Tailwind for **spacing** (`p-6` OK, `p-[24px]` not OK)
- Font sizes: do not create CSS variables — see "Font Size Anti-Pattern" above.
- Do not omit `data-slot` attribute on new components
- Do not change `--font-size` in theme.css without checking all spacing — rem-based layouts depend on it

**Prescriptions:**
- Use `size-4` instead of `w-4 h-4` (Tailwind v4 shorthand)
- Use `ms-*` instead of `ml-*` (logical properties, RTL support)

## Universal craft principles (from design-language triage)

These principles came out of the design-language triage (Phase 3 of
the foundation-od-schema work). Each is a universal craft rule that
didn't fit any of the eight OD craft topics, so it lands here as
part of the always-on design-engine layer. See
`docs/triage-69-rules.md` for the routing decisions.

### Number formatting conventions (from rule 22)

Display formatting is part of craft, not engineering. Universal
defaults that work for most products:

- **Decimals by data type.** Whole-dollar amounts as integers
  (`$48`, `$1,520`). Million / storage / international price units at
  one decimal place (`3.8M`, `18.2GB`, `$68.4`). Percentages at one
  decimal place (`+12.4%`). Counts of people / days as integers.
- **Thousand separators are required** on any number above 999.
  Use the platform's locale-aware formatter (`toLocaleString`,
  `Intl.NumberFormat`, equivalent), not hand-rolled comma insertion.
- **Date formats are role-specific.** Long dates in headers use a
  full readable form ("Friday, March 27, 2026"); chart axes use a
  compact form ("03/20"); relative-time labels switch to absolute
  dates after about a week.

### Negative-value display (from rule 31)

Use a **leading minus sign** for negative numbers, not parentheses.
`-$1.8K` not `($1.8K)`. Negative amounts get the destructive color
(or its accessibility-corrected equivalent); zero gets the default
text color and no trend chrome (no up-arrow, no down-arrow). Up- and
down-trends pair an explicit `+` or `-` prefix with the matching
trend icon and color.

### Microcopy tone (from rule 34)

A casual-but-polite voice across all UX writing. The tone rules:

- **Conversational over corporate.** "Couldn't load the data" beats
  "An error has occurred while retrieving the requested data".
- **Blame the system, not the user.** "Your connection seems
  unstable" beats "A network error has occurred".
- **Empty states suggest the next action.** "No activity yet — try
  creating your first entry" beats "No data".
- **Section labels are noun phrases.** "Sales Overview", "Recent
  Orders" — not "Check your sales".

This tone applies everywhere: empty states, errors, toasts, button
labels, modal copy. See also rule 49 below for the extended UX-writing
rules.

### Modal vs page decision criteria (from rule 36)

A universal decision tree for when to use a modal / sheet vs a full
page:

| Content | UI |
|---|---|
| Short confirmation or warning | Bottom sheet (small, ~25% height) |
| Filter, picker, short form | Bottom sheet (medium, ~50% height) |
| Detail info that needs scroll | Full page push |
| Settings, complex forms | Full page push |

Bottom sheets need a top-only radius, a drag-handle affordance, and
a backdrop with both a tap-to-close and a swipe-down close path. Any
modal or sheet must always be closable — see "Dark pattern
prevention" in `craft/anti-ai-slop.md`.

### Tab and navigation universals (from rule 42)

Universal navigation patterns that aren't dashboard-specific:

- **Re-tapping the active tab scrolls the page back to the top** —
  the iOS / Material 3 / web platform convention. Implement it.
- **Page transition direction encodes hierarchy.** Sub-page push uses
  right-to-left slide; back navigation uses the reverse. Modals and
  sheets slide bottom-to-top. Tab switches are instant — no
  animation. Direction-as-meaning is universal.
- **Back-button semantics are predictable.** A back button always
  returns to the prior surface in this stack, never a different tab
  or a "smarter" inferred destination. Place it consistently
  (typically top-left, ~44×44 tap area).

### UX writing details (from rule 49)

Extends the microcopy tone above. Universal voice principles for
product copy:

- **Use active voice.** "We completed your order" beats "Your order
  has been completed". Reserve passive for result notifications.
- **Frame positively even in errors.** "Connect to Wi-Fi for a
  faster experience" beats "Your internet connection is unstable" —
  always include a resolution path.
- **Casual but polite.** "What's your name?" beats "Would you kindly
  provide your full name?". Strip unnecessary formality.
- **Plain language over jargon.** "Send money" beats "Initiate
  remittance".
- **CTA labels state what happens next.** "Place order", "Confirm",
  "Get started" — never vague ("Get benefits") or descriptive ("Protect
  your health with fresh ingredients"). One primary CTA per screen.

### Drawer vs bottom sheet vs full page (from rule 55)

Three layout containers, three distinct purposes:

| Content | Container |
|---|---|
| Simple confirmation or short selection | Bottom sheet |
| Detail data with minimal scrolling | Drawer (side panel) |
| Complex form, multi-step, or long content | Full page push |

Drawers slide in from the side (typically right) at moderate duration
(~300 ms). They include a header with title + close, scrollable
content, and an optional fixed footer. Use them when the user needs
context from the underlying surface — full pages break that
context, bottom sheets cover too much of it.

### Confirm dialog structure (from rule 56)

Universal layout for confirm / alert dialogs (the dark-pattern
prevention rules — "Close not Cancel", destructive button uses
destructive color — live in `craft/anti-ai-slop.md`):

- Centered card on a dimmed backdrop; backdrop tap dismisses
- Title (~16 px semibold), centered
- Message (~14 px, normal weight), centered, plain language
- Two buttons in a horizontal pair, both `flex-1`, with the close /
  cancel action on the **left** and the action CTA on the **right**

Keep the dialog small — if the content needs more than a sentence or
two of message text, it belongs in a bottom sheet or page, not a
modal.

### Custom icon API conventions (from rule 57)

A self-contained icon library should converge on these conventions
so icons interoperate across components:

- **24×24 viewBox** for all icons in the set
- **Stroke-based** rendering, not fill-based (with rare exceptions
  for solid-by-design glyphs)
- **`currentColor` default** so icons inherit text color from the
  surrounding context
- **Round line caps and joins** (`stroke-linecap="round"`,
  `stroke-linejoin="round"`)
- **Configurable strokeWidth** so the icon can match the size /
  legibility ladder in `craft/anti-ai-slop.md` (rule 25)

These conventions apply to any icon set, whether built in-house or
customizing one from a library.

### Token usage discipline (from rule 58)

When a stack offers both class-based tokens (Tailwind classes,
utility CSS) and a token object (TypeScript / JS), pick by use case:

- **Static styles** → class-based tokens (`text-text-primary`,
  `bg-card`)
- **Dynamic styles** that depend on runtime values → token object
  (chart colors, conditional fills, inline `style={…}`, CSS-in-JS)
- **Chart libraries** (Recharts, Visx, etc.) almost always need the
  token object since they accept color props rather than classes

The rule is: classes when the value is fixed at authoring time,
token object when the value is computed at runtime. Don't use
inline `style={{ color: '#3C3C3C' }}` with a hardcoded hex when a
token is available.

### Formatting utility conventions (from rule 60)

Centralize display-formatting helpers in a shared utilities module
(`utils/format` or equivalent) and **always call them at display
time** rather than calling locale APIs directly at the use site.
Universal helpers worth shipping:

- `formatCurrency(amount)` — handles K / M / B unit conversion
- `splitNumberUnit(value)` — returns `{ number, unit }` for the
  large-number-+-small-unit pattern (paired with whitespace-nowrap)
- `formatPercent(value)` — adds `+` / `-` prefix, fixed decimals
- `formatDate(date)` — returns the long readable form
- `formatRelativeTime(date)` — returns "3 min ago" / "Yesterday" /
  absolute date past ~7 days

Centralizing these means one place to fix locale bugs, one place to
adjust unit thresholds, one place to handle edge cases (zero values,
negative amounts, missing data). Direct `.toLocaleString()` calls
sprinkled across components are a maintenance trap.

## Token Source Files (framework-agnostic)

The token JSON files ship in the design-engine plugin at `data/tokens/`. Adapter-specific implementations of these tokens (CSS variables, Tailwind theme directives, etc.) are written by `/design-init` to the user's project.

JSON token files are used as the source for extending to other platforms like native apps or Figma variable generation:
- `data/tokens/colors.json`
- `data/tokens/typography.json`
- `data/tokens/spacing.json`
- `data/tokens/radii.json`
- `data/tokens/shadows.json`
- `data/tokens/motion.json`

## Slash commands available

When this skill is loaded, the following design-engine plugin commands are available:

| Command | Description |
|---------|-------------|
| `/design-init` | Bootstrap design system in a project (interactive wizard) |
| `/design-skin <name>` | Swap palette (4-source lookup: project → user global → bundled → awesome-design-md fetch) |
| `/design-tokens <action>` | List/add/update/remove individual design tokens |
| `/design-page <name>` | Scaffold a page using active recipe + adapter |
| `/design-pattern <type>` | Generate a composed UI pattern |
| `/design-component <name>` | Generate a primitive component |
| `/design-copy <context>` | Generate UX microcopy |
| `/design-flow <name>` | Design a user flow / navigation map |
| `/design-feedback <path>` | Add loading/error/empty states |
| `/design-review <path>` | Compliance review (use `--fix` to auto-apply) |
| `/design-lint <path>` | Fast pattern-based lint |
| `/design-a11y <path>` | Accessibility audit (auto-fixes mechanical issues) |
| `/design-audit <path>` | UX audit (Nielsen heuristics) |
| `/design-settings-page` | Scaffold runtime settings UI in current project |

## How to use this skill

When the user asks you to build or review UI:

1. **Check `.design-rules/config.json`** — if missing in their project, suggest `/design-init` to capture design decisions
2. **Read the Golden Rules** at the top of this skill
3. **Use the Font Size by Context table** for any size choice — never guess
4. **Apply the active adapter's idiom** for markup (React for `react-shadcn`, Astro for `astro`, etc.)
5. **For data-dense / dashboard / fintech work:** the `design-language` skill auto-loads the 69 mobile-dashboard rules — apply those on top
6. **Verify with `/design-review`** after generating UI
