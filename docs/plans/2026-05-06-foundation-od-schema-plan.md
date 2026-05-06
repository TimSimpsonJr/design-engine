# Foundation: OD-aligned schema + craft layer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize design-engine's `data/` and skills to mirror nexu-io/open-design's data model, layer our universal craft principles into OD's 8 craft topics, add `tokens.json` (W3C) and `register.md` as plugin-only contract additions, and rewire commands to read/write the new contract.

**Architecture:** Five-phase rollout. Phase 1 lands schema specs as docs. Phase 2 builds the rule-triage sheet (HARD user gate before action). Phase 3 actions the triage. Phase 4 restructures bundled design-systems. Phase 5 rewires commands and adapter settings pages. DESIGN.md is the canonical narrative; tokens.json is canonical precise (one-way derived from DESIGN.md); theme.css is generated from tokens.json. Mid-session walk-away point after Phase 3.

**Tech Stack:** TypeScript (Node `--test` runner — see `tests/package.json`), markdown for skills/specs, JSON for tokens, CSS for theme files. No build step; the plugin is static.

**Companion design doc:** `docs/plans/2026-05-06-foundation-od-schema-design.md`. Reference it heavily — section numbers below cite that doc unless noted otherwise.

**Cross-model review gates (codex):**
- After this plan lands → `/cross-model-review-now plan`
- After Task 5.2 (DESIGN.md parser) → ad-hoc codex review before Task 5.5+
- After Task 5.3 (reverse derivation) → ad-hoc codex review before Task 5.5
- After Task 5.9 (first adapter rewire) → ad-hoc codex review before Tasks 5.10–5.12

**User gates:**
- After Task 1.1 (`docs/spec.md` written)
- **After Task 2.2 (triage sheet) — HARD GATE; no Phase 3 work without sign-off**
- After Task 3.5 (Phase 3 done) — recommended walk-away

---

## Phase 1: Schema specs (no code)

### Task 1.1: Write `docs/spec.md`

**Files:**
- Create: `docs/spec.md`

**Step 1: Draft the doc**

Single file with three subsections, mirroring design-doc Section 4. Content:

- **Section 1 — Overview.** Three-file contract: `DESIGN.md` (narrative, 9-section), `tokens.json` (W3C precise, derived one-way from DESIGN.md), `register.md` (5-section taste capture). Locations: bundled at `data/design-systems/<slug>/DESIGN.md` etc.; user-project at `<project-root>/DESIGN.md`, `<project-root>/tokens.json`, `<project-root>/register.md`. Active-DESIGN.md-as-runtime-context principle.
- **Section 2 — DESIGN.md format.** 9 sections enumerated (per design-doc 4.1). Header metadata rules per location (per design-doc 4.1). Numbering accepted both ways; emit numbered.
- **Section 3 — tokens.json format.** W3C Design Tokens spec compliance. Top-level groups (`color`, `font`, `typography`, `spacing`, `radius`, `shadow`, `motion`). `$type` inheritance. Aliases via `{group.token}` syntax. Worked example.
- **Section 4 — register.md format.** 5-section template (per design-doc 4.3). Note about canvas-side population deferred to RFC #21.
- **Section 5 — Derivation rules.** DESIGN.md → tokens.json mapping (Section 2 → color, Section 3 → font/typography, Section 5 → spacing, Section 6 → radius/shadow). One-way and lossy. Sections 1/4/7/8/9 narrative-only.
- **Section 6 — Craft consumption contract.** `od.craft.requires` frontmatter on skills; command-side context assembly (per design-doc Section 3 constraint 4).
- **Section 7 — Compatibility.** Format-compatible with OD; `data/` prefix is plugin-internal divergence.

Length target: ~150-250 lines of markdown.

**Step 2: Verify the doc reads cleanly**

Run: `wc -l docs/spec.md`
Expected: 150-250 lines.

**Step 3: Commit**

```bash
git add docs/spec.md
git commit -m "docs(spec): foundation schema spec — DESIGN.md, tokens.json, register.md"
```

**Step 4: User gate**

Pause. User reviews `docs/spec.md`. Address any feedback before proceeding.

---

### Task 1.2: Write `docs/triage-69-rules.md` skeleton

**Files:**
- Create: `docs/triage-69-rules.md`

**Step 1: Draft skeleton**

Markdown table with header row and one row per rule (1–69), all `Primary` and `Dest(s)` cells empty pending Task 2.2:

```markdown
# Triage: 69 Design-Language Rules

> Sorts each rule from `skills/design-language/SKILL.md` into destination(s)
> per design-doc Section 5.1. Built in Task 2.2; signed off at Gate 2 before
> Phase 3 actions any moves.

| # | Title | Primary | Dest(s) | Notes |
|---|---|---|---|---|
| 1 | Color Philosophy |  |  |  |
| 2 | Number/Currency Display |  |  |  |
| 3 | Text Hierarchy |  |  |  |
…
| 69 | Chart + Context Pairing |  |  |  |
```

Pull the rule titles by running:

```bash
grep -E "^## [0-9]+\." skills/design-language/SKILL.md | sed 's/^## //'
```

Use the output to populate the Title column for all 69 rows.

**Step 2: Commit**

```bash
git add docs/triage-69-rules.md
git commit -m "docs(triage): skeleton triage sheet for 69 rules — classifications pending"
```

---

## Phase 2: Triage classification (no rule moves)

### Task 2.1: Pull OD's 8 craft files verbatim

**Files:**
- Create: `data/craft/anti-ai-slop.md`
- Create: `data/craft/accessibility-baseline.md`
- Create: `data/craft/animation-discipline.md`
- Create: `data/craft/color.md`
- Create: `data/craft/form-validation.md`
- Create: `data/craft/rtl-and-bidi.md`
- Create: `data/craft/state-coverage.md`
- Create: `data/craft/typography.md`

**Step 1: Fetch each file from OD upstream**

For each topic, fetch from OD main:

```bash
mkdir -p data/craft
for topic in anti-ai-slop accessibility-baseline animation-discipline color form-validation rtl-and-bidi state-coverage typography; do
  gh api repos/nexu-io/open-design/contents/craft/${topic}.md --jq '.content' | base64 -d > data/craft/${topic}.md
done
```

**Step 2: Verify each file is non-empty and starts with a heading**

Run:

```bash
for f in data/craft/*.md; do
  head -1 "$f" | grep -q "^# " || echo "BAD: $f"
done
```

Expected: no output (all good).

**Step 3: Add a one-line note at the top of each file**

Each file gets a single line inserted after the H1, citing OD upstream:

```markdown
> Verbatim from [nexu-io/open-design `craft/<topic>.md`](https://github.com/nexu-io/open-design/blob/main/craft/<topic>.md). design-engine additions block prepended in Phase 3.
```

Use a script or do it by hand; the line is the same for all 8 files except the topic name.

**Step 4: Commit**

```bash
git add data/craft/
git commit -m "feat(craft): pull OD's 8 craft topics verbatim — design-engine additions in Phase 3"
```

---

### Task 2.2: Build the triage sheet — classify all 69 rules

**Files:**
- Modify: `docs/triage-69-rules.md`

This is the largest single task in the plan. It is mostly reading and reasoning, not coding. Estimated 90–120 minutes of focused work.

