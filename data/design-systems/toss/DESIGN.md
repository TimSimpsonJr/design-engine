# Design System Inspired by Toss

> Category: Fintech & Crypto

## 1. Visual Theme & Atmosphere

Toss (viva republica) is the design language of Korea's most-used fintech super-app — a single product that absorbed banking, brokerage, payments, insurance, and identity into one mobile surface. The visual system has to make that scope feel light. It does so by stripping ornament to nearly zero and letting one accent blue (`#3182F6`) carry every interactive moment. Backgrounds are pure white in light mode and a near-black neutral in dark mode; cards float on flat surfaces with whisper-soft shadows; type is set in Pretendard, the open-source variable sans-serif optimized for parity between Hangul and Latin glyphs. The result reads as confident, friendly, and precise — the visual register of a financial product that wants to feel less like a bank and more like a well-organized notebook.

The defining move is restraint with the accent. Toss Blue does not spray across surfaces. It appears on the primary CTA, on an active tab indicator, on a single highlighted bar in a chart, and almost nowhere else. Everything else is rendered in a tight neutral grayscale (text, borders, secondary surfaces) so that when the blue does appear, the eye lands immediately. This is the opposite of the rainbow-dashboard fintech convention; Toss wins by subtraction.

The second defining move is the card. Toss's mobile screens are essentially vertical stacks of rounded cards — each one a self-contained unit of information (a balance, a transaction list, a stock chart, a notification). Cards have generous internal padding, modest corner radius (12-16px), and shadows so subtle they read more as a soft separation from the canvas than as elevation. Between cards, vertical whitespace breathes. Density lives inside the card; the page itself stays calm.

Pretendard makes the typography quietly distinctive. It's a Korean-first variable font that solves a real problem: most Latin-designed sans-serifs render Hangul awkwardly, while most Korean fonts render Latin awkwardly. Pretendard treats both scripts as first-class, with matched x-heights and consistent weight axis. For a bilingual product, this is load-bearing.

**Key Characteristics:**
- Single-accent discipline: Toss Blue (`#3182F6`) is the only chromatic interactive color
- Pretendard variable font with Hangul + Latin parity (open-source, made for Korean digital products)
- Card-driven mobile-first layouts: vertical stacks of rounded cards on a calm canvas
- Modest corner radius (12-16px on cards, 8-10px on inputs) — friendly, not pill-shaped
- Soft, near-invisible shadows (4-8% opacity) — separation, not elevation drama
- Generous whitespace between cards, dense information inside cards
- Tight neutral grayscale for everything non-interactive
- Numerals set with tabular figures for currency and account balances

## 2. Color Palette & Roles

### Primary
- **Toss Blue** (`#3182F6`): The brand color and the only interactive chromatic accent. Used for primary CTAs, active tab indicators, focused inputs, selected list items, and the highlighted segment of charts. Treat as scarce — never decorative.
- **Toss Blue Hover** (`#1B64DA`): Darker pressed/hover state for primary buttons.
- **Toss Blue Subtle** (`#E8F2FE`): Tinted background for selected rows, info chips, and subtle highlight states.

### Surface & Background (Light)
- **Page Background** (`#FFFFFF`): Pure white canvas. Cards and content sit directly on it.
- **Card Surface** (`#FFFFFF`): Cards share the page background; separation comes from radius and shadow, not contrasting fill.
- **Muted Surface** (`#F2F4F6`): Section dividers, subtle group backgrounds, secondary fills.
- **Border** (`#E8E6E1`): Hairline borders on inputs and rare card outlines.

### Surface & Background (Dark)
- **Page Background** (`#121212`): Near-black canvas, warmer than pure black.
- **Card Surface** (`#1E1E1E`): Card fill, lifts slightly off the canvas without contrast aggression.
- **Muted Surface** (`#27272A`): Border tone and quiet separators in dark mode.

### Text (Light)
- **Primary Text** (`#191F28`): Headings, balances, primary numbers, body. Near-black with a hint of blue undertone.
- **Secondary Text** (`#6A6A6A`): Captions, metadata, secondary descriptions.
- **Tertiary Text** (`#7A7A7A`): Quieter still — timestamps, hint text.
- **Disabled Text** (`#9B9B9B`): Disabled states.

### Text (Dark)
- **Primary Text** (`#E0E0E0`): Headings and primary content.
- **Secondary Text** (`#A0A0A0`): Captions, metadata.
- **Tertiary Text** (`#808080`): Hint text, timestamps.
- **Disabled Text** (`#555555`): Disabled states.

