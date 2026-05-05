# /design-recipe extract — Recipe Extractor Design

**Status:** Approved (interactive brainstorm with Tim, 2026-05-05)
**Closes:** [#3](https://github.com/TimSimpsonJr/design-engine/issues/3)

## Problem

Today, recipes are bundled (5 dashboards: `saas`, `ecommerce`, `fintech`, `social`, `productivity`) or hand-authored as JSON. Users want to extract a recipe from an existing public site (Stripe pricing, Linear marketing, Notion homepage, their own logged-in dashboards) and use it with `/design-page`. There is no path for that today.

## Scope

### In scope (v1)

- A new agent at `agents/recipe-extractor.md` invoked by a new command at `commands/design-recipe.md`.
- `extract` subcommand: `/design-recipe extract <url>`.
- Extraction works on **dashboard, marketing, and e-commerce** pages (and is structurally extensible to future kinds — content/editorial, docs sites, etc.).
- Recipes are written to `.design-rules/recipes/<name>.json` in the user's project, mirroring the on-disk recipe format used today.
- Detection uses **HTML + screenshot** (multimodal Claude does the section identification).
- **Chrome MCP** (the `mcp__Claude_in_Chrome__*` tools) is the rendering primitive in v1. Where this matters for portability, see the implementation note in §5.
- Extracted recipes carry **provenance metadata** (`sourceUrl`, `extractedAt`, `viewportsCaptured`, optional `authenticated`) and **per-section `mobileBehavior` notes** describing responsive adaptation observed at 390px.

### Out of scope (v1)

- **Component-level extraction.** Recipes describe section sequences only. Identifying and porting reusable sub-section components (Button variants, Card variants) is a separate effort tracked elsewhere.
- **Asset extraction.** Icons, illustrations, fonts, images are not downloaded. Recipes reference slot positions abstractly.
- **Multi-page or domain-wide extraction.** One URL → one recipe. Cross-page pattern reconciliation is a future feature.
- **Tablet viewport.** Only desktop (1440px) and mobile (390px) are captured. Tablet behavior is interpolation; add `--viewport=tablet` later if needed.
- **A separate vocabulary catalog file.** Vocabulary is implicit in the existing recipes (see §3).
- **Copyright/fair-use prompts.** User has affirmed this is fair use; no warning UX in v1.
- **Sibling subcommands.** `/design-recipe list`, `delete`, `show` are future. v1 has only `extract`.

## 1. Vocabulary handling — no catalog file

The system already references components: a section's `type` value (e.g., `kpi-grid`, `hero-card`) is a reference to a pattern in `adapters/react-shadcn/components/patterns/`. Three levels exist today:

- **Recipes** describe page shape (ordered list of section references).
- **Patterns** define each section's internal composition.
- **UI primitives** (Button, Card, Avatar) compose into patterns.

Vocabulary — the set of valid `type` strings — is **implicit in the existing recipes**. We do not introduce a `data/vocabulary.json` or per-kind catalog files. Reasons:

- The 5 bundled dashboard recipes already declare 9 types by usage. Adding a catalog file would duplicate that.
- Tim's stated growth model (vocab grows organically as new patterns are encountered) is satisfied by recipes themselves growing — each new extracted recipe potentially introduces new types.
- Cross-project sharing of vocab via a registry is hypothetical; manual file copy covers it if needed.

**How the agent learns the vocabulary at extract time:**

1. Reads `${CLAUDE_PLUGIN_ROOT}/data/recipes/*.json` (bundled).
2. Reads `.design-rules/recipes/*.json` in the user's project (already-extracted or hand-authored recipes).
3. Builds an in-memory map: `type → list of (props examples, recipe context)` from the union.

**Naming guidance for new types** lives in the agent's prompt, not in a data file. The prompt instructs the agent to:

- Prefer kebab-case names.
- Use Tailwind UI Plus block names as inspiration when applicable (e.g., `hero-with-image-tiles`, `pricing-three-tiers`, `feature-grid-with-screenshots`, `cta-with-newsletter`, `stats-with-description`, `testimonial-grid`, `logo-cloud`, `faq-accordion`, `footer-with-newsletter`).
- Be specific over generic: `pricing-three-tiers-monthly-toggle` is better than `pricing`.

**Force-fit avoidance** is a behavioral instruction, not a structural one: "If a section does not clearly match an existing type with high confidence, propose a new type rather than misclassify." Confidence calibration lives in the prompt.

## 2. Architecture — flat recipes (Option A)

Recipes remain **flat** lists of section references. We do not introduce nested layout containers (`row`, `col`, `tabs`) at the recipe level. Complex layouts (sidebar+main, multi-column heroes, bento grids) become single named section types whose internal composition is the pattern's job.

### Why flat

- **Matches Tailwind UI Plus catalog granularity.** Their blocks are themselves flat units (e.g., "Header with Two Column Hero" is one block, not a header + nested 2-col container).
- **Matches what extract naturally sees** in a screenshot: sections in document order.
- **Recipes stay readable.** A recipe is ~6-8 entries, hand-editable in seconds.
- **`/design-page` rendering stays a flat loop.** No recursion, no fuzzy nested matching.
- **Existing 5 recipes don't migrate.** Backwards-compatible.
- **Vocab grows on the right axis.** Unique layouts produce one-off section types — exactly the vocab additions Tim wants to discover.

### Cost we accept

Pages with genuinely unique 2-column or sidebar layouts produce specialized section types (e.g., `pricing-with-comparison-and-faq`, `dashboard-with-sidebar-nav-and-detail-panel`). Patterns absorb this complexity. If two sites use similar layouts, a shared section type emerges through reuse over time.

## 3. Recipe schema (extended for extracted recipes)

Existing recipes (the bundled 5) keep their current shape. Extracted recipes add provenance and responsive metadata; new fields are **optional and backwards-compatible** so `/design-page` continues to work unchanged.

```json
{
  "name": "stripe-pricing",
  "version": 1,
  "kind": "marketing",
  "sourceUrl": "https://stripe.com/pricing",
  "extractedAt": "2026-05-05",
  "viewportsCaptured": ["1440px", "390px"],
  "sections": [
    {
      "type": "hero-with-headline-and-eyebrow",
      "props": { "eyebrow": "Pricing", "headline": "Pricing built for businesses of all sizes" },
      "mobileBehavior": "Eyebrow + headline left-align unchanged. Trust-bar logos wrap to 2 rows."
    },
    {
      "type": "pricing-three-tiers-monthly-toggle",
      "props": { "tierCount": 3, "billingToggle": ["monthly", "yearly"], "highlightTier": "middle" },
      "mobileBehavior": "Tiers stack vertically. Highlighted tier moves to top. Monthly/yearly toggle stays sticky at top of stack."
    }
  ]
}
```

**New top-level fields (extracted recipes only):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | string | yes | `"dashboard"`, `"marketing"`, `"ecommerce"`, `"application-ui"`, or other (extensible). Auto-detected; user can override with `--kind=`. |
| `sourceUrl` | string | yes | Originating URL. |
| `extractedAt` | string | yes | ISO date (YYYY-MM-DD). |
| `viewportsCaptured` | string[] | yes | Pixel widths captured during extract. Typically `["1440px", "390px"]`; degraded modes (user-provided screenshot, html-only, `--viewport=desktop`/`mobile`) may produce a shorter list or `[]`. |
| `authenticated` | boolean | no | Only set to `true` if the extract happened against a logged-in page (Chrome MCP inherited a session). Tells future-Tim that re-extraction from a clean session won't reproduce. Omitted otherwise. |

**New per-section field:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `mobileBehavior` | string | no | Free-text description of responsive adaptation observed at 390px. Guidance for whoever later authors the matching pattern. Omitted if section behavior is identical (rare). |

The bundled 5 recipes are not retroactively modified. They have no `kind`, no `sourceUrl`, no `mobileBehavior` — and `/design-page` continues to read them fine. Extracted recipes will simply be richer.

## 4. Agent flow

The command file at `commands/design-recipe.md` parses arguments, dispatches to the agent at `agents/recipe-extractor.md`, and writes the final recipe.

### 4.1 Argument shape

```
/design-recipe extract <url> [--name=<name>] [--kind=<kind>] [--screenshot=<path>] [--viewport=mobile|desktop|both] [--unattended] [--dry-run] [--force]
```

| Flag | Default | Effect |
|---|---|---|
| `--name=<name>` | derived from URL: `<host>-<path-slug>` (e.g., `stripe-pricing`) | Overrides recipe filename. |
| `--kind=<kind>` | auto-detected from URL + screenshot | Overrides auto-detection. Surfaced at pre-confirm prompt either way. |
| `--screenshot=<path>` | not set | Use a user-provided screenshot file instead of Chrome MCP. Required if Chrome MCP is unavailable. |
| `--viewport=both` | `both` (1440 + 390) | `desktop` skips mobile capture; `mobile` skips desktop (rare). |
| `--unattended` | off | Skip inline propose-and-name; emit `unknown-N` placeholder types for ambiguous sections. |
| `--dry-run` | off | Print the recipe to chat; do not write. |
| `--force` | off | Skip overwrite/pre-confirm prompts. |

### 4.2 Step-by-step

1. **Parse arguments.** Validate URL. Derive `pageName` from URL if `--name` not set.
2. **Verify project initialized.** Read `.design-rules/config.json`. Error if missing: `No design system in this project — run /design-init first.`
3. **Detect Chrome MCP.** Probe for `mcp__Claude_in_Chrome__*` tools. If absent and no `--screenshot` flag, prompt: `Chrome MCP not detected. Provide a screenshot path with --screenshot=<path>, or proceed with HTML-only (significantly less accurate). [path|html|cancel]`.
4. **Fetch HTML.** Use WebFetch on the URL. Extract `<title>`, OG tags, headings (h1-h3), structural landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`). Always done — free signal regardless of rendering approach.
5. **Render screenshots.**
   - **Chrome MCP path (default):** Open a new tab via `tabs_create_mcp`, navigate to URL, resize window to **1440×900** for desktop capture, screenshot. Resize to **390×844** for mobile capture, screenshot. Close the tab.
   - **User-provided path:** Read the file at `--screenshot`. Note: only one viewport is captured this way. The recipe records `viewportsCaptured` accordingly and the `mobileBehavior` field will be inferred from layout heuristics (less reliable) or omitted.
6. **Read existing recipes** (`${CLAUDE_PLUGIN_ROOT}/data/recipes/*.json` + `.design-rules/recipes/*.json`). Build the implicit vocabulary map.
7. **Identify sections** (multimodal pass). The agent looks at the desktop screenshot, identifies sections in document order, and for each one:
   - Tries to match to an existing vocabulary type. If confidence is high (clear visual match + props plausibly fit), assigns the existing type.
   - Otherwise proposes a new type name following the naming guidance in §1.
   - Extracts visible props (counts, layout dimensions, content types — not actual content text).
   - Notes responsive behavior by comparing the same region on the mobile screenshot.
8. **Auto-detect `kind`.** Heuristics: URL path (`/dashboard`, `/app`, `/admin` → dashboard; `/pricing`, `/about`, `/`, `/features` → marketing; `/products`, `/shop`, `/cart` → ecommerce). Falls back to layout cues from the screenshot. Default to `marketing` if uncertain.
9. **Inline propose-and-name flow** (default mode; skipped if `--unattended`).
   - For each newly proposed type: agent shows the section's location in the screenshot region, the proposed name, the inferred description and props, and asks: `Save as type "<name>"? [y/r/s]` (yes / rename / skip — skipped sections fall back to a placeholder type).
   - Reasonable rename UX: user types a new name; agent confirms before applying.
10. **Section count cap.** If more than 8 distinct sections, agent picks the 8 most representative (by visual prominence and content distinctness) and prints: `Identified <N> distinct sections; included the 8 most representative. Page has more variety than fits a single recipe.`
11. **Pre-confirm.** Print the full recipe JSON to chat with detected `kind` highlighted. Ask: `Save to .design-rules/recipes/<name>.json? [Y/n]`. If `--dry-run`, skip the write entirely; if `--force`, skip the prompt.
12. **Conflict resolution.** If `.design-rules/recipes/<name>.json` already exists:
    - Without `--force`: prompt overwrite / write to `<name>-2` / cancel (mirroring `/design-page`).
    - With `--force`: overwrite silently.
13. **Write the recipe.** Pretty-printed JSON, 2-space indent. Create `.design-rules/recipes/` if absent.
14. **Summary.** Print:
    ```
    Extracted recipe `<name>` (kind: <kind>) from <sourceUrl>.
      Sections: <count> (<comma-separated types>)
      New vocabulary introduced: <list of new types or 'none'>
      Mobile behavior captured: <yes|no>
      Path: .design-rules/recipes/<name>.json

    Next:
    - /design-page <name> "<description>" --recipe=<name>  to scaffold a page using this recipe
    - Edit .design-rules/recipes/<name>.json directly to refine props or section ordering
    - Future patterns for new types live in adapters/react-shadcn/components/patterns/ — author when needed
    ```

### 4.3 Failure modes

- **URL unreachable:** error, suggest checking the URL or network.
- **Chrome MCP unavailable + no `--screenshot`:** prompt as in step 3.
- **Page renders blank / no identifiable sections:** do not write a recipe. Print: `No sections identified. Page may be JavaScript-only with delayed render, or use a layout the agent could not parse. Try --screenshot=<path> with a manual capture.`
- **User cancels at any prompt:** no files written, no Chrome tabs left open.
- **Authenticated page detected:** when Chrome MCP successfully renders a page that looks like a logged-in view (heuristic: presence of session UI like avatars, account menus, dashboard chrome), set `authenticated: true` in the recipe metadata. Print a note in the summary: `This recipe was extracted from an authenticated page. Re-extraction from a clean session will not reproduce.`

## 5. Implementation note — Chrome MCP portability

Chrome MCP is the v1 rendering primitive because (a) Tim has it installed, (b) it inherits the browser session for authenticated extraction, and (c) it requires zero install on the user side beyond the existing Claude in Chrome extension.

**If this command is ever ported to a different model environment (e.g., a CLI runner without Chrome MCP, a server-side agent, or a different model harness):** the rendering layer is the only thing that needs to change. Replace the Chrome MCP calls in step 5 with Playwright or another headless browser. The agent's HTML+screenshot input shape and the multimodal section-identification logic do not change. Mark this swap point clearly in the agent file with a `// PORT-NOTE:` comment block so it's discoverable.

The fallback `--screenshot=<path>` flag also serves as a portability hatch — any environment that can produce a screenshot file can drive the extractor, even without browser automation.

## 6. Test corpus / acceptance

The implementation plan should validate v1 against this corpus. Acceptance is taste-judged ("does the recipe feel right when Tim reads it?"), not test-asserted.

| URL | Kind | What the test exercises |
|---|---|---|
| `https://stripe.com/pricing` | marketing | Pricing tiers, comparison tables, FAQ at bottom |
| `https://linear.app` | marketing | Hero with video, feature grid with screenshots, CTA bands |
| `https://www.notion.so` | marketing | Bento-style hero, multi-section product walkthrough, social proof |
| `https://vercel.com/dashboard` (logged in) | dashboard | Authenticated extraction, dashboard-vocabulary types, KPI grids |
| One of Tim's own dashboards via Chrome MCP | dashboard | Authenticated path, real-world dashboard layout |

Acceptance criteria for each:
- Recipe writes successfully without unhandled errors.
- `kind` auto-detection is correct (or the user-correctable surface works).
- Section count is between 4 and 8 (composition-recipes rule 68 territory).
- Newly introduced types have specific, kebab-case names (not generic).
- `mobileBehavior` notes are present and read sensibly for at least 50% of sections.
- The recipe loads cleanly into `/design-page <name>` (rendered as placeholders for any types that don't yet have patterns).

## 7. Files to create

| Path | Purpose |
|---|---|
| `commands/design-recipe.md` | Slash command entry; parses `extract <url>` + flags; dispatches to the extractor agent; handles pre-confirm and write. |
| `agents/recipe-extractor.md` | Agent prompt: detection logic, vocabulary learning from existing recipes, naming guidance, section identification, propose-and-name interaction. Contains the `// PORT-NOTE:` block for the Chrome MCP swap point. |

No data files. No new schemas. No vocabulary registry. The simplification is the design.

## 8. Files to update

| Path | Change |
|---|---|
| `commands/design-page.md` | **Required.** Currently reads recipes only from `${CLAUDE_PLUGIN_ROOT}/data/recipes/<name>.json`; needs to also check `.design-rules/recipes/<name>.json` (project-local) so extracted recipes are usable with `/design-page`. Lookup order: project first (overrides), then bundled. Without this change, extract produces files `/design-page` cannot find — feature is unusable end-to-end. |
| `MANIFEST.md` | Add the new command and agent to the structure tree. Add a relationship note explaining recipes-as-vocabulary and the agent's reliance on existing recipes for the type map. |
| `README.md` | One-line addition under commands list. |
| `.claude-plugin/plugin.json` | Increment `version` (decision deferred to implementation; likely a minor bump). |

## 9. Open considerations (non-blocking)

These are noted for the implementation plan but do not change the design:

- **Section ordering when document order is ambiguous** (e.g., absolutely-positioned overlays). The agent uses primary content flow; floating elements like cookie banners and sticky CTAs are skipped.
- **Repeated section types within one recipe** (e.g., two `feature-grid` sections). The composition-recipes skill discourages this for dashboards but marketing pages frequently do it. Allow but flag.
- **Vocabulary divergence between the agent's choice and the user's rename.** When the user renames a proposed type at the propose-and-name prompt, that name becomes the type for this recipe — but the agent has no memory across extractions. If the user extracts a similar pattern next week and the agent re-proposes the original name, the user has to rename again. Acceptable for v1; a learning loop is a future feature.
- **`--unattended` mode quality.** Placeholder types (`unknown-N`) make the recipe harder to use directly with `/design-page`. Document this as a trade-off; users in `--unattended` are expected to refine the recipe by hand after.