**Step 1: Read each rule in `skills/design-language/SKILL.md` and classify**

For each of the 69 rules, fill in the four columns:

- **Primary** — one of `UNIV`, `UNIV-EXTRA`, `UI-DASH`, `TOK`, or a `+`-joined hybrid like `UNIV+TOK`. Per design-doc Section 5.1.
- **Dest(s)** — comma-separated list of destination files. Possible destinations:
  - `craft/<topic>.md` for one of OD's 8 topics
  - `skills/design-engine/SKILL.md` (UNIV-EXTRA — universals not fitting OD's 8)
  - `skills/mobile-dashboard/SKILL.md` (UI-DASH)
  - `tokens.json` (TOK — values land in defaults)
- **Notes** — short rationale, especially for HYBRID rules where the rule splits.

Rules of thumb:
- "Single accent color" / "key color usage" → UNIV → `craft/color.md` + `craft/anti-ai-slop.md`
- A hex/oklch color value → TOK → `tokens.json`
- "430px viewport," "mobile section types," "donut chart" → UI-DASH → `mobile-dashboard`
- "Loading skeleton," "empty state," "error state" → UNIV → `craft/state-coverage.md`
- "Animation duration X," "framer-motion preset" → UNIV → `craft/animation-discipline.md` + TOK for durations
- "Microcopy tone," "UX writing" → UNIV-EXTRA (no OD topic) → `skills/design-engine/SKILL.md`
- "Number/currency display," "trend indicator," "KPI variation" → most likely UI-DASH (mobile-dashboard specialty)
- A11y rules (touch targets, contrast, focus) → UNIV → `craft/accessibility-baseline.md`

**Step 2: Tag any classification uncertainty**

If unsure about a classification, write `???` in the Primary column and a question in Notes. The user gate will resolve these.

**Step 3: Verify totals look reasonable**

Per RFC estimate: ~25-45 universal, 15-25 specialty, remainder token-expressible. After classifying, eyeball:

- UNIV (incl. UNIV-EXTRA) row count should be 30-50
- UI-DASH should be 10-25
- Pure TOK (no other class) should be 0-15 (most TOK rules are HYBRID)

If totals are wildly off, reread the rules with skewed classifications.

**Step 4: Commit**

```bash
git add docs/triage-69-rules.md
git commit -m "docs(triage): classify all 69 rules — pending Gate 2 sign-off"
```

**Step 5: HARD USER GATE**

Stop. Hand the sheet to the user for review. Do not proceed to Phase 3 until classifications are signed off. The user may revise classifications in-place; treat their version as authoritative.

---

## Phase 3: Apply triage

Each task in this phase reads the approved triage sheet and actions a slice of it. Mechanical given the sheet.

### Task 3.1: Prepend design-engine additions to each `data/craft/<topic>.md`

**Files:**
- Modify: `data/craft/anti-ai-slop.md`
- Modify: `data/craft/accessibility-baseline.md`
- Modify: `data/craft/animation-discipline.md`
- Modify: `data/craft/color.md`
- Modify: `data/craft/form-validation.md`
- Modify: `data/craft/rtl-and-bidi.md`
- Modify: `data/craft/state-coverage.md`
- Modify: `data/craft/typography.md`

**Step 1: For each topic, gather rules from the triage sheet whose `Dest(s)` includes that topic**

Filter `docs/triage-69-rules.md` for each topic.

**Step 2: Author the design-engine additions block**

Per design-doc Section 5.2, structure each file as:

```markdown
# craft/<topic>.md

> Verbatim from [nexu-io/open-design …]. design-engine additions block prepended.

## design-engine principles

### <Subtopic name> (from rule N)
<Authored rule body — concise, concrete, 2-6 lines per rule>

### <Another subtopic> (from rule M)
…

## OD baseline (verbatim from upstream)

<OD's existing content — unchanged, preserved verbatim>
```

The "## OD baseline" delimiter must be exact — it's the upstream-sync mechanical marker.

For each rule, distill to its principle (universal portion). Skip values (those go in tokens.json) and dashboard-specific applications (those stay in mobile-dashboard).

**Step 3: Verify each modified file**

Run: `wc -l data/craft/*.md`
Expected: each file grew (additions block landed before OD baseline).

Run: `grep -l "## OD baseline (verbatim from upstream)" data/craft/*.md | wc -l`
Expected: `8`.

**Step 4: Commit per topic (or all together if scope is small)**

```bash
git add data/craft/
git commit -m "feat(craft): layer design-engine principles on top of OD baseline"
```

---

### Task 3.2: Update `skills/design-engine/SKILL.md` with UNIV-EXTRA universals

**Files:**
- Modify: `skills/design-engine/SKILL.md`

**Step 1: Identify UNIV-EXTRA rules from triage sheet**

Filter rows where `Dest(s)` includes `skills/design-engine/SKILL.md`. These are universals that don't fit OD's 8 craft topics.

**Step 2: Add a new section to `skills/design-engine/SKILL.md`**

Append before the existing closing reference materials (or wherever fits the existing structure). Section title: `## Universal craft principles (from design-language triage)`. List each rule as a subsection with the source rule cited.

**Step 3: Verify**

Run: `wc -l skills/design-engine/SKILL.md`
Expected: grew from 590 lines (current) to ~700-900.

**Step 4: Commit**

```bash
git add skills/design-engine/SKILL.md
git commit -m "feat(design-engine): pull UNIV-EXTRA universals from design-language triage"
```

---

### Task 3.3: Build `data/tokens.json` default template

**Files:**
- Create: `data/tokens.json`

**Step 1: Aggregate TOK values from triage sheet**

From triage rows with TOK in `Primary`, collect concrete values. Likely sources:
- Status colors (Rules 1, 4, 39): `#6B9B7A`, `#FF4444`, `#3B82F6`, `#F59E0B`, `#C85A54`, etc.
- Shadow opacities (Rule 12): 4%, 6%, 8%
- Type scale (Rule 3): font sizes from the 5-level hierarchy table
- Spacing scale (Rules 13/14): 4px, 8px, 12px, 16px, 24px (or whatever the rules state)
- Radius scale: from existing `data/tokens/radii.json` migrated into W3C shape
- Motion durations (Rules 43/59): from existing `data/tokens/motion.json`

**Step 2: Write `data/tokens.json` in W3C format**

Per design-doc Section 4.2:

```json
{
  "$description": "design-engine default tokens (W3C Design Tokens spec)",
  "color": {
    "$type": "color",
    "status": {
      "success": { "$value": "#6B9B7A", "$description": "Trend up / completed" },
      "danger":  { "$value": "#FF4444", "$description": "Notification badge / error dot" },
      …
    },
    …
  },
  "spacing": {
    "$type": "dimension",
    "1": { "$value": "4px" },
    "2": { "$value": "8px" },
    …
  },
  …
}
```

Copy structure from existing `data/tokens/{6 files}.json` but reformat into W3C shape. Where existing tokens use bare strings, wrap in `{"$value": "..."}`. Where they use `{value, description}`, rename `value` → `$value`, `description` → `$description`.

**Step 3: Validate the JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('data/tokens.json'))" && echo OK`
Expected: `OK`.

**Step 4: Commit**

```bash
git add data/tokens.json
git commit -m "feat(tokens): default tokens.json template (W3C spec) from triage TOK values"
```