### Semantic
- **Success** (`#6B9B7A` light / `#8FBF9A` dark): Confirmed transactions, positive deltas, success toasts. Muted green — never a hot fluorescent.
- **Warning** (`#D97706` light / `#FFB347` dark): Caution states, pending verification, attention required.
- **Destructive** (`#D4183D` light / `#FF5C5C` dark): Errors, destructive actions, negative deltas in financial contexts.
- **Info** (`#3B82F6` light / `#64B5F6` dark): Informational tooltips and notices. Sits next to but distinct from the brand blue.

### Chart Colors
- Primary series: Toss Blue (`#3182F6`) for the focal data line or bar
- Secondary series: muted neutral (`#9CA3AF`) — most charts stay one color, with neutrals carrying comparison data
- Positive delta: `#6B9B7A` (success green)
- Negative delta: `#D4183D` (destructive red)

## 3. Typography Rules

### Font Family
- **Primary**: `Pretendard`, with fallback chain `Pretendard, -apple-system, BlinkMacSystemFont, "system-ui", "Segoe UI", "Apple SD Gothic Neo", sans-serif`. Pretendard is an open-source variable font (SIL OFL) designed for Korean digital products with full Latin parity.
- **Monospace**: `JetBrains Mono`, with fallback `"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace`. Used sparingly for transaction IDs, account numbers, and code-like data.
- **Numerals**: enable `font-feature-settings: "tnum"` on any tabular financial display (balances, transaction lists, charts).

### Hierarchy

| Role | Size | Weight | Line Height | Notes |
|------|------|--------|-------------|-------|
| Display (balance) | 32-40px | 700 | 1.20 | Large account balances, headline KPI numbers — `tnum` enabled |
| H1 | 28px | 700 | 1.25 | Page titles |
| H2 | 22px | 700 | 1.30 | Section headings inside cards |
| H3 | 18px | 600 | 1.35 | Sub-section headings, card titles |
| Body Large | 17px | 500 | 1.45 | Primary reading body, card descriptions |
| Body | 15px | 400 | 1.50 | Standard body text |
| Caption | 13px | 400 | 1.40 | Metadata, timestamps, secondary descriptions |
| Micro | 11-12px | 500 | 1.30 | Tiny labels, badge text, axis ticks |
| Button | 16px | 600 | 1.00 | Primary and secondary CTA labels |
| Tabular Number | inherit | 500-700 | inherit | Always with `tnum` for balances and transaction amounts |

### Principles
- **Weight contrast carries hierarchy**: Pretendard runs cleanly from 300-900. Toss leans on weight differences (400 body vs. 700 balances) more than size jumps to establish visual rank.
- **Hangul + Latin parity**: never mix Pretendard with a separate Latin font. Pretendard renders both scripts at matched optical sizes — substituting a Latin-only font for English breaks the visual rhythm.
- **Tabular numerals are non-negotiable for money**: every balance, every transaction amount, every chart value uses `tnum` so columns align cleanly.
- **No italic**: Toss does not use italic in product UI. Italic in fintech reads as legalese; Toss avoids it entirely.
- **Avoid uppercase**: section labels and buttons stay in sentence case. Toss never SHOUTS at the user.

## 4. Component Stylings

### Buttons

**Primary**
- Background: `#3182F6` (Toss Blue)
- Text: `#FFFFFF`, 16px Pretendard weight 600
- Padding: 14px 20px (full-width on mobile is the default)
- Radius: 12px
- Hover/Pressed: `#1B64DA`
- Disabled: `#B0B8C1` background, white text
- Use: the single primary action per screen ("Send", "Confirm", "Continue")

**Secondary**
- Background: `#F2F4F6` (muted surface)
- Text: `#191F28`, 16px Pretendard weight 600
- Padding: 14px 20px
- Radius: 12px
- Hover: slightly darker neutral
- Use: cancel, back, alternative paths

**Ghost / Tertiary**
- Background: transparent
- Text: `#3182F6`, 15px Pretendard weight 600
- Padding: 8px 12px
- Radius: 8px
- Use: inline links, "See all", "Edit"

### Cards
- Background: `#FFFFFF` (light) / `#1E1E1E` (dark)
- Padding: 20-24px internal
- Radius: 14-16px
- Border: usually none — separation comes from shadow + page background contrast in dark mode, or shadow alone in light mode
- Shadow: `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)` — barely there
- Stack rhythm: 12-16px vertical gap between cards

### Inputs
- Background: `#FFFFFF` (light) / `#1E1E1E` (dark)
- Border: `1px solid #E8E6E1` (light) / `1px solid #27272A` (dark)
- Radius: 10px
- Padding: 14px 16px
- Font: 16px Pretendard weight 500 (16px to avoid iOS zoom-on-focus)
- Focus: border becomes `#3182F6`, optional 4px outer ring at `rgba(49,130,246,0.12)`
- Label: 13px Pretendard weight 500, `#6A6A6A`, sits above the field
- Helper/error text: 12px below the field

