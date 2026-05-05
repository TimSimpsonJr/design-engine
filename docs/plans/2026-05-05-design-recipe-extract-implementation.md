# /design-recipe extract Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement `/design-recipe extract <url>` — a slash command + agent that fetches a URL, captures HTML and screenshots (Chrome MCP at 1440px and 390px), identifies sections in the screenshot via multimodal Claude, and writes a recipe JSON to `.design-rules/recipes/<name>.json`.

**Architecture:** One command file at `commands/design-recipe.md` (parses args, orchestrates flow, handles writes/prompts) and one agent file at `agents/recipe-extractor.md` (carries the section-identification prompt, naming guidance, and propose-and-name interaction logic). No new data files, no schemas, no migrations to existing recipes — vocabulary is implicit in existing recipes.

**Tech Stack:** Markdown (command + agent prompt), JSON (recipe output), Chrome MCP tools (`mcp__Claude_in_Chrome__tabs_create_mcp`, `navigate`, `resize_window`, `computer` for screenshots), WebFetch (HTML).

**Reference design doc:** `docs/plans/2026-05-05-design-recipe-extract-design.md`

---

## Implementation strategy

The feature is split into 4 phases. Each phase boundary produces a usable, valid plugin slice that can be smoke-tested independently.

| Phase | Boundary deliverable | Smoke-testable result |
|---|---|---|
| 1 | Command file scaffolded; arg parsing + project check + Chrome MCP detection work | `/design-recipe extract <url> --dry-run` parses args and reports detected setup, then exits |
| 2 | Agent file written; full extract flow runs end-to-end | `/design-recipe extract <url> --dry-run` produces a recipe JSON in chat |
| 3 | Write path + conflict handling + `/design-page` reads project recipes | `/design-recipe extract <url>` writes `.design-rules/recipes/<name>.json` and `/design-page <name>` finds it |
| 4 | MANIFEST + README updated; manual validation against 4 sites | Recipe extraction works on Stripe pricing, Linear, Notion, plus one authenticated page |

**Note on testing:** This is a markdown-driven Claude Code plugin. There is no unit test harness for command/agent prompts — "tests" are manual invocations that produce visible output. Where assertions about prompt behavior matter, they're documented as `Expected:` blocks below.

---

## Phase 1 — Command scaffolding

**Boundary deliverable:** `commands/design-recipe.md` exists with frontmatter, parses arguments, validates project state, and detects Chrome MCP availability. No agent dispatch yet.

### Task 1.1: Create command file with frontmatter and arg parsing skeleton

**Files:**
- Create: `commands/design-recipe.md`

**Step 1: Create file with frontmatter**

Use Write to create `commands/design-recipe.md` with this content:

```markdown
---
name: design-recipe
description: Extract a recipe from a URL. Fetches the page, captures screenshots at desktop and mobile widths, identifies sections via multimodal analysis, and writes a recipe JSON to .design-rules/recipes/<name>.json. v1 supports the `extract` subcommand only.
argument-hint: extract <url> [--name=<name>] [--kind=<kind>] [--screenshot=<path>] [--viewport=both|desktop|mobile] [--unattended] [--dry-run] [--force]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch, Task
---

# /design-recipe — Recipe Extractor

You operate on a URL to produce a recipe JSON in the user's project. v1 has one subcommand: `extract`. Future subcommands (`list`, `delete`, `show`) are not implemented.

## Step 0: Parse arguments

Trim `$ARGUMENTS`. Inspect the first whitespace-delimited token:

- Empty / whitespace only → error: `Usage: /design-recipe extract <url> [flags]` and stop.
- `extract` → continue to Case: extract.
- Anything else → error: `Unknown subcommand "<token>". v1 supports only: extract.` and stop.

## Case: extract

Parse the remainder of `$ARGUMENTS`:

- First non-flag token after `extract` → `url`. Required.
- `--name=<name>` → `nameOverride`. Optional.
- `--kind=<kind>` → `kindOverride`. Optional. Valid: `dashboard`, `marketing`, `ecommerce`, `application-ui`, or any kebab-case string for future kinds.
- `--screenshot=<path>` → `screenshotOverride`. Optional. Path to a PNG/JPG.
- `--viewport=both|desktop|mobile` → `viewportMode`. Default: `both`.
- `--unattended` → `unattended` flag. Default: false.
- `--dry-run` → `dryRun` flag. Default: false.
- `--force` → `force` flag. Default: false.

If `url` is missing or doesn't start with `http://` or `https://`, error:

```
Usage: /design-recipe extract <url> [flags]
URL must be a full http(s):// URL.
```

Stop.

If both `--screenshot` and `--viewport=both` are passed, warn:

```
Note: --screenshot provides a single image; --viewport=both has no extra effect with a user-provided screenshot.
```

Continue.

## Step 1: Verify project initialized

Read `.design-rules/config.json` at the project root.

If missing, error:

```
No design system in this project — run `/design-init` first.
```

Stop.

If present, parse it. You don't need to use any field; this is just a guard so the agent doesn't write into an uninitialized project.

## Step 2: Resolve screenshot strategy

Decide `screenshotMode` based on flag precedence (highest priority first):