Note: old `data/tokens/{6 files}.json` stay in place. Deleted in Task 5.15.

---

### Task 3.4: Rewrite `skills/design-language/SKILL.md` → `skills/mobile-dashboard/SKILL.md`

**Files:**
- Create: `skills/mobile-dashboard/SKILL.md`
- Delete: `skills/design-language/SKILL.md`

**Step 1: Identify UI-DASH content**

Filter triage sheet for rows with `mobile-dashboard` in `Dest(s)`.

**Step 2: Author `skills/mobile-dashboard/SKILL.md`**

Frontmatter:

```yaml
---
name: mobile-dashboard
description: Use when designing data-dense mobile-first UI — dashboards, KPI grids, fintech screens, analytics interfaces, admin panels, chart-heavy layouts. Provides mobile-dashboard-specialty rules covering page layout, section types, KPI variation, chart/list patterns, and visual rhythm. Layers on top of design-engine for dashboard-specific specialty work. Do not use for marketing pages, content sites, blog UIs, native iOS/Android (use apple-design or material-design instead), or non-UI code.
od.craft.requires:
  - color
  - typography
  - anti-ai-slop
  - state-coverage
  - animation-discipline
---
```

Body: only UI-DASH content from the triage. Drop universals (now in craft/), drop concrete token values (now in tokens.json — the skill can reference them by name).

Length target: 800-1200 lines (from 2684 currently).

**Step 3: Delete the old skill**

```bash
git rm skills/design-language/SKILL.md
```

**Step 4: Verify**

Run: `wc -l skills/mobile-dashboard/SKILL.md`
Expected: 800-1200.

Run: `test ! -e skills/design-language/SKILL.md && echo "old skill gone"`
Expected: `old skill gone`.

**Step 5: Commit**

```bash
git add skills/mobile-dashboard/SKILL.md
git commit -m "refactor(skills): mobile-dashboard skill — UI-DASH content only, universals lifted to craft/"
```

---

### Task 3.5: Add `od.craft.requires` to remaining skills

**Files:**
- Modify: `skills/design-engine/SKILL.md`
- Modify: `skills/composition-recipes/SKILL.md`

(`skills/mobile-dashboard/SKILL.md` already has it from Task 3.4.)

**Step 1: Add frontmatter field to `skills/design-engine/SKILL.md`**

Per design-doc Section 3 constraint 4:

```yaml
od.craft.requires:
  - anti-ai-slop
  - color
  - typography
  - state-coverage
  - accessibility-baseline
```

**Step 2: Add frontmatter field to `skills/composition-recipes/SKILL.md`**

```yaml
od.craft.requires:
  - anti-ai-slop
  - typography
```

**Step 3: Verify**

Run: `grep -l "od.craft.requires" skills/*/SKILL.md | wc -l`
Expected: `3`.

**Step 4: Commit**

```bash
git add skills/design-engine/SKILL.md skills/composition-recipes/SKILL.md
git commit -m "feat(skills): declare od.craft.requires per consumption contract"
```

**Step 5: User gate (recommended walk-away)**

Phase 3 is complete. No command code touched. No old files removed. Safe to step away. Optional: spot-check 4-5 rules from the triage sheet to confirm they landed where the sheet said.

---

## Phase 4: Restructure design systems

### Task 4.1: Pull 4 design-systems from upstream

**Files:**
- Create: `data/design-systems/stripe/DESIGN.md`
- Create: `data/design-systems/vercel/DESIGN.md`
- Create: `data/design-systems/linear-app/DESIGN.md` (note: `linear-app`, not `linear`)
- Create: `data/design-systems/notion/DESIGN.md`

**Step 1: Verify upstream slugs**

Run:

```bash
gh api repos/VoltAgent/awesome-design-md/contents/design-md --jq '.[].name' | grep -iE "stripe|vercel|linear|notion"
```

Confirm exact slugs upstream. Expected output includes `linear-app` (not `linear`).

**Step 2: Fetch each DESIGN.md verbatim**

```bash
mkdir -p data/design-systems/stripe data/design-systems/vercel data/design-systems/linear-app data/design-systems/notion

for slug in stripe vercel linear-app notion; do
  curl -sL "https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/${slug}/DESIGN.md" \
    > "data/design-systems/${slug}/DESIGN.md"
done
```

**Step 3: Verify each file has the OD-canonical header**

Per design-doc Section 4.1 header metadata rules:

```bash
for slug in stripe vercel linear-app notion; do
  head -3 "data/design-systems/${slug}/DESIGN.md"
  echo "---"
done
```

Expected: each starts with `# Design System Inspired by …` H1 followed by `> Category: <Group>` line. If missing, the upstream file lacks them — do not add by hand; flag as upstream issue and proceed.

**Step 4: Validate 9 sections present**

```bash
for slug in stripe vercel linear-app notion; do
  count=$(grep -E "^## " "data/design-systems/${slug}/DESIGN.md" | head -9 | wc -l)
  echo "$slug: $count sections in first 9"
done
```