### List Items (transaction rows)
- Container: card with vertical-stack rows
- Row padding: 14px 16px
- Row height: 56-64px depending on density
- Layout: icon (left) + label/sub-label (center) + amount (right, tabular)
- Divider: 1px hairline `#F2F4F6` between rows, omitted on the last row
- Tap state: subtle `#F8F9FA` background flash

### Tabs
- Active indicator: 2-3px bottom bar in Toss Blue
- Inactive label: `#6A6A6A`, weight 500
- Active label: `#191F28`, weight 700
- No background fill on the tab bar itself — sits flush on the page

### Charts
- Single primary line/bar in Toss Blue
- Secondary data in neutral `#9CA3AF`
- Axis labels: 11-12px, `#6A6A6A`, `tnum` enabled
- Gridlines: optional, very faint (`#F2F4F6`)
- Tooltip on touch: rounded card with shadow, mirrors the card system

### Bottom Sheet / Modal
- Radius: 20px on top corners, square on bottom
- Padding: 24px
- Drag handle: 40px wide, 4px tall, `#D1D6DB`, centered at top
- Backdrop: `rgba(0,0,0,0.4)`

## 5. Layout Principles

### Mobile-first
The system assumes a 360-430px viewport as the primary canvas. Cards span the full content width with 16-20px gutters from the screen edge. Desktop is treated as a centered single column (typically 420-480px wide) — Toss does not expand its mobile UI horizontally; it preserves the phone-like proportions even on a 27-inch monitor.

### Spacing Scale
Base unit: 4px. Common steps: 4, 8, 12, 16, 20, 24, 32, 40, 48px.
- **Inside a card**: 16-24px padding, 8-12px between adjacent elements
- **Between cards**: 12-16px vertical gap
- **Section breaks**: 32-40px
- **Top-of-screen header**: 56-60px tall, generous bottom spacing before content

### Vertical Rhythm
Pages read as a scrollable vertical stack. The pattern is consistent: header, primary card (often a balance or status), secondary cards (transactions, holdings, notifications), CTA card or footer. Horizontal scrolling is rare — when it appears, it's for a controlled element like a chip filter row or a card carousel, never for primary content.

### Density Inside the Card
Cards are dense but never cramped. Inside a transaction card, multiple rows of data sit close together (8-12px vertical rhythm), but the card's outer padding gives the whole block room to breathe.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 (flat) | No shadow | Page background, headers, tab bars |
| 1 (card) | `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)` | Standard cards |
| 2 (raised) | `0 4px 16px rgba(0,0,0,0.08)` | Bottom sheets, hover states on key cards |
| 3 (modal) | `0 16px 48px rgba(0,0,0,0.16)` | Modals, full-screen overlays |
| Focus ring | `0 0 0 4px rgba(49,130,246,0.12)` | Keyboard focus on inputs and buttons |

### Radius Scale
- 8px: small chips, badges, segmented control items
- 10-12px: inputs, secondary buttons
- 14-16px: cards, primary buttons
- 20px: bottom-sheet top corners, large hero containers

### Shadow Philosophy
Toss's shadows are intentionally near-invisible. They exist to suggest a card boundary on a white page, not to dramatize elevation. Two-layer (soft + softer) shadows give the card a hint of physical separation without the floating-paper aesthetic of Material Design. In dark mode, shadows are largely replaced by the natural contrast between `#1E1E1E` cards and the `#121212` canvas.

## 7. Do's and Don'ts

### Do
- Reserve Toss Blue for the primary CTA and one or two key highlights per screen
- Use Pretendard for both Hangul and Latin text — it's designed for both
- Stack cards vertically on a calm canvas with consistent 12-16px gaps
- Use `tnum` (tabular numerals) on every balance, amount, and chart value
- Keep card radius modest (12-16px) — friendly, not pill-shaped
- Use weight contrast (400 body vs. 700 balances) more than size jumps for hierarchy
- Treat the screen as a phone-shaped column even on desktop
- Use sentence case for buttons, labels, and section headings