1. **`screenshotOverride` is set** (user passed `--screenshot=<path>`): `screenshotMode = "user-provided"`, `useChromeMcp = false`. The user-provided screenshot takes precedence over Chrome MCP — if you specified it, you want it used. Do not probe for Chrome MCP.
2. **Else, probe whether `mcp__Claude_in_Chrome__*` tools are available** in your environment. (You'll know based on whether the tool definitions appeared in your function list.)
   - If available → `screenshotMode = "chrome-mcp"`, `useChromeMcp = true`. Will use `tabs_create_mcp`, `tabs_context_mcp`, `navigate`, `resize_window`, and `computer` (action: screenshot) to capture viewports.
3. **Else (Chrome MCP unavailable AND no `--screenshot`):** prompt the user:

  ```
  Chrome MCP not detected and no --screenshot provided. Options:
  1. Install Claude in Chrome (https://claude.ai/chrome) and re-run
  2. Provide a screenshot path: --screenshot=<path>
  3. Proceed with HTML-only extraction (significantly less accurate)
  Type "html" to continue without screenshots, "cancel" to abort, or paste a screenshot path:
  ```

  - Response is a path → use it as `screenshotOverride`. Set `screenshotMode = "user-provided"`, `useChromeMcp = false`.
  - Response is "html" → set `screenshotMode = "html-only"`, `useChromeMcp = false`. Continue with degraded confidence.
  - Response is "cancel" or empty → stop, no files written.

After Step 2, exactly one of `screenshotMode ∈ {"chrome-mcp", "user-provided", "html-only"}` is set, and `useChromeMcp` is `true` only for `chrome-mcp`.

## Step 3: Derive recipe name

If `nameOverride` is set, validate it matches `^[a-z0-9][a-z0-9-]*$` (kebab-case, lowercase). If invalid, error: `--name must be kebab-case (lowercase letters, digits, hyphens; must start with a letter or digit).` and stop. Otherwise use it as `recipeName`. Skip the rest of this step.

Otherwise, derive `recipeName` from the URL:

1. **Parse the URL** (use Bash with `python -c` or equivalent if needed):
   - `protocol` (drop)
   - `host` — drop a leading `www.`
   - `port` — drop entirely (e.g., `localhost:3000` → `localhost`)
   - `path` — keep
   - `query` and `fragment` — drop entirely (`?foo=bar` and `#section` discarded; they don't represent layout)
2. **Normalize the host:**
   - If host is `localhost` or an IP literal (matches `^\d+\.\d+\.\d+\.\d+$` or contains `:` for IPv6), use the literal `localhost` or `<ip>` (replace `.` with `-` and `:` with `-`).
   - Else split on `.`. If the last segment is a 2-3 letter TLD (`com`, `io`, `net`, `org`, `app`, `co`, `dev`, `ai`, `so`) AND the second-to-last is also a 2-letter ccTLD candidate (`co.uk`, `com.au`), drop the last two segments. Otherwise drop only the last segment.
   - Examples: `stripe.com` → `stripe`; `linear.app` → `linear`; `www.notion.so` → `notion`; `shop.example.co.uk` → `shop-example`; `app.example.io` → `app-example`.
3. **Slug the path:**
   - Strip leading and trailing `/`.
   - Replace remaining `/` with `-`.
   - Replace any character not in `[a-z0-9-]` with `-` (lowercase first).
   - Collapse runs of `-`.
   - If empty after stripping, use `home`.
4. **Combine:** `<host-slug>-<path-slug>`. Lowercase. Collapse repeated `-`. Trim leading/trailing `-`.
5. **Validate length:** if longer than 64 characters, truncate to 64 and trim trailing `-`.

Examples:
- `https://stripe.com/pricing` → `stripe-pricing`
- `https://linear.app/` → `linear-home`
- `https://www.notion.so/product` → `notion-product`
- `https://app.example.io/dashboard/overview` → `app-example-dashboard-overview`
- `https://localhost:3000/foo?x=1#y` → `localhost-foo`
- `https://192.168.1.10/admin` → `192-168-1-10-admin`
- `https://shop.example.co.uk/checkout` → `shop-example-checkout`

Set `recipeName`.

## Step 4: Dispatch to recipe-extractor agent

Use the Task tool to invoke the `recipe-extractor` agent at `${CLAUDE_PLUGIN_ROOT}/agents/recipe-extractor.md`. Pass these inputs in the prompt (all required even if null):

- `url`
- `recipeName`
- `kindOverride` (or null)
- `useChromeMcp` (boolean)
- `screenshotMode` (one of `"chrome-mcp" | "user-provided" | "html-only"` — set in Step 2)
- `screenshotOverride` path (or null)
- `viewportMode`
- `unattended` flag
- The list of all bundled recipe paths: `${CLAUDE_PLUGIN_ROOT}/data/recipes/*.json` (use Glob)
- The list of project recipe paths: `.design-rules/recipes/*.json` (use Glob; may be empty)

The agent returns its result as a single fenced JSON code block — for example:

````
```json
{ "recipe": ..., "newVocabulary": [...], "notes": [...] }
```
````

**Parse the agent's output:**
1. Take the agent's full text response.
2. Extract the content between the first ```` ```json ```` (or ```` ``` ````) and its closing ```` ``` ````. If no fenced block is found, treat the entire response as the JSON candidate.
3. `JSON.parse` (or equivalent) the extracted text. If parse fails, surface the raw response to the user, do not write, stop with: `Agent returned malformed output. See above for raw response.`

Two valid result shapes:

- **Success:** `{ "recipe": <recipe object>, "newVocabulary": [<list of new type names introduced>], "notes": [<warnings or info>] }`
- **Failure:** `{ "error": "<message>", "stage": "<fetch | render | identify | format>" }`

If the result has an `error` field, surface the error and stage to the user, do not write, stop.

## Step 5: Pre-confirm

If `dryRun` is true, print the recipe JSON to chat in a code block, plus the agent's `notes` and `newVocabulary` summary. Skip steps 6-8.

Otherwise, print:

```
Extracted recipe `<recipeName>` (kind: <recipe.kind>) from <url>.

<pretty-printed recipe JSON>

New vocabulary: <comma-separated newVocabulary, or 'none'>
Notes: <newline-joined notes, or 'none'>

Save to .design-rules/recipes/<recipeName>.json? [Y/n]
```

If user types `n`/`no`, stop. No files written.
If user types `y`/`yes`/empty/return, continue to Step 6.

## Step 6: Conflict resolution

Check whether `.design-rules/recipes/<recipeName>.json` already exists.

If it does NOT exist, set `writePath` to the original path and proceed.

If it exists AND `force` is true: overwrite without asking. Set `writePath` to the original path.

If it exists AND `force` is false:

1. Compute the next available suffixed path. Strategy:
   - If `recipeName` already ends in `-<N>` where N is a positive integer (e.g., `stripe-pricing-2`), strip the suffix to get `baseName`. Otherwise `baseName = recipeName`.
   - Find the smallest integer `N >= 2` such that `.design-rules/recipes/<baseName>-<N>.json` does not exist. Call this `suggestedPath`.
2. Prompt:

   ```
   File exists at .design-rules/recipes/<recipeName>.json. Options:
   1. Overwrite
   2. Write to <suggestedPath>
   3. Cancel
   [1/2/3, default: 2]:
   ```

3. Default to option 2 on Enter or empty input. Map answer to `writePath`.

If user picks 3 / cancel, stop, no files written.

## Step 7: Write the recipe

Create `.design-rules/recipes/` if it doesn't exist (use Bash `mkdir -p .design-rules/recipes`).

Write the recipe JSON to `writePath` using Write. Use 2-space indent, with trailing newline.

## Step 8: Summary

Print:

```
Saved recipe `<recipeName>` to <writePath>.
  Kind: <recipe.kind>
  Sections: <count> (<comma-separated section types>)
  Source: <recipe.sourceUrl>
  Viewports captured: <recipe.viewportsCaptured joined>
  New vocabulary introduced: <newVocabulary or 'none'>
  Authenticated: <yes if recipe.authenticated, else omit line>

Next:
- /design-page <recipeName> "<description>" --recipe=<recipeName>  to scaffold a page using this recipe
- Edit <writePath> directly to refine props or section ordering
- Patterns for new vocabulary types live in adapters/react-shadcn/components/patterns/ — author when needed
```

## Notes for Claude

- Use absolute paths anchored at the project root for all file operations.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the plugin install directory.
- Don't invoke the agent more than once per call — it does the full extract in a single dispatch.
- If the agent returns malformed JSON, surface the raw output to the user and stop. Don't try to repair.
```

**Step 2: Validate the file is valid markdown with frontmatter**

Run: `head -10 commands/design-recipe.md`

Expected: First line `---`, frontmatter fields visible.

**Step 3: Commit**

```bash
git add commands/design-recipe.md
git commit -m "feat(commands): scaffold /design-recipe with arg parsing and project check"
```

---

## Phase 2 — Agent file

**Boundary deliverable:** `agents/recipe-extractor.md` exists with the full extraction prompt: HTML+screenshot intake, vocabulary learning, kind detection, section identification, propose-and-name interaction, and structured return.

### Task 2.1: Create the recipe-extractor agent file

**Files:**
- Create: `agents/recipe-extractor.md`

**Step 1: Write the agent file**

Use Write to create `agents/recipe-extractor.md` with this content:

````markdown
---
name: recipe-extractor
description: Extracts a structured recipe JSON from a URL by fetching HTML, capturing screenshots at desktop (1440px) and mobile (390px) widths, learning the existing vocabulary from bundled and project recipes, and identifying sections via multimodal visual analysis. Returns a recipe object plus any newly-introduced vocabulary names.
tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch, mcp__Claude_in_Chrome__tabs_create_mcp, mcp__Claude_in_Chrome__tabs_context_mcp, mcp__Claude_in_Chrome__navigate, mcp__Claude_in_Chrome__resize_window, mcp__Claude_in_Chrome__computer, mcp__Claude_in_Chrome__tabs_close_mcp
---

# Recipe Extractor Agent

You produce a structured recipe JSON describing the section-level layout of a web page. The caller (`/design-recipe extract`) provides a URL, a recipe name, configuration flags, and the paths to all known recipes for vocabulary context. You return a recipe + new-vocabulary report.

<!--
PORT-NOTE: Chrome MCP is the v1 rendering primitive. If this agent is ported
to a model environment without Chrome MCP (e.g., a CLI runner, a server-side
agent), the rendering layer is the only thing that needs to change:
replace the screenshot capture in §3 with Playwright or another headless
browser API. The HTML+screenshot input shape and the section-identification
logic in §4 do not change.
-->

## Inputs (caller passes these)

The dispatching command provides:

- `url` — full http(s):// URL
- `recipeName` — slug for the output recipe
- `kindOverride` — `"dashboard" | "marketing" | "ecommerce" | "application-ui" | <other>` or null
- `useChromeMcp` — boolean
- `screenshotMode` — `"chrome-mcp" | "user-provided" | "html-only"`
- `screenshotOverride` — file path or null
- `viewportMode` — `"both" | "desktop" | "mobile"`
- `unattended` — boolean (skip propose-and-name interaction)
- `bundledRecipePaths` — list of paths under `${CLAUDE_PLUGIN_ROOT}/data/recipes/`
- `projectRecipePaths` — list of paths under `.design-rules/recipes/`

## Output

Return a single JSON object (printed to chat as a fenced code block, nothing else):

```json
{
  "recipe": { /* see §6 for shape */ },
  "newVocabulary": ["<type-name>", ...],
  "notes": ["<warning or info string>", ...]
}
```

Or, on failure:

```json
{ "error": "<message>", "stage": "<step-name>" }
```

## §1 Build the vocabulary map

Read every recipe file in `bundledRecipePaths` and `projectRecipePaths`. For each, parse JSON and walk `sections[]`. Build an in-memory map keyed by section `type`:

```
typeName → {
  occurrences: <count>,
  exampleProps: [<example props objects>],
  appearsInRecipes: [<recipe.name list>]
}
```

This is the **known vocabulary**. You will use it in §4 to decide whether an observed section matches an existing type or warrants a new name.

## §2 Fetch HTML

Use WebFetch on `url`. Extract:

- `<title>` text
- All `<meta>` tags including `og:type`, `og:title`, `og:description`
- The first 6 `<h1>`, `<h2>`, `<h3>` elements (text only)
- Structural landmarks present: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<section>` count
- Document language (`<html lang="">`)

If WebFetch fails (network error, timeout, 4xx/5xx), return:

```json
{ "error": "Failed to fetch <url>: <reason>. Check the URL and network.", "stage": "fetch" }
```

Hold the extracted info in memory as `htmlSignal`. Used in §4 for kind detection and section identification cross-reference.

## §3 Capture screenshots

### §3a Chrome MCP path (`screenshotMode === "chrome-mcp"`)

1. Call `tabs_context_mcp` with `createIfEmpty: true` to ensure the MCP tab group exists. Note the existing tab ID list as `existingTabIds`.
2. Call `tabs_create_mcp` to create a new tab.
3. Call `tabs_context_mcp` again. The new tab is the one whose ID is not in `existingTabIds`. Capture this as `tabId`. (Don't assume `tabs_create_mcp`'s return shape — discover the new tab from the context diff.)
4. Track `tabId` for cleanup. Wrap the remainder of the capture in a try-finally pattern: on any failure between here and step 8, still attempt `tabs_close_mcp` with `tabId` before returning the error.
5. Call `navigate` with `url` and `tabId`. Then call `computer` with `action: "wait", duration: 3, tabId` to give the page time to settle (more for JS-heavy sites — bump to 5-8 seconds if the screenshot in step 6 looks empty).
6. **Desktop capture** (skip if `viewportMode === "mobile"`):
   - Call `resize_window` with `width: 1440, height: 900, tabId`.
   - Call `computer` with `action: "screenshot", tabId`. Do NOT pass `save_to_disk` — that flag exists to share images with the user, not for the agent to view them. The screenshot is automatically attached to the agent's context as visual content. Hold the result as `desktopScreenshot`.
7. **Mobile capture** (skip if `viewportMode === "desktop"`):
   - Call `resize_window` with `width: 390, height: 844, tabId`.
   - Call `computer` with `action: "screenshot", tabId`. Hold as `mobileScreenshot`.
8. Call `tabs_close_mcp` with `tabId` to clean up. (Always run this — even if step 5/6/7 failed, per step 4's try-finally.)

If any Chrome MCP call fails:
- Always run `tabs_close_mcp` for `tabId` before returning, if `tabId` was set.
- Return:

```json
{ "error": "Chrome MCP capture failed: <reason>. Try --screenshot=<path> with a manual capture.", "stage": "render" }
```

### §3b User-provided path (`screenshotMode === "user-provided"`)

Use the Read tool on `screenshotOverride`. The Read tool supports image files (PNG/JPG) and presents them as visual content for multimodal analysis. Hold the result as `desktopScreenshot`. `mobileScreenshot` is null.

Set `viewportsCaptured = ["1440px"]` as a best assumption — the user knows what they captured. If they passed a mobile shot, `mobileBehavior` fields cannot be filled and will be omitted, but the recipe is still produced.

If Read fails (file not found, unreadable), return:

```json
{ "error": "Could not read screenshot at <path>: <reason>", "stage": "render" }
```

### §3c HTML-only (`screenshotMode === "html-only"`)

Both screenshots are null. Section identification will rely solely on `htmlSignal`. This significantly degrades accuracy for JS-heavy sites — note this in the output.

### §3d Track viewports captured

Set `viewportsCaptured` to the list of widths actually captured: e.g., `["1440px", "390px"]`, `["1440px"]`, or `[]` (html-only).

## §4 Identify sections (multimodal pass)

This is the core of the agent. You are looking at the desktop screenshot (or `htmlSignal` only if html-only), comparing against the known vocabulary, and producing an ordered section list.

### §4a Detect `kind`

If `kindOverride` is set, use it as `kind`. Skip detection.

Otherwise, classify based on these signals (in priority order):

1. **URL path heuristics:**
   - `/dashboard`, `/app`, `/admin`, `/console`, `/portal`, `/account`, `/settings`, `/inbox`, `/feed` → `dashboard`
   - `/pricing`, `/about`, `/features`, `/product(s)`, `/customers`, `/blog`, `/docs`, `/contact`, `/`, `/home`, `/index` → `marketing`
   - `/shop`, `/store`, `/cart`, `/checkout`, `/products/<id>`, `/category/<x>` → `ecommerce`
2. **Page chrome cues from screenshot** (if available):
   - Persistent left/top navigation with logged-in user avatar → `dashboard`
   - Hero with large headline + CTA buttons + marketing-style typography → `marketing`
   - Product grid with prices and Add-to-Cart buttons → `ecommerce`
3. **`<title>` and `og:type` cues from htmlSignal:**
   - `og:type: product` → `ecommerce`
   - `og:type: website` with title containing "Pricing" / "Features" / "About" → `marketing`
4. **Default:** `marketing` (most extractable URLs are marketing).

### §4b Walk the desktop screenshot top-to-bottom

Identify visually distinct sections in document order. A "section" is a horizontally-spanning band of related content separated from neighbors by whitespace, color change, or a clear hierarchical break.

For each candidate section:

1. **Describe it briefly** (mental note, not output): "Hero with two-column layout — left has eyebrow + headline + CTA; right has video frame."
2. **Check the vocabulary map** for matches. Score by:
   - Is the layout shape the same? (e.g., 4-card grid for `kpi-grid`)
   - Are the visual elements the same family? (e.g., big headline + small CTA = hero family)
   - Do the example props from existing recipes plausibly fit this section?
3. **High-confidence match** (visual + structural fit): use the existing type.
4. **Ambiguous or no match:** propose a new type name following §4d guidance. Do **not** force-fit — naming a new type is preferred over wrong classification.

### §4c Extract props per section

For each section, extract observable props. Match the prop style of existing recipes for that type when possible (read from `exampleProps` in the vocabulary map). Examples:

- `kpi-grid`: `{ "columns": 4, "items": ["mrr", "active-users", "churn", "conversion"] }` — extract column count and human-named metric labels.
- `hero-card` or `hero-with-headline-and-eyebrow`: `{ "eyebrow": "Pricing", "headline": "Pricing built for businesses of all sizes" }` — extract observed text *categories*, not the exact text. (We don't ship copyrighted copy in the recipe.)
- `pricing-three-tiers-monthly-toggle`: `{ "tierCount": 3, "billingToggle": ["monthly", "yearly"], "highlightTier": "middle" }`.

**Important:** props describe *structure and configuration*, not literal copy. Use category names (`"primary-revenue"`, `"todays-sales"`) where possible. If exact text seems load-bearing for the layout (a key headline), include it as a string but keep it short.

### §4d Naming new types

When proposing a new type name:

- **Use kebab-case.** Lowercase, hyphens between words.
- **Prefer Tailwind UI Plus block names as inspiration** when the section visually matches one. Tailwind UI Plus categorizes blocks across Marketing, Application UI, and E-commerce. Common names worth using when applicable:
  - Hero: `hero-with-image-tiles`, `hero-with-screenshot`, `hero-split-with-screenshot`, `hero-with-app-screenshot`, `hero-with-eyebrow-and-screenshot`
  - Feature: `feature-grid-three-col`, `feature-grid-with-screenshots`, `feature-section-with-screenshot`, `feature-section-with-large-screenshot`
  - Pricing: `pricing-two-tiers`, `pricing-three-tiers`, `pricing-three-tiers-monthly-toggle`, `pricing-with-comparison-table`
  - CTA: `cta-with-newsletter`, `cta-simple-centered`, `cta-with-app-screenshot`
  - Stats: `stats-with-description`, `stats-grid-on-brand-background`
  - Logo cloud: `logo-cloud`, `logo-cloud-with-headline`
  - Testimonials: `testimonial-grid`, `testimonial-single-large`
  - FAQ: `faq-accordion`, `faq-two-column`
  - Footer: `footer-simple`, `footer-with-newsletter`, `footer-multi-col-with-newsletter`
  - Header: `header-simple`, `header-with-cta`, `header-with-mega-menu`
  - Bento: `bento-grid-two-rows`, `bento-grid-three-rows`
- **Be specific.** `pricing-three-tiers-monthly-toggle` is better than `pricing`. Specificity helps future extractions match a known type rather than re-proposing a similar one.
- **Don't pluralize the suffix.** Use `feature-grid-three-col`, not `feature-grids`.

If the section truly doesn't fit any Tailwind-UI-Plus shape and no existing recipe uses this layout, invent a name that describes shape + content: `dashboard-with-sidebar-nav-and-detail-panel`, `editorial-spread-with-pull-quote`.

### §4e Compare to mobile screenshot for `mobileBehavior`

If `mobileScreenshot` exists, locate the same section's region on the mobile capture (visual landmark matching: same text, same color band, same icon). Compare the desktop and mobile renderings:

- Do columns collapse? Stack? Switch order?
- Do CTAs change shape (full-width? sticky?)?
- Do icons or images shrink, hide, or move?
- Do toggles/tabs switch to a different control (e.g., dropdown)?

Write a short string capturing what's different. Examples:
- `"Stacks to 2 columns. Trend arrows hide; values stay visible."`
- `"Cards stack vertically. Highlighted tier moves to top of stack."`
- `"Headlines wrap. CTA buttons become full-width."`

Omit the field entirely if the section behaves identically (rare in practice — this case is mostly text-only sections).

If `mobileScreenshot` is null (`viewportMode === "desktop"`, user-provided, or html-only), omit `mobileBehavior` from every section.

### §4f Section count cap

If you've identified more than 8 distinct sections, pick the 8 most representative. Selection priority:

1. The hero / above-fold lead section (always include).
2. Any section that reuses an existing vocabulary type with high confidence (these are the highest-value matches).
3. The most visually distinct sections (variety).
4. The footer (always include if visible — useful for kind detection signal).

Drop the rest. Add a note: `"Identified <N> distinct sections; included the 8 most representative. Page has more variety than fits a single recipe."`

## §5 Authenticated-page heuristic

If `useChromeMcp === true` and you observed any of these in the desktop screenshot, set `recipe.authenticated = true`:

- A user avatar in the header chrome
- An account/profile menu
- A "Sign out" / "Logout" link or button
- Personalized greeting text ("Hi, Tim", "Welcome back, ...")
- Dashboard chrome with personal data (account balance, your tasks, your team)

If none of these are present, omit the `authenticated` field entirely (don't set to false).

If `useChromeMcp === false`, never set `authenticated` (you don't have signal).

## §6 Build the recipe object

Construct the recipe in this exact shape (fields marked with `// optional` may be omitted entirely; never write them with `null` or `false`):

```jsonc
{
  "name": "<recipeName>",
  "version": 1,
  "kind": "<kind>",
  "sourceUrl": "<url>",
  "extractedAt": "<YYYY-MM-DD UTC date>",
  "viewportsCaptured": ["1440px", "390px"],
  "authenticated": true,            // optional — include only when §5 detects authentication
  "sections": [
    {
      "type": "<typeName>",
      "props": { ... },
      "mobileBehavior": "<string>"  // optional — include only when §4e produced a string
    }
  ]
}
```

Field rules:
- `name`, `version`, `kind`, `sourceUrl`, `extractedAt`, `viewportsCaptured` are always present.
- `authenticated` only present if §5 detected it.
- `sections[].mobileBehavior` only present if §4e wrote a string for that section.
- `sections[].props` is always present (may be `{}` for content-bare sections like a divider band, but those should be rare).

## §7 Inline propose-and-name interaction

If `unattended === false`, walk the new types you've introduced (any type not in the vocabulary map) and confirm with the user one at a time:

```
Section <N> of <total> looks like this:
[describe the section briefly: "Hero with eyebrow text, large headline, two CTAs, and a video on the right"]

Proposed type: `<typeName>`
Description: <one-line description of the layout pattern>
Props detected: <comma-separated keys>

Save as `<typeName>`? [y/r/s/c] (yes / rename / skip / cancel)
```

Handle responses:
- `y` / yes / empty → accept, no change.
- `r` / rename → ask `New name (kebab-case, must match ^[a-z][a-z0-9-]*$):`. If the input doesn't match, re-prompt. Replace the type name in the recipe (and in `newVocabulary`).
- `s` / skip → replace the type with `unknown-<index>` (e.g., `unknown-1`); add a note to `notes`.
- `c` / cancel → return:

  ```json
  { "error": "Extraction cancelled by user during propose-and-name.", "stage": "identify" }
  ```

  This causes the calling command to surface the cancellation and write nothing.

If `unattended === true`, skip this interaction entirely. New types are kept as proposed.

## §8 Build the return object

```json
{
  "recipe": <the recipe object from §6>,
  "newVocabulary": [<type names introduced in this extraction that weren't in the vocabulary map>],
  "notes": [<any informational strings: section-cap warning, html-only warning, etc.>]
}
```

Print this as a single fenced JSON code block. Nothing else outside the code block — the calling command will parse it.

## §9 Failure modes

Wherever you bail out, return:

```json
{ "error": "<human-readable message>", "stage": "<one of: fetch | render | identify | format>" }
```

Stages:
- `fetch` — WebFetch failed.
- `render` — Chrome MCP failed and no fallback succeeded.
- `identify` — could not identify any sections (page may be JS-only with delayed render, or use a layout the agent could not parse).
- `format` — internal: failed to construct valid JSON from the inputs.

Never write files yourself. The calling command handles all writes.
````

**Step 2: Verify file is well-formed**

Run: `head -30 agents/recipe-extractor.md && echo --- && wc -l agents/recipe-extractor.md`

Expected: First line `---`, frontmatter visible, line count between 200-400.

**Step 3: Commit**

```bash
git add agents/recipe-extractor.md
git commit -m "feat(agents): recipe-extractor agent with multimodal section identification"
```

---

## Phase 3 — Wire-up and validation harness

**Boundary deliverable:** End-to-end `--dry-run` produces a recipe; full mode writes a file with conflict resolution; `/design-page` can find and use extracted recipes from `.design-rules/recipes/`; summary output is correct.

### Task 3.1: End-to-end dry-run smoke test

**Files:** None (manual test).

**Step 1: Pick a static, simple test URL**

Use `https://example.com` — a static page that renders identically at all viewports and produces a trivial result. Good first smoke test before hitting a real corpus URL.

**Step 2: Invoke the command**

Run in a project that has been initialized via `/design-init`:

```
/design-recipe extract https://example.com --dry-run
```

**Step 3: Verify expected behavior**

Expected:
- Args parse without error.
- Project init check passes.
- Chrome MCP detected (or fallback prompt shown — paste a manual screenshot path if needed).
- WebFetch succeeds; htmlSignal extracted.
- Screenshot captured (one or two depending on viewportMode).
- Agent returns a recipe with 1-2 sections (example.com is small).
- Recipe is printed to chat in a code block.
- No file written (dry-run).

If any step fails, debug the corresponding agent step (`§1`–`§9`) before proceeding.

**Step 4: Commit any fixes**

If the agent or command file needed adjustments to handle the smoke test, commit:

```bash
git commit -m "fix(commands|agents): <specific issue> from example.com smoke test"
```

### Task 3.2: Conflict resolution test

**Files:** None (manual test).

**Step 1: Run extract twice with the same URL**

```
/design-recipe extract https://example.com
```

Pre-confirm with `y`. Recipe written to `.design-rules/recipes/example-home.json`.

```
/design-recipe extract https://example.com
```

**Step 2: Verify conflict prompt appears**

Expected output includes:

```
File exists at .design-rules/recipes/example-home.json. Options:
1. Overwrite
2. Write to .design-rules/recipes/example-home-2.json
3. Cancel
[1/2/3, default: 2]:
```

**Step 3: Test each branch**

- Press Enter (default 2): file written to `example-home-2.json`. Verify with `ls .design-rules/recipes/`.
- Run again, type `1`: original `example-home.json` overwritten. Verify with `cat .design-rules/recipes/example-home.json` matches latest extraction.
- Run again, type `3`: no file written. Verify with `ls -la .design-rules/recipes/` (no new file).
- Run with `--force`: original overwritten silently, no prompt.

**Step 4: Clean up**

```bash
rm .design-rules/recipes/example-home*.json
```

No commit (cleanup of test artifacts).

### Task 3.3: Update /design-page to read project-local recipes

**Files:**
- Modify: `commands/design-page.md`

**Why:** Today `/design-page` reads recipes only from `${CLAUDE_PLUGIN_ROOT}/data/recipes/<name>.json`. Extracted recipes land in `.design-rules/recipes/<name>.json`, which `/design-page` doesn't look at — making extracted recipes unusable end-to-end. This task fixes the lookup.

**Step 1: Read the current Step 3 of `/design-page`**

Run: `grep -n "data/recipes" commands/design-page.md`

Expected: hit on the `${CLAUDE_PLUGIN_ROOT}/data/recipes/<recipeName>.json` path.

**Step 2: Replace the recipe lookup logic**

Find this block in `commands/design-page.md` (Step 3):

```
Read `${CLAUDE_PLUGIN_ROOT}/data/recipes/<recipeName>.json`.

If the file doesn't exist (Phase 8 hasn't created recipe files yet):
- Print a soft warning: "Recipe `<recipeName>` not found at expected path — using a generic skeleton. Phase 8 will add the recipe file."
- Use a default fallback: `{ "name": "<recipeName>", "sections": [{ "type": "hero" }, { "type": "kpi-grid", "columns": 2 }, { "type": "section-card", "title": "Recent Activity" }] }`
```

Replace with:

```
Look up the recipe in this order (project overrides bundled):

1. `.design-rules/recipes/<recipeName>.json` (project-local — extracted or hand-authored)
2. `${CLAUDE_PLUGIN_ROOT}/data/recipes/<recipeName>.json` (bundled with the plugin)

Stop at the first hit. Note the source for the summary in Step 9 (e.g., "(from project)" or "(from bundled)").

If neither exists:
- Print a soft warning: "Recipe `<recipeName>` not found in project (.design-rules/recipes/) or bundled (data/recipes/). Using a generic skeleton."
- Use a default fallback: `{ "name": "<recipeName>", "sections": [{ "type": "hero" }, { "type": "kpi-grid", "columns": 2 }, { "type": "section-card", "title": "Recent Activity" }] }`
```

**Step 3: Update the inline-prompt list of recipes**

Find this block in Step 2 of `/design-page`:

```
3. If both are absent, prompt the user inline:

   ```
   No recipe set. Pick one:
   1. saas — dashboard with KPI grid + charts + activity
   ...
   ```
```

Add a hint above the numbered list mentioning project recipes:

```
If `.design-rules/recipes/` contains any project recipes (Glob `.design-rules/recipes/*.json`), list those first before the bundled options:

   ```
   No recipe set. Pick one:

   Project recipes (.design-rules/recipes/):
   - <name1>
   - <name2>

   Bundled recipes:
   1. saas — dashboard with KPI grid + charts + activity
   ...
   ```

Map a project-recipe name typed by the user to that recipe directly.
```

(Adapt to existing markdown structure; goal is that project recipes are visible at the prompt.)

**Step 4: Verify**

Run: `grep -A2 "design-rules/recipes" commands/design-page.md`

Expected: at least 2 hits (lookup + the inline-prompt addition).

**Step 5: Commit**

```bash
git add commands/design-page.md
git commit -m "feat(commands): /design-page reads project-local recipes from .design-rules/recipes/"
```

---

## Phase 4 — Documentation + corpus validation

**Boundary deliverable:** MANIFEST and README updated; the test corpus from the design doc has been run and produces taste-acceptable recipes.

### Task 4.1: Update MANIFEST.md

**Files:**
- Modify: `MANIFEST.md`

**Step 1: Add command and agent to the Structure section**

Edit MANIFEST.md. Under `commands/`, after the existing entries, add:

```
  design-recipe.md                               Extract a recipe from a URL via /design-recipe extract <url>; v1 supports extract subcommand only
```

Under `agents/`, after the existing entries, add:

```
  recipe-extractor.md                            Multimodal section-identification agent invoked by /design-recipe extract; uses Chrome MCP for HTML+screenshot capture
```

**Step 2: Add a Key Relationships entry**

Append a new paragraph in the Key Relationships section:

```markdown
**Recipe extraction.** `/design-recipe extract <url>` invokes `agents/recipe-extractor.md`, which fetches the page (WebFetch), captures screenshots at 1440px and 390px (Chrome MCP — see PORT-NOTE in the agent file for swap-out path), reads existing recipes for vocabulary context, and produces a recipe at `.design-rules/recipes/<name>.json`. Vocabulary is implicit in the union of `type` strings across all recipes — no separate catalog file. Extracted recipes carry `kind`, `sourceUrl`, `extractedAt`, `viewportsCaptured`, optional `authenticated` metadata, plus per-section `mobileBehavior` strings. Backwards-compatible with the bundled 5 recipes which lack these fields. See `docs/plans/2026-05-05-design-recipe-extract-design.md`.
```

**Step 3: Verify**

Run: `grep -A1 "design-recipe\|recipe-extractor" MANIFEST.md`

Expected: both new lines visible.

**Step 4: Commit**

```bash
git add MANIFEST.md
git commit -m "docs(manifest): add /design-recipe and recipe-extractor agent to structure map"
```

### Task 4.2: Update README.md

**Files:**
- Modify: `README.md`

**Step 1: Find the commands list**

Run: `grep -n "design-skin\|design-tokens" README.md`

Identify the commands reference section.

**Step 2: Add `/design-recipe` entry**

Add a single line in the appropriate location (alphabetical or grouped — match existing style):

```markdown
- `/design-recipe extract <url>` — extract a recipe from a URL (HTML + screenshot via Chrome MCP)
```

**Step 3: Verify**

Run: `grep "design-recipe" README.md`

Expected: the new line.

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): add /design-recipe extract to commands list"
```

### Task 4.3: Validate against test corpus — Stripe pricing

**Files:** None (manual test).

**Step 1: Run extraction**

```
/design-recipe extract https://stripe.com/pricing --dry-run
```

**Step 2: Acceptance criteria checklist**

Verify the printed recipe satisfies these:
- [ ] Auto-detected `kind === "marketing"`.
- [ ] Section count between 4 and 8.
- [ ] Every section has a kebab-case `type` name.
- [ ] At least one section uses a Tailwind-UI-Plus-style name (e.g., `pricing-three-tiers-monthly-toggle`).
- [ ] Newly-introduced types are specific, not generic (`pricing-three-tiers-monthly-toggle`, not `pricing`).
- [ ] At least 50% of sections have a non-empty `mobileBehavior` string.
- [ ] `sourceUrl`, `extractedAt`, `viewportsCaptured: ["1440px", "390px"]` all present.
- [ ] Recipe JSON is parseable (paste into any JSON validator).

**Step 3: If criteria fail, fix**

Most likely issues:
- Section identification is too coarse / too fine → adjust §4b heuristics in agent file.
- Naming is generic → adjust §4d guidance with more examples.
- Mobile behavior is missing → check §4e logic; verify mobile screenshot is being captured.
- Kind detection wrong → adjust §4a path heuristics.

Fix and re-run until checklist passes.

**Step 4: Commit any agent fixes**

```bash
git commit -m "fix(agents): tune <specific aspect> from Stripe pricing validation"
```

### Task 4.4: Validate against test corpus — Linear marketing

**Files:** None (manual test).

**Step 1: Run extraction**

```
/design-recipe extract https://linear.app --dry-run
```

**Step 2: Acceptance criteria checklist**

Same as 4.3. Linear has more video and animation; expect at least one section to need a new type name involving "video" or "animation". Verify naming gracefully describes the visual distinctness.

**Step 3: Fix and re-run as needed**

### Task 4.5: Validate against test corpus — Notion homepage

**Files:** None (manual test).

**Step 1: Run extraction**

```
/design-recipe extract https://www.notion.so --dry-run
```

**Step 2: Acceptance criteria checklist**

Same as 4.3. Notion has bento-style hero; expect a `bento-grid-*` type. Verify the agent doesn't try to flatten the bento internal cards into separate recipe sections (per design Option A: bento is one section type).

**Step 3: Fix and re-run as needed**

### Task 4.6: Validate authenticated extraction

**Files:** None (manual test).

**Step 1: Sign in to a real dashboard in the Chrome browser used by Chrome MCP**

Use one of: your Vercel dashboard, your Linear board, your GitHub dashboard, or any logged-in app you use.

**Step 2: Run extraction**

```
/design-recipe extract <your-dashboard-url> --dry-run
```

**Step 3: Acceptance criteria**

- [ ] Extraction succeeds (Chrome MCP inherits the browser session).
- [ ] `kind === "dashboard"` auto-detected.
- [ ] `authenticated: true` present in recipe.
- [ ] Section types match existing dashboard vocabulary where applicable (e.g., `kpi-grid`, `chart-card`, `list-section`).
- [ ] Summary output mentions "authenticated".

**Step 4: Cleanup**

If you accidentally wrote a real recipe (without `--dry-run`) and don't want it in the project, delete it:

```bash
rm .design-rules/recipes/<recipe-name>.json
```

### Task 4.7: Bump plugin.json version

**Files:**
- Modify: `.claude-plugin/plugin.json`

**Step 1: Read current version**

```bash
grep '"version"' .claude-plugin/plugin.json
```

**Step 2: Bump minor version**

If current is `0.1.0`, bump to `0.2.0` (or current minor + 1). Use Edit:

Old: `"version": "0.1.X",`
New: `"version": "0.2.0",`

(Adjust to actual current version.)

**Step 3: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "chore: bump version for /design-recipe extract"
```

### Task 4.8: Final commit + push + open PR

**Files:** None.

**Step 1: Verify clean state**

Run: `git status`

Expected: clean working tree on branch `design/issue-3-recipe-extract`.

**Step 2: Push the branch**

```bash
git push -u origin design/issue-3-recipe-extract
```

**Step 3: Open PR**

Use `gh pr create`:

```bash
gh pr create --title "feat: /design-recipe extract for issue #3" --body "$(cat <<'EOF'
## Summary

- Adds `/design-recipe extract <url>` command + `recipe-extractor` agent.
- Captures HTML and screenshots (Chrome MCP at 1440px and 390px); multimodal Claude identifies sections, matches against existing recipe vocabulary, and proposes new kebab-case type names for unknowns.
- Output is a recipe JSON at `.design-rules/recipes/<name>.json` with provenance (`sourceUrl`, `extractedAt`, `viewportsCaptured`, optional `authenticated`) and per-section `mobileBehavior` strings.
- Vocabulary is implicit in the union of `type` strings across existing recipes — no separate catalog file. Tailwind UI Plus block names are documented in the agent prompt as naming inspiration.
- Recipe shape is flat (no nested layouts); patterns absorb internal complexity. Backwards-compatible — bundled 5 recipes unchanged and still load correctly.
- Updates `/design-page` to look in `.design-rules/recipes/` (project) before `${CLAUDE_PLUGIN_ROOT}/data/recipes/` (bundled), so extracted recipes are usable end-to-end.

Closes [#3](https://github.com/TimSimpsonJr/design-engine/issues/3).

## Test plan

- [x] `--dry-run` on `https://example.com` produces a minimal recipe.
- [x] Conflict resolution: overwrite / suffix-N / cancel + `--force` all behave correctly.
- [x] Stripe pricing extraction passes acceptance checklist.
- [x] Linear marketing extraction passes acceptance checklist.
- [x] Notion homepage extraction passes acceptance checklist (bento not flattened).
- [x] Authenticated dashboard extraction sets `authenticated: true`.
- [x] `/design-page <extracted-name>` loads a recipe from `.design-rules/recipes/`.
- [x] MANIFEST.md and README.md updated.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 4: Verify PR opened**

```bash
gh pr view --web
```

Expected: browser opens to the new PR.

---

## Out-of-scope for this PR (tracked separately)

- Component-level extraction.
- Asset extraction (icons, illustrations, fonts).
- Multi-page / domain-wide extraction.
- Tablet viewport capture.
- Automated learning loop (remembering past renames across extractions).
- Bundled marketing/ecommerce recipe seeding from the test corpus extractions.
- Additional `/design-recipe` subcommands (`list`, `show`, `delete`).