Expected: 9 for each (or close — some upstream DESIGN.md files may use ## subsections nested under top-level sections; manual check).

**Step 5: Commit**

```bash
git add data/design-systems/{stripe,vercel,linear-app,notion}/
git commit -m "feat(design-systems): import 4 design-systems verbatim from awesome-design-md upstream"
```

---

### Task 4.2: Hand-author Toss DESIGN.md

**Files:**
- Create: `data/design-systems/toss/DESIGN.md`

**Step 1: Author the file**

Toss isn't in awesome-design-md upstream. Hand-author following the 9-section format. Source material: existing `data/skins/toss.json` (palette + Pretendard font) plus Toss's public design system documentation.

Header (per OD convention):

```markdown
# Design System Inspired by Toss

> Category: Fintech & Crypto
> Korean fintech super-app. Clean blue accent, Pretendard typography, …

## 1. Visual Theme & Atmosphere
…
## 2. Color Palette & Roles
…
## 3. Typography Rules
…
…
## 9. Agent Prompt Guide
…
```

Length target: 200-400 lines (matches comparable upstream files).

**Step 2: Verify structure**

Run: `grep -E "^## " data/design-systems/toss/DESIGN.md | wc -l`
Expected: `9` (one heading per section).

**Step 3: Commit**

```bash
git add data/design-systems/toss/
git commit -m "feat(design-systems): hand-author Toss DESIGN.md (not in awesome-design-md upstream)"
```

---

### Task 4.3: Add Kami DESIGN.md

**Files:**
- Create: `data/design-systems/kami/DESIGN.md`

**Step 1: Pull from OD upstream**

```bash
mkdir -p data/design-systems/kami
gh api repos/nexu-io/open-design/contents/design-systems/kami/DESIGN.md --jq '.content' | base64 -d > data/design-systems/kami/DESIGN.md
```

**Step 2: Verify**

Run: `head -5 data/design-systems/kami/DESIGN.md`
Expected: H1 (`# 紙 / 纸` or similar) and `> Category:` line.

**Step 3: Commit**

```bash
git add data/design-systems/kami/
git commit -m "feat(design-systems): import Kami DESIGN.md verbatim from OD upstream"
```

---

### Task 4.4: Update `data/awesome-design-md-index.json` slugs

**Files:**
- Modify: `data/awesome-design-md-index.json`

**Step 1: Verify current slugs against OD-canonical**

Run:

```bash
node -e "
const local = require('./data/awesome-design-md-index.json').brands;
console.log('local count:', local.length);
console.log('first 10:', local.slice(0,10));
"
```

Compare against upstream:

```bash
gh api repos/VoltAgent/awesome-design-md/contents/design-md --jq '.[].name' | sort > /tmp/upstream-slugs.txt
node -e "console.log(require('./data/awesome-design-md-index.json').brands.sort().join('\n'))" > /tmp/local-slugs.txt
diff /tmp/local-slugs.txt /tmp/upstream-slugs.txt
```

Expected: minimal or no diff. Any mismatches → update local to match upstream.

**Step 2: Patch any mismatched slugs**

Update the brands array in `data/awesome-design-md-index.json`. Ensure normalized dotted slugs (`linear-app`, `x-ai`, etc.).

**Step 3: Commit**

```bash
git add data/awesome-design-md-index.json
git commit -m "fix(index): align slugs with awesome-design-md upstream (linear-app, x-ai, etc.)"
```

---

## Phase 5: Command rewiring

This is the largest phase by code volume. Most tasks here include test-first development. Test runner: `cd tests && npm install --no-save && node --test` (per existing convention, see `tests/package.json`).

### Task 5.1: theme-io.ts — tokens.json reader/writer + configurable target path

**Files:**
- Modify: `adapters/react-shadcn/templates/theme-io.ts`
- Modify: `adapters/astro/templates/theme-io.ts` (byte-identical copy)
- Modify: `adapters/sveltekit/templates/theme-io.ts` (byte-identical copy)
- Test: `tests/theme-io.tokens.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/theme-io.tokens.test.ts
import { test } from 'node:test';
import * as assert from 'node:assert';
import { readTokensFromCss, writeTokensToCss } from '../adapters/react-shadcn/templates/theme-io';

test('readTokensFromCss extracts CSS variables into W3C tokens.json shape', () => {
  const css = `
    :root {
      --color-brand: #ff385c;
      --spacing-1: 4px;
    }
  `;
  const tokens = readTokensFromCss(css);
  assert.deepEqual(tokens.color.brand, { $value: '#ff385c' });
  assert.deepEqual(tokens.spacing['1'], { $value: '4px' });
});

test('writeTokensToCss emits :root block from W3C tokens', () => {
  const tokens = {
    color: { $type: 'color', brand: { $value: '#ff385c' } },
    spacing: { $type: 'dimension', '1': { $value: '4px' } }
  };
  const css = writeTokensToCss(tokens);
  assert.match(css, /--color-brand:\s*#ff385c/);
  assert.match(css, /--spacing-1:\s*4px/);
});

test('writeTokensToCss preserves user-added unmanaged CSS', () => {
  const existing = `
    :root {
      --color-brand: #old;
      --my-custom: 42px;  /* user-added, unmanaged */
    }
  `;
  const tokens = { color: { $type: 'color', brand: { $value: '#new' } } };
  const result = writeTokensToCss(tokens, { existing });
  assert.match(result, /--color-brand:\s*#new/);
  assert.match(result, /--my-custom:\s*42px/);  // user-added survives
});
```

**Step 2: Run test, verify it fails**

```bash
cd tests && node --test theme-io.tokens.test.ts
```
Expected: FAIL — `readTokensFromCss` and `writeTokensToCss` don't exist.

**Step 3: Implement the functions**

Add `readTokensFromCss(css: string): Tokens` and `writeTokensToCss(tokens: Tokens, options?: { existing?: string }): string` to `theme-io.ts`. The functions complement (don't replace) the existing `parseTokens`/`writeTokens` API.

Behavior:
- `readTokensFromCss`: regex-extract CSS variables; group by `--<group>-<name>` prefix into `tokens.<group>.<name>`. Recognize `color`, `spacing`, `radius`, `shadow`, `motion`, `font`, `typography` prefixes; unknown prefixes go in a fallback `extra` group.
- `writeTokensToCss`: walk tokens.json groups, emit `:root { --<group>-<name>: <value>; }` block. Preserve user-added CSS via the existing managed-block markers (`/* @design-engine:managed */ ... /* @end:managed */`). The `existing` option lets the caller pass current file contents for surgical replacement.

**Step 4: Run test, verify it passes**

```bash
cd tests && node --test theme-io.tokens.test.ts
```
Expected: PASS, 3 tests.

**Step 5: Mirror changes to other adapters**

Copy theme-io.ts byte-identically from react-shadcn to astro and sveltekit (per MANIFEST note that these are byte-identical copies).

```bash
cp adapters/react-shadcn/templates/theme-io.ts adapters/astro/templates/theme-io.ts
cp adapters/react-shadcn/templates/theme-io.ts adapters/sveltekit/templates/theme-io.ts
```

**Step 6: Commit**

```bash
git add adapters/{react-shadcn,astro,sveltekit}/templates/theme-io.ts tests/theme-io.tokens.test.ts
git commit -m "feat(theme-io): add tokens.json reader/writer with managed-block preservation"
```

---

### Task 5.2: DESIGN.md → tokens.json parser

**Files:**
- Create: `adapters/react-shadcn/templates/design-md-parse.ts`
- Test: `tests/design-md-parse.test.ts`
- Test fixtures: `tests/fixtures/airbnb-DESIGN.md`, `tests/fixtures/stripe-DESIGN.md`, `tests/fixtures/linear-app-DESIGN.md`, `tests/fixtures/kami-DESIGN.md` (copy from `data/design-systems/<slug>/DESIGN.md` after Phase 4)

**Step 1: Add fixtures**

```bash
mkdir -p tests/fixtures
for slug in airbnb stripe linear-app kami; do
  # airbnb pulled from upstream; others from data/design-systems/
  if [ "$slug" = "airbnb" ]; then
    gh api repos/VoltAgent/awesome-design-md/contents/design-md/airbnb/DESIGN.md --jq '.content' | base64 -d > tests/fixtures/airbnb-DESIGN.md
  else
    cp "data/design-systems/${slug}/DESIGN.md" "tests/fixtures/${slug}-DESIGN.md"
  fi
done
```

**Step 2: Write the failing tests**

```typescript
// tests/design-md-parse.test.ts
import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import { parseDesignMd } from '../adapters/react-shadcn/templates/design-md-parse';

test('parseDesignMd extracts colors from Color Palette section (airbnb)', () => {
  const md = fs.readFileSync('tests/fixtures/airbnb-DESIGN.md', 'utf8');
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color.primary?.$value || tokens.color.rausch?.$value, '#ff385c');
});

test('parseDesignMd extracts typography from Typography Rules section', () => {
  const md = fs.readFileSync('tests/fixtures/airbnb-DESIGN.md', 'utf8');
  const tokens = parseDesignMd(md);
  assert.ok(tokens.font.primary, 'font.primary should exist');
});

test('parseDesignMd is lossy and tolerant — sections may be missing', () => {
  const md = `# Design System
> Category: Test

## 1. Visual Theme & Atmosphere
Just prose, no token data.

## 2. Color Palette & Roles
- **Brand** (\`#abc123\`)
`;
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color.brand?.$value, '#abc123');
  assert.deepEqual(tokens.font, { $type: 'fontFamily' });  // empty group
});