### Don't
- Don't spray Toss Blue across surfaces or decorative areas — it's a scarce resource
- Don't pair Pretendard with a separate Latin font — it ruins the bilingual rhythm
- Don't use heavy or dramatic shadows — Toss elevation is whisper-soft
- Don't use pill-shaped buttons or 24px+ radius on cards — that reads as consumer-app-not-fintech
- Don't render financial amounts in proportional figures — always tabular
- Don't use italic anywhere in the product UI
- Don't shout: avoid uppercase headings, exclamation points, and saturated alert colors for non-critical states
- Don't expand mobile layouts horizontally on desktop — preserve the column
- Don't introduce a second chromatic accent — neutral + blue is the entire palette

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Treatment |
|------|-------|-----------|
| Mobile (default) | <640px | Native canvas — full-width cards with 16-20px gutters |
| Tablet | 640-1024px | Centered column, 480-560px wide, with neutral `#F2F4F6` page background flanking it |
| Desktop | >1024px | Same centered column at 420-480px, soft neutral backdrop, optional secondary content rail for marketing pages |

### Touch Targets
- Minimum 44x44px for any tappable element
- Buttons default to 48-52px tall (14px vertical padding + 16px line-height)
- List rows are 56-64px tall, with the entire row tappable

### Mobile Transforms
- Cards remain full-width with edge gutters at all sizes
- Headers stay fixed-height (56-60px) with generous bottom spacing
- Bottom sheets enter from the bottom edge with the rounded top corners
- Modal dialogs prefer full-screen takeover on mobile, contained card on desktop
- Charts compress horizontally; vertical axis labels may shorten or rotate

### Image / Illustration Behavior
- Illustrations are flat, simple, single-tone or two-tone — Toss famously uses minimal mascots and abstract geometric forms
- Photography is rare; when used, it's portraiture with clean backgrounds
- Icons are line-style at 24px default, 1.5-2px stroke, occasionally filled for active states

## 9. Agent Prompt Guide

When generating Toss-inspired UI:

### Quick Color Reference
- Primary CTA: Toss Blue (`#3182F6`)
- Hover/Pressed CTA: `#1B64DA`
- Tinted highlight: `#E8F2FE`
- Page (light): `#FFFFFF` · Page (dark): `#121212`
- Card (dark): `#1E1E1E`
- Primary text (light): `#191F28` · (dark): `#E0E0E0`
- Secondary text: `#6A6A6A` (light) / `#A0A0A0` (dark)
- Hairline border: `#E8E6E1` (light) / `#27272A` (dark)
- Success: `#6B9B7A` · Destructive: `#D4183D` · Warning: `#D97706`

### Quick Type Reference
- Family: `Pretendard, -apple-system, system-ui, "Apple SD Gothic Neo", sans-serif`
- Always enable `font-feature-settings: "tnum"` on currency, balances, and chart values
- Hierarchy via weight (400/500/600/700) more than via size

### Example Prompts
- "Build a Toss-style account balance card: 16px radius, white surface, soft shadow `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)`, 24px padding. Header label '주거래계좌' in 13px Pretendard weight 500 color `#6A6A6A`. Balance below in 36px Pretendard weight 700, color `#191F28`, `tnum` enabled. Single 'Send' CTA button at the bottom: full-width, `#3182F6` background, 14px vertical padding, 12px radius, white 16px Pretendard weight 600."
- "Generate a Toss-style transaction list card: white background, 16px radius, no border. Each row 60px tall: 40px icon on the left, two-line label in the middle (15px weight 500 primary, 13px weight 400 `#6A6A6A` secondary below), amount on the right (15px weight 600, `tnum`, red `#D4183D` if negative, primary text color if positive). 1px `#F2F4F6` divider between rows, omitted on the last row."
- "Design a Toss-style chart card: white surface, 16px radius, 24px padding. Title 'Portfolio' at 18px weight 600. Single-line chart in `#3182F6` with no fill. Y-axis labels 11px `#6A6A6A` `tnum`. X-axis labels at the same size. No gridlines or extremely faint `#F2F4F6` gridlines. On hover/touch, show a rounded tooltip card mirroring the parent card's style."
- "Build a Toss-style bottom sheet: top corners 20px radius, 24px padding. 40px-wide 4px-tall `#D1D6DB` drag handle centered at the top. Backdrop `rgba(0,0,0,0.4)`. Content stacks vertically: heading at 22px weight 700, body at 15px weight 400, primary CTA at the bottom in Toss Blue."

### Iteration Guide
1. If the screen has more than one Toss Blue accent, dial it back — count the blue
2. If a card has a heavy shadow, soften it (combined opacity 4-8% max)
3. If amounts in a list don't align vertically, you forgot `tnum`
4. If the desktop layout fills the viewport horizontally, narrow it to a 420-480px centered column
5. If you reached for italic, gradient fills, or a second accent color, undo
6. Sentence case everything — never uppercase labels or buttons
7. When in doubt, give it more whitespace between cards and check the result on a 375px-wide canvas first
