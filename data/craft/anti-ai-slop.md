# Anti-AI-slop rules

> Verbatim from [nexu-io/open-design `craft/anti-ai-slop.md`](https://github.com/nexu-io/open-design/blob/main/craft/anti-ai-slop.md). design-engine additions block prepended in Phase 3.

## design-engine principles

### Selection UI restraint (from rule 10)

Don't reach for a dropdown when the option count is small. Two to four
options should use a pill toggle (or segment control); five or more
should move to a dedicated page or sheet rather than cramming into an
in-line menu. Dropdowns inside cards are a reliable AI-slop tell —
they squander screen real estate, hide the option count, and break
scan-ability. The decision is universal, even when the styling is
specialty.

### Subtle shadows, low opacity (from rule 12)

Card and surface shadows should sit at **4–12 % opacity**. Heavier
shadows are an AI-template tell — they make every surface "float"
when most surfaces are just sitting there. Use shadow as a near-flat
hint of depth, not as decoration. Colored shadows (rgba with hue) and
inconsistent shadow levels per card on the same screen are both
banned moves.

### Universal prohibitions (from rule 18)

Hard "don'ts" that survive across products:

- **No pure black** anywhere — pick a soft near-black like `#2A2A2A`
- **No accent-color fills on entire cards** — accent is for elements,
  not surfaces
- **No strong shadows** (≥15 % opacity) — see Shadow rule above
- **No ad-hoc components** — if a new shape is needed, compose from
  existing primitives or get explicit approval first
- **Never convey information through color alone** — pair color with
  icon, text, or shape

### Icon legibility — strokeWidth ladder (from rule 25)

The smaller the icon, the **thicker** its stroke needs to be for
legibility. A 14 px trend arrow at strokeWidth 1.5 disappears; the
same icon at 20 px reads fine. Set a strokeWidth scale that increases
as size decreases (~1.5 at watermark sizes, ~2.0 for nav, ~2.5 for
small badges). Picking a single strokeWidth across all sizes is a
common AI tell — large icons look chunky, small ones disappear.

### Opacity ladder by purpose (from rule 26)

Opacity should track **purpose**, not aesthetics. The lower the
opacity, the more decorative the element; the higher, the more
informational. A working ladder: ~6 % for watermarks, ~10 % for
tinted icon backgrounds, ~15 % for chart underlays, ~30–40 % for
unselected interactive items, 100 % for selected / active. Six tiers
is plenty — random per-element opacity values are a slop tell.

### Button discipline (from rule 46)

Buttons are not all pills. Reserve the fully-rounded shape for the
smallest size only (chips, tags, filters); standard buttons use a
modest radius (~10 px), large CTAs use ~14 px. Use a small set of
named variants (default / neutral / secondary / destructive / outline
/ ghost / brand-ghost) — inventing variants per use site is the slop
tell. On press, change **color** (one step darker), not size — no
`scale: 0.98` shrink. Pair-button order: when a primary and secondary
sit side-by-side, primary goes on the **right**.

### Badge supplements, never stands alone (from rule 47)

Badges (status dots, label badges, pill badges) appear **alongside**
another element — a name, a row, a header. A floating badge with no
host element reads as decoration. Three badge types cover the field:
status (dot + label, same color), label (uppercase + tracking,
small), pill (filled background, very small). Don't combine icon and
text inside a single badge; don't size badges above ~24 px tall.

### Separate cards with shadow, not borders (from rule 48)

Card-vs-card separation is a shadow problem, not a border problem.
Adding a 1 px border around every card on top of a shadow is a
template tell — the border fights the shadow and flattens the page.
Vertical dividers between adjacent elements are similarly forbidden;
spacing carries the separation. Borders are reserved for **state**
(input focus, selected row, error chrome), not structure.

### Dark pattern prevention (from rule 50)

Universal launch-blocking dark patterns to never ship:

- No exit-prevention bottom sheet on back navigation
- No screen with no reject option (CTA only, no close / cancel)
- No bottom sheet, ad, or notification consent shown the moment a
  user enters
- No full-screen ad at unexpected moments
- Every modal / sheet must be closable via a Close affordance, the
  backdrop, or the system back

A user must always be able to leave. Trapping users for engagement
metrics is unethical, not just bad craft.

### Graphics serve meaning, not decoration (from rule 51)

Decorative imagery is a reliable slop signal. Universal rules:

- One hero / lead graphic per screen, not several competing same-size
  graphics
- No decorative particles, glows, sparkles, blob shapes, mesh
  gradients, or "trust" two-stop gradients (see "two-stop trust
  gradient" in the cardinal sins below)
- No hand-drawn / cartoon / painterly / lyrical illustration styles
  in product UI — they read as stock asset libraries
- Graphics must aid comprehension of the screen's meaning. If a
  reviewer can remove the graphic without losing meaning, remove it.

### Pill toggle vs segment control (from rule 54)

Two related selection patterns with distinct purposes:

- **Pill toggle** — for switching where the *active* state should
  emphasize the brand color (e.g. period switch on a key chart). Active
  state uses an accent fill.
- **Segment control** — for neutral switching between equivalent views
  (filter, view mode). Active state uses a neutral surface, not the
  accent.

Picking the wrong one floods the page with accent or, conversely,
hides the active state. Two to five options on either; beyond that,
move to a dedicated page.

### Confirm-dialog discipline (from rule 56)

Two universal craft rules for confirm dialogs (the structural rule
lives in design-engine):

- **Never label the left button "Cancel".** Users may read it as
  cancelling the in-progress task they were about to confirm. Use
  "Close" instead — it consistently means "dismiss this dialog".
- **Destructive action buttons get the destructive color**, not the
  brand color. A red "Delete" plus a neutral "Close" is unambiguous;
  a brand-blue "Delete" reads as a normal CTA and invites accidental
  taps.

## OD baseline (verbatim from upstream)

Concrete, checkable rules that distinguish "designed by a human who has
shipped product" from "default LLM output." Several rules below are
auto-enforced by the daemon's `lint-artifact` linter — failing an
enforced rule is not a style preference, it is a regression. The
rest are guidance for agents and reviewers and are flagged inline as
"(guidance, not auto-checked)" so the contract with the linter stays
honest.

> Adapted from [refero_skill](https://github.com/referodesign/refero_skill)
> (MIT), tightened to match Open Design's lint surface.

## The seven cardinal sins

These are the patterns the linter blocks at P0 (must-fix):

1. **Default Tailwind indigo as accent** — exactly `#6366f1`, `#4f46e5`,
   `#4338ca`, `#3730a3`, `#8b5cf6`, `#7c3aed`, `#a855f7`. The active
   `DESIGN.md` provides `--accent`; use it. Indigo is the textbook AI
   tell. (The daemon's `lint-artifact` flags any of these as a solid
   accent; keep this list in sync with `AI_DEFAULT_INDIGO` in
   `apps/daemon/src/lint-artifact.ts`.)
2. **Two-stop "trust" gradient on the hero** — purple→blue, blue→cyan,
   indigo→pink. A flat surface + intentional type beats this every
   time.
3. **Emoji as feature icons** — `✨`, `🚀`, `🎯`, `⚡`, `🔥`, `💡`
   inside `<h*>`, `<button>`, `<li>`, or `class*="icon"`. Use
   1.6–1.8px-stroke monoline SVG with `currentColor`.
4. **Sans-serif on display text when the seed binds a serif** — h1/h2
   must use `var(--font-display)`, not a hardcoded Inter / Roboto /
   `system-ui`.
5. **Rounded card with a colored left-border accent** — the canonical
   "AI dashboard tile" shape. Drop either the radius or the left
   border.
6. **Invented metrics** — "10× faster", "99.9% uptime", "3× more
   productive". Either pull from a real source or use a labelled
   placeholder.
7. **Filler copy** — `lorem ipsum`, `feature one / two / three`,
   `placeholder text`, `sample content`. An empty section is a design
   problem to solve with composition, not by inventing words.

## Soft tells (P1 — should fix)

- **Standard "Hero → Features → Pricing → FAQ → CTA" sequence with no
  variation** *(guidance, not auto-checked)*. This is the AI-template
  skeleton; introduce at least one unconventional section (testimonial
  wall as full-bleed quote, pricing as comparison-against-status-quo,
  an inline mini-product-demo).
- **External placeholder image CDNs** (`unsplash.com`, `placehold.co`,
  `placekitten.com`, `picsum.photos`). Fragile and obvious. Use the
  shipped `.ph-img` placeholder class.
- **More than ~12 raw hex values outside `:root`.** Tokens were not
  honoured.
- **`var(--accent)` used 6+ times in the rendered body.** Cap at 2
  visible uses per screen.

## Polish tells (P2 — nice to fix)

- **Sections without `data-od-id`** — comment mode can't target them.
- **Decorative blob / wave SVG backgrounds** *(guidance, not
  auto-checked)* — meaningless geometry.
- **Perfect symmetric layout with no visual tension** *(guidance, not
  auto-checked)* — alternating density (one tight section, one
  breathing section) reads as intentional.

## How to add soul without breaking the rules

Aim for **~80% proven patterns + ~20% distinctive choice**. The 20%
should live in:

- One bold visual move — a typography choice, a single color decision,
  an unexpected proportion.
- Voice and microcopy — a button that says "Start tracking" beats one
  that says "Get started".
- One micro-interaction the user will remember — a button press that
  moves 2px, a number that counts up.
- One detail that could only have been put there by someone who used
  the product (a subtle kbd shortcut hint, a status badge with
  product-specific phrasing).

If a reviewer screenshots the artifact and someone outside the project
can identify which product it's from — you have soul. If not, you
shipped a template.