test('parseDesignMd handles unnumbered sections', () => {
  const md = `# Design System
## Color Palette & Roles
- **Brand** (\`#abc123\`)
`;
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color.brand?.$value, '#abc123');
});

test('parseDesignMd warns on unknown H2 headings without failing', () => {
  const md = `# Design System
## Frobnication Notes
Random unknown section.
## Color Palette & Roles
- **Brand** (\`#abc123\`)
`;
  // should not throw; should produce a result
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color.brand?.$value, '#abc123');
});
```

**Step 3: Run tests, verify they fail**

```bash
cd tests && node --test design-md-parse.test.ts
```
Expected: FAIL — `parseDesignMd` doesn't exist.

**Step 4: Implement `parseDesignMd`**

Per design-doc Section 4.2 derivation rule:
- Section 2 (Color Palette & Roles) — extract values from `**<Name>** (\`<value>\`)` patterns or `- **<Name>** (\`<value>\`)`. Group by subsection (Primary, Secondary & Accent, Surface, Neutrals, Semantic). Output `color.{group}.{name}`.
- Section 3 (Typography Rules) — extract Font Family ("**<Name>**: …"). Extract Hierarchy table rows (`| Role | Size | Weight | …`). Output `font.primary`, `typography.<role>.{size,weight,lineHeight}`.
- Section 5 (Layout Principles) — extract spacing scale if present in tabular form.
- Section 6 (Depth & Elevation) — extract radius and shadow values.
- Sections 1, 4, 7, 8, 9 — narrative-only; ignored.

Tolerance: missing sections → empty groups; unknown sections → warning only; unnumbered or numbered both OK; `oklch()`, `hsl()`, `rgba()` color values pass through verbatim as `$value`.

**Step 5: Run tests, verify they pass**

```bash
cd tests && node --test design-md-parse.test.ts
```
Expected: PASS, 5 tests.

**Step 6: Commit**

```bash
git add adapters/react-shadcn/templates/design-md-parse.ts tests/design-md-parse.test.ts tests/fixtures/
git commit -m "feat(parse): DESIGN.md → tokens.json one-way derivation parser"
```

**Step 7: Cross-model review gate**

Run `/cross-model-review-now impl` (or invoke codex directly) on the parser before downstream commands consume it. Address any feedback before Task 5.5.

---

### Task 5.3: theme.css → tokens.json reverse derivation

**Files:**
- Create: `adapters/react-shadcn/templates/theme-css-parse.ts`
- Test: `tests/theme-css-parse.test.ts`
- Test fixtures: `tests/fixtures/shadcn-globals.css`, `tests/fixtures/tailwind-v4-theme.css`, `tests/fixtures/astro-theme.css`, `tests/fixtures/svelte-theme.css`

**Step 1: Add fixtures**

Hand-author or sample from real-world setups (NOT external repos — store locally). Each fixture should represent a common shape:
- `shadcn-globals.css` — Next.js + shadcn + Tailwind v4 with `@theme inline { … }` block and `:root { --foreground: …; … }` block
- `tailwind-v4-theme.css` — Tailwind v4 standalone `@theme { … }` block
- `astro-theme.css` — Astro with plain `:root { --… }`
- `svelte-theme.css` — SvelteKit with `:root { --… }` and `:global` selectors

**Step 2: Write the failing tests**

```typescript
// tests/theme-css-parse.test.ts
import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import { parseThemeCss } from '../adapters/react-shadcn/templates/theme-css-parse';

test('parseThemeCss handles shadcn @theme inline + :root', () => {
  const css = fs.readFileSync('tests/fixtures/shadcn-globals.css', 'utf8');
  const tokens = parseThemeCss(css);
  assert.ok(Object.keys(tokens.color).length > 0, 'extracted some colors');
});

test('parseThemeCss handles Tailwind v4 standalone @theme', () => {
  const css = fs.readFileSync('tests/fixtures/tailwind-v4-theme.css', 'utf8');
  const tokens = parseThemeCss(css);
  assert.ok(Object.keys(tokens.color).length > 0);
});

test('parseThemeCss extracts oklch values verbatim', () => {
  const css = `:root { --color-accent: oklch(0.7 0.15 30); }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.accent?.$value, 'oklch(0.7 0.15 30)');
});

test('parseThemeCss extracts hsl, rgba, hex values', () => {
  const css = `:root {
    --color-a: #abc123;
    --color-b: hsl(120 50% 50%);
    --color-c: rgba(0,0,0,0.5);
  }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.a?.$value, '#abc123');
  assert.equal(tokens.color.b?.$value, 'hsl(120 50% 50%)');
  assert.equal(tokens.color.c?.$value, 'rgba(0,0,0,0.5)');
});

test('parseThemeCss tolerates unparseable values — leaves TODO stub', () => {
  const css = `:root { --color-weird: calc(var(--a) + var(--b)); }`;
  const tokens = parseThemeCss(css);
  // either stub or warning — should not throw
  assert.ok(tokens);
});
```

**Step 3: Run tests, verify they fail**

```bash
cd tests && node --test theme-css-parse.test.ts
```
Expected: FAIL.

**Step 4: Implement `parseThemeCss`**

Strategy:
- Find `@theme { … }` blocks (Tailwind v4) and `@theme inline { … }` blocks (Tailwind v4 inline mode for shadcn).
- Find `:root { … }` blocks.
- Extract `--<name>: <value>` pairs from any of those blocks.
- Group by prefix into `tokens.<group>.<name>` per same logic as `readTokensFromCss` from Task 5.1.
- For complex values that can't be normalized (calc(), CSS expressions referring to vars), emit `$value` as the raw string and mark `$extensions.designEngine.unparseable = true` so `/design-init` knows to TODO-stub the corresponding DESIGN.md section.

**Step 5: Run tests, verify they pass**

```bash
cd tests && node --test theme-css-parse.test.ts
```
Expected: PASS, 5 tests.

**Step 6: Commit**

```bash
git add adapters/react-shadcn/templates/theme-css-parse.ts tests/theme-css-parse.test.ts tests/fixtures/*.css
git commit -m "feat(parse): theme.css → tokens.json reverse derivation (init derive mode only)"
```

**Step 7: Cross-model review gate**

Run codex review on the reverse-derive parser specifically. Reverse-derive has more failure modes than forward; codex should poke at oklch math, hsl expressions, @theme variants, and calc() handling. Address feedback before Task 5.5.

---

### Task 5.4: Backward-compat upgrade path

**Files:**
- Create: `adapters/react-shadcn/templates/upgrade-config.ts` (shared utility)
- Test: `tests/upgrade-config.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/upgrade-config.test.ts
import { test } from 'node:test';
import * as assert from 'node:assert';
import { detectOldFormat, upgradeConfig } from '../adapters/react-shadcn/templates/upgrade-config';

test('detectOldFormat identifies pre-schemaVersion-2 configs', () => {
  assert.equal(detectOldFormat({ skin: 'stripe', adapter: 'react-shadcn' }), true);
  assert.equal(detectOldFormat({ skin: 'stripe', adapter: 'react-shadcn', schemaVersion: 2 }), false);
});

test('upgradeConfig adds schemaVersion=2 and themeFile path', () => {
  const old = { skin: 'stripe', adapter: 'react-shadcn' };
  const upgraded = upgradeConfig(old, { themeFile: 'src/app/globals.css' });
  assert.equal(upgraded.schemaVersion, 2);
  assert.equal(upgraded.themeFile, 'src/app/globals.css');
});

test('upgradeConfig preserves all existing fields', () => {
  const old = { skin: 'stripe', adapter: 'react-shadcn', recipe: 'fintech', settingsPage: true };
  const upgraded = upgradeConfig(old, { themeFile: 'theme.css' });
  assert.equal(upgraded.recipe, 'fintech');
  assert.equal(upgraded.settingsPage, true);
});
```

**Step 2: Run tests, verify they fail**

```bash
cd tests && node --test upgrade-config.test.ts
```
Expected: FAIL.

**Step 3: Implement**

Per design-doc Section 6.5:

```typescript
export function detectOldFormat(config: any): boolean {
  return !config.schemaVersion || config.schemaVersion < 2;
}

export function upgradeConfig(old: any, additions: { themeFile: string }): any {
  return { ...old, schemaVersion: 2, themeFile: additions.themeFile };
}
```

**Step 4: Run tests, verify they pass**

```bash
cd tests && node --test upgrade-config.test.ts
```
Expected: PASS, 3 tests.

**Step 5: Commit**

```bash
git add adapters/react-shadcn/templates/upgrade-config.ts tests/upgrade-config.test.ts
git commit -m "feat(upgrade): schemaVersion-2 upgrade detection and config migration"
```

---

### Task 5.5: `/design-init` — scratch + derive modes

**Files:**
- Modify: `commands/design-init.md`

**Step 1: Add derive-mode detection logic**

Per design-doc Section 6.1:

After existing scratch-mode setup steps, add a "Mode detection" section:

```markdown
## Mode detection

Before scaffolding, check for an existing theme. Detection priority:

1. **shadcn**: `components.json` exists at project root → derive mode, themeFile = value of `components.json.tailwind.css`.
2. **Tailwind v3**: `tailwind.config.{js,ts,cjs,mjs}` exists → derive mode, themeFile = first `*.css` referenced in the config's `content` glob (or fallback to `src/styles/globals.css` / `src/index.css` if found).
3. **Tailwind v4 `@theme` directive in any `*.css`**: grep for `@theme {` or `@theme inline {` in `src/**/*.css`, `app/**/*.css` → derive mode, themeFile = the matching file.
4. **Astro**: `astro.config.{mjs,ts,js}` exists → derive mode, themeFile = first `*.css` in `src/styles/`.
5. **SvelteKit**: `svelte.config.{js,ts}` exists → derive mode, themeFile = `src/app.css` or `src/routes/+layout.svelte`-referenced CSS.
6. Fallback: scratch mode (with confirmation prompt: "No existing theme detected. Initialize from scratch?").

If derive mode: invoke `theme-css-parse.ts:parseThemeCss(<themeFile>)` to extract tokens, then `design-md-parse.ts` reverse helper to template-fill DESIGN.md skeleton (Sections 2/3/5/6 derived from extracted tokens; Sections 1/4/7/8/9 stubbed with TODO markers).

If scratch mode: prompt user to pick from `data/design-systems/<slug>/DESIGN.md`. Stamp the chosen DESIGN.md, derive tokens.json from it, scaffold theme.css from tokens.json into the adapter's default location.
```

**Step 2: Add upgrade-path trigger**

If `.design-rules/config.json` already exists and `detectOldFormat(config) === true`:

```markdown
## Upgrade path (existing pre-schemaVersion-2 project)

1. Resolve active skin via existing 4-source lookup. Bundled cache now returns DESIGN.md.
2. Stamp `<root>/DESIGN.md` from the resolved DESIGN.md.
3. Derive tokens.json from DESIGN.md.
4. Compare derived tokens.json against the existing theme.css; if values diverge (user customized), preserve theme.css values in tokens.json and emit a warning.
5. Stamp `register.md` empty.
6. Call `upgradeConfig(config, { themeFile })` and write back.
```

**Step 3: Update file scaffolding to include DESIGN.md, tokens.json, register.md**

The existing `/design-init` writes adapter scaffold files. After scaffolding, additionally write:
- `<root>/DESIGN.md` — from chosen design-system or generated skeleton
- `<root>/tokens.json` — derived from DESIGN.md
- `<root>/register.md` — empty 5-section template (per design-doc Section 4.3)

**Step 4: Manual smoke test against fixtures**

Create a temporary test directory with a `tests/fixtures/shadcn-globals.css`-like setup. Run through the command logic mentally; verify scratch mode and derive mode both produce correct outputs.

**Step 5: Commit**

```bash
git add commands/design-init.md
git commit -m "feat(design-init): add scratch/derive mode detection + schemaVersion upgrade path"
```

---

### Task 5.6: `/design-skin` — DESIGN.md format end-to-end

**Files:**
- Modify: `commands/design-skin.md`

**Step 1: Source 4 caches DESIGN.md verbatim (not parsed)**

Per design-doc Section 6.1:

Update Source 4 logic to:
1. Fetch `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/<slug>/DESIGN.md`
2. Cache verbatim to `.design-rules/design-systems/<slug>/DESIGN.md` (no JSON parse)
3. Return path to the cached DESIGN.md

**Step 2: On apply, copy DESIGN.md to root + derive tokens.json + regen theme.css**

Replace the existing "write skin values to theme.css via theme-io" logic with:
1. Copy resolved DESIGN.md to `<root>/DESIGN.md`
2. Run `parseDesignMd(<root>/DESIGN.md)` → tokens.json
3. Write `<root>/tokens.json`
4. Run `writeTokensToCss(tokens, { existing: read(themeFile) })` → updated theme.css contents
5. Write back to `themeFile` (from `.design-rules/config.json`)

**Step 3: New subcommand `/design-skin save <name>`**

Add a save subcommand:
1. Read current `<root>/DESIGN.md`
2. Slugify name (per OD slug rules — dotted brands normalized, e.g., `linear.app` → `linear-app`)
3. Write to `~/.design-rules/design-systems/<slug>/DESIGN.md`

**Step 4: Lazy-migrate old saved global skins**

When `/design-skin <name>` is invoked and `~/.design-rules/skins/<name>.json` exists (old format) but `~/.design-rules/design-systems/<name>/DESIGN.md` does not:
1. Read the old JSON
2. Convert to a 9-section DESIGN.md skeleton (Sections 2/3 filled from JSON colors/fonts; rest TODO-stubbed)
3. Write to `~/.design-rules/design-systems/<name>/DESIGN.md`
4. Delete the old JSON file

**Step 5: Commit**

```bash
git add commands/design-skin.md
git commit -m "feat(design-skin): DESIGN.md format end-to-end + lazy-migrate old global skins"
```

---

### Task 5.7: `/design-tokens` — operates on tokens.json

**Files:**
- Modify: `commands/design-tokens.md`

**Step 1: Update list/add/update/remove to operate on `<root>/tokens.json`**

Per design-doc Section 6.1:

Replace the existing CSS-variable-direct logic with W3C tokens.json operations. Each mutation regenerates theme.css via `writeTokensToCss`.

**Step 2: Add `sync` subcommand**

```markdown
## /design-tokens sync

Re-derive `<root>/tokens.json` from `<root>/DESIGN.md`. Use after hand-editing DESIGN.md.

1. Read `<root>/DESIGN.md`.
2. Run `parseDesignMd(md)` → new tokens.
3. Diff against current `<root>/tokens.json`; if differences exist, write the new tokens and regenerate theme.css.
4. Report which tokens changed.
```

**Step 3: Add `sync --reverse` subcommand**

```markdown
## /design-tokens sync --reverse

Produce a suggested DESIGN.md diff from current tokens.json — for review only, no auto-merge.

1. Read `<root>/tokens.json` and `<root>/DESIGN.md`.
2. For each token group that has a derivable DESIGN.md section (per design-doc Section 4.2 derivation rule), generate the section as it WOULD be if regenerated from current tokens.
3. Diff against actual DESIGN.md content for that section.
4. Output the diff to stdout (or write to `.design-rules/proposed-DESIGN.md.patch`).
5. User reviews and applies manually if desired.
```

**Step 4: Commit**

```bash
git add commands/design-tokens.md
git commit -m "feat(design-tokens): operate on W3C tokens.json + add sync subcommands"
```

---

### Task 5.8: `/design-review` and `/design-lint` — tokens.json enforcement

**Files:**
- Modify: `commands/design-review.md`
- Modify: `commands/design-lint.md`

**Step 1: `/design-lint` — flag hardcoded values not in tokens.json**

Update the lint logic:
1. Load `<root>/tokens.json`.
2. Build a set of all token values (colors, spacings, radii, shadows, etc.).
3. Grep target file(s) for hardcoded color/dimension/etc. values.
4. For each hit, check if the value matches a token (or, for colors, is reasonably close — within `oklch` distance threshold for visual similarity if the token uses `oklch`).
5. Flag any value that doesn't match a token, with a suggestion: "use `var(--color-brand)` instead of `#ff385c`".

**Step 2: `/design-review` — invoke the agent with DESIGN.md + tokens.json + craft context**

Update the agent invocation to assemble context:
1. Read `<root>/DESIGN.md` (full content) — narrative context.
2. Read `<root>/tokens.json` — canonical value set.
3. Read `data/craft/<topic>.md` for each topic in the active skill's `od.craft.requires` — universal craft principles.
4. Pass all three to the design-reviewer agent (`agents/design-reviewer.md`).

The agent now has authoritative tokens to reference, plus narrative "Do's and Don'ts" from DESIGN.md Section 7, plus universal craft principles. Reviews become enforceable.

**Step 3: Commit**

```bash
git add commands/design-review.md commands/design-lint.md
git commit -m "feat(review-lint): enforce against tokens.json + DESIGN.md + craft context"
```

---

### Task 5.9: Settings page rewire — react-shadcn pilot

**Files:**
- Modify: `adapters/react-shadcn/templates/__design-page.ts`
- Modify: `adapters/react-shadcn/templates/vite-plugin-design-engine.ts`
- Modify: `adapters/react-shadcn/manifest.json` (if needed)
- Test: `tests/__design-page.tokens.test.ts` (new, integration-style)

**Step 1: Identify the current write path**

Read existing `__design-page.ts` and `vite-plugin-design-engine.ts`. Locate where the API endpoint at `/__design/api/tokens` writes to theme.css via theme-io.

**Step 2: Update the API endpoint to operate on `<root>/tokens.json`**

The Vite plugin's `/__design/api/tokens`:
- GET: read `<root>/tokens.json`, return as JSON
- POST: validate W3C shape, write to `<root>/tokens.json`, then regenerate theme.css via `writeTokensToCss(tokens, { existing: read(themeFile) })`, write back to themeFile

**Step 3: Update the settings page UI to read/write the W3C shape**

`__design-page.ts` currently autosaves CSS variable mutations. Update to:
- Fetch tokens via GET `/__design/api/tokens`
- Autosave changes back via POST `/__design/api/tokens` with the full W3C tokens object (debounced)
- Render the form fields driven by tokens.json structure

**Step 4: Manual smoke test**

(Skipped in this implementation pass — actual smoke test happens post-merge per design-doc Section 8.)

**Step 5: Commit**

```bash
git add adapters/react-shadcn/templates/__design-page.ts adapters/react-shadcn/templates/vite-plugin-design-engine.ts
git commit -m "refactor(react-shadcn): settings page reads/writes tokens.json (canonical) + regenerates theme.css"
```

**Step 6: Cross-model review gate**

Run codex review on the rewired settings page before fanning out to other adapters. Codex should evaluate:
- Round-trip correctness (settings page edit → tokens.json → theme.css → page reload reflects edit)
- Managed-block discipline (user-added CSS preserved)
- W3C shape validation on POST
- Concurrency (debounced writes don't race)

Address feedback before Task 5.10.

---

### Task 5.10: Settings page rewire — astro

**Files:**
- Modify: `adapters/astro/templates/__design-page.ts`
- Modify: `adapters/astro/templates/astro-integration-design-engine.ts`

**Step 1: Apply same pattern as react-shadcn pilot**

Astro's integration uses `astro:server:setup` to register middleware. Update the `/__design/api/tokens` endpoint to operate on tokens.json (analog of Task 5.9 step 2).

**Step 2: Update settings page UI** (analog of Task 5.9 step 3, byte-identical to react-shadcn per current MANIFEST)

**Step 3: Commit**

```bash
git add adapters/astro/templates/
git commit -m "refactor(astro): settings page reads/writes tokens.json (parity with react-shadcn pilot)"
```

---

### Task 5.11: Settings page rewire — sveltekit

**Files:**
- Modify: `adapters/sveltekit/templates/api-tokens-server.ts`
- Modify: `adapters/sveltekit/templates/settings-page.svelte`

**Step 1: Update `/__design/api/tokens` `+server.ts` content**

Apply same pattern as Task 5.9 step 2.

**Step 2: Update Svelte 5 runes UI**

Update `settings-page.svelte` to fetch/post the W3C tokens shape. (Different from Tasks 5.9/5.10 because SvelteKit uses Svelte components, not vanilla TS.)

**Step 3: Commit**

```bash
git add adapters/sveltekit/templates/
git commit -m "refactor(sveltekit): settings page reads/writes tokens.json (parity)"
```

---

### Task 5.12: Settings page rewire — obsidian-css

**Files:**
- Modify: `adapters/obsidian-css/templates/settings-tab.ts`

**Step 1: Update Obsidian PluginSettingTab logic**

Obsidian doesn't have a dev server; the settings tab writes back via Obsidian's own plugin storage. Update the storage shape to W3C tokens.json. The plugin reads tokens.json, generates `styles.css` content via `writeTokensToCss`, writes to the Obsidian theme path.

**Step 2: Commit**

```bash
git add adapters/obsidian-css/templates/settings-tab.ts
git commit -m "refactor(obsidian-css): settings tab uses tokens.json storage shape"
```

---

### Task 5.13: `/design-init --migrate` end-to-end audit

**Files:**
- Modify: `commands/design-init.md` (the migrate subcommand section)

**Step 1: Re-read the existing migrate flow**

Locate the `--migrate` documentation and code paths in `commands/design-init.md`. Currently theme.css-centric.

**Step 2: Verify each migration step works with new contract**

- Old adapter cleanup: still uses `oldArtifacts - newArtifacts` set difference. Verify the new template files (DESIGN.md, tokens.json, register.md handling) are correctly accounted for.
- Skin/recipe/font preservation: in old format, fields were in `.design-rules/config.json`. In new format, DESIGN.md + tokens.json carry skin info; recipe and font references stay in config. Verify the flow: read old config → resolve new theme home in target adapter → carry over tokens.json by re-deriving from current DESIGN.md against new theme location → update `themeFile` in config.
- Old artifact deletion: ensure `<adapter>/theme/theme.css` of OLD adapter is removed (since it's been replaced by new adapter's theme file).

**Step 3: Update documentation accordingly**

If any flow step changes, document it.

**Step 4: Commit**

```bash
git add commands/design-init.md
git commit -m "audit(migrate): re-verify --migrate flow with tokens.json + DESIGN.md"
```

---

### Task 5.14: One-line updates to non-foundation commands

**Files:**
- Modify: `commands/design-page.md`
- Modify: `commands/design-pattern.md`
- Modify: `commands/design-component.md`
- Modify: `commands/design-copy.md`
- Modify: `commands/design-flow.md`
- Modify: `commands/design-feedback.md`
- Modify: `commands/design-audit.md`
- Modify: `commands/design-a11y.md`
- Modify: `commands/design-recipe.md`
- Modify: `commands/design-settings-page.md`

**Step 1: For each command, add a note**

Insert near the top of each command's body:

> **Active design system:** if `<project-root>/DESIGN.md` exists, read it for narrative context. The "Visual Theme & Atmosphere" and "Do's and Don'ts" sections are particularly relevant to generation tone.

**Step 2: Commit**

```bash
git add commands/design-{page,pattern,component,copy,flow,feedback,audit,a11y,recipe,settings-page}.md
git commit -m "docs(commands): note DESIGN.md as narrative context for generation/audit commands"
```

---

### Task 5.15: Delete old data files

**Files:**
- Delete: `data/skins/{toss,stripe,linear,vercel,notion}.json`
- Delete: `data/tokens/{colors,typography,spacing,radii,shadows,motion}.json`
- Delete: `data/tokens/.gitkeep`

**Step 1: Verify all readers consume new format**

Grep for any reference to the old paths:

```bash
grep -rn "data/skins/" --include="*.md" --include="*.ts" --include="*.json" .
grep -rn "data/tokens/colors\|data/tokens/typography\|data/tokens/spacing\|data/tokens/radii\|data/tokens/shadows\|data/tokens/motion" --include="*.md" --include="*.ts" --include="*.json" .
```

Expected: only references in old MANIFEST.md (will be regen'd in 5.16) and possibly old design docs. No live command/adapter references.

If any live references remain → fix those before deleting.

**Step 2: Remove the files**

```bash
git rm data/skins/{toss,stripe,linear,vercel,notion}.json
git rm data/tokens/{colors,typography,spacing,radii,shadows,motion}.json
git rm data/tokens/.gitkeep 2>/dev/null || true
rmdir data/skins data/tokens 2>/dev/null || true
```

**Step 3: Commit**

```bash
git commit -m "chore: remove old skin JSON + per-token JSON files (subsumed by data/design-systems and data/tokens.json)"
```

---

### Task 5.16: Final smoke + version bump + MANIFEST + PR

**Files:**
- Modify: `.claude-plugin/plugin.json` (version bump)
- Modify: `MANIFEST.md` (regenerate)
- Modify: `README.md` (note new contract files)

**Step 1: Run all tests**

```bash
cd tests && npm install --no-save && node --test
```
Expected: all pass.

**Step 2: Manual fixture smoke tests**

For each test fixture (airbnb, stripe, linear-app, kami DESIGN.md; shadcn-globals.css, tailwind-v4-theme.css, astro-theme.css, svelte-theme.css):

- `parseDesignMd(fixture)` produces non-empty tokens.json
- `parseThemeCss(fixture)` produces non-empty tokens.json
- `writeTokensToCss(parseDesignMd(fixture))` produces valid CSS

**Step 3: Verify upgrade path against a fixture-mocked old project**

Create a temp dir with old-format `.design-rules/config.json` (no `schemaVersion`, just `skin: stripe, adapter: react-shadcn`) and an existing `theme.css`. Mentally trace through `/design-init` → upgrade trigger → DESIGN.md/tokens.json/register.md stamped, schemaVersion=2, themeFile set.

**Step 4: Bump version in `.claude-plugin/plugin.json`**

Update version `0.2.0` → `0.3.0` (minor bump for foundation rework).

**Step 5: Regenerate `MANIFEST.md`**

Update Stack section, Structure section (new `data/craft/`, `data/design-systems/`, `tokens.json`; removed `data/skins/`, `data/tokens/`; renamed skill), and Key Relationships section (new derivation pipeline DESIGN.md → tokens.json → theme.css; new `od.craft.requires` consumption contract; backward-compat upgrade path).

**Step 6: Update `README.md`**

Add a brief section under "What's in your project after `/design-init`":
- `DESIGN.md` — narrative tokens (9-section, OD-compatible format)
- `tokens.json` — W3C Design Tokens (canonical precise values)
- `register.md` — taste capture (5-section template, populated later by canvas-side extraction)
- existing-themed repos: derive mode preserves your existing theme file

**Step 7: Commit**

```bash
git add .claude-plugin/plugin.json MANIFEST.md README.md
git commit -m "chore: bump to 0.3.0, regenerate MANIFEST, update README for new contract"
```

**Step 8: Open PR**

```bash
git checkout -b foundation-od-schema
git push -u origin foundation-od-schema
gh pr create --title "Foundation: OD-aligned schema + craft layer (#16, #17)" --body "$(cat <<'EOF'
## Summary
- Adopts nexu-io/open-design's data model for format compatibility
- Layers our universal craft principles into OD's 8 craft topics
- Adds `tokens.json` (W3C Design Tokens) and `register.md` (taste capture) as plugin-only contract additions
- Rewires commands and 4 adapter settings pages to read/write the new contract

Implements RFC #23 issues #16 and #17.

Design doc: `docs/plans/2026-05-06-foundation-od-schema-design.md`
Plan: `docs/plans/2026-05-06-foundation-od-schema-plan.md`
Triage: `docs/triage-69-rules.md`

## Test plan
- [ ] All `cd tests && node --test` tests pass
- [ ] Manual smoke against bundled fixtures in `tests/fixtures/`
- [ ] Manual upgrade-path smoke against fixture-mocked old project
- [ ] Plugin reinstall + smoke test in `dc-v1-onboarding` (post-merge, per design-doc Section 8)
EOF
)"
```

---

## Out-of-band post-merge validation (out of plan scope)

Per design-doc Section 8. The user runs `/design-init` inside `dc-v1-onboarding` as a real user after the PR merges. Validation checklist there:

1. Derive mode auto-detected (shadcn `components.json` + Tailwind v4 `@theme` in `globals.css`).
2. tokens.json populated from existing variables.
3. DESIGN.md skeleton has Sections 2 and 3 (and 5/6 if applicable) filled; Sections 1/4/7/8/9 are TODO stubs.
4. register.md is empty 5-section template.
5. Existing `globals.css` unchanged on first init.
6. Settings-page round-trip: edit → tokens.json updated → globals.css regenerated → page reflects edit.
