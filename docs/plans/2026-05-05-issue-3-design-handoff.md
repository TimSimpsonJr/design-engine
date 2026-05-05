# Handoff — Design `/design-recipe extract <url>` agent (issue #3)

**For:** A future Claude session focused on designing this agent.
**Status:** Issue is OPEN; no design work has happened yet.
**Why a separate session:** This task is design-taste-heavy. It does not lend itself to cross-model autonomous design (codex doesn't have the visual/UX taste needed to decide what counts as a "section"). It needs interactive brainstorming with Tim.

## Issue summary

[Issue #3](https://github.com/TimSimpsonJr/design-engine/issues/3): add a `/design-recipe extract <url>` agent that:

1. Fetches a public web page
2. Parses HTML/CSS (or rendered visuals) to identify section types
3. Builds a recipe JSON in the same shape as the bundled 5
4. Optionally extracts reusable components
5. Saves to `.design-rules/recipes/<name>.json`

> **Aside:** The GitHub issue title was corrupted by Git Bash path expansion when it was created — it shows `C:/Program Files/Git/design-recipe extract <url> agent`. The actual command name is `/design-recipe extract <url>`. Update the issue title before publishing the design doc.

## Why this is harder than it sounds

Most of the open questions are taste calls, not structural ones:

- **What counts as a section?** Modern sites use generic divs; visual hierarchy is unreliable from HTML alone. The bundled recipes (see `data/recipes/*.json`) describe sections like `hero-card`, `kpi-grid`, `chart-card`, `progress-section`, `list-section` — these are coherent UI patterns, not raw DOM nodes.
- **What should the agent do when a real site doesn't fit the vocabulary?** Force-fit to existing section types, or invent new ones?
- **Is HTML scraping enough?** Stripe's pricing page renders most of its layout from JavaScript. Notion's marketing site uses obfuscated class names. A vision-based approach (screenshot → analyze) might be necessary, but it's expensive and slower.
- **Component-level extraction is its own rabbit hole.** Tim's previous instinct (per the issue body): research what counts as a component vs a section before deciding.
- **Copyright/licensing.** Extracting layout patterns from a copyrighted site is a fair-use grey area. Agent must surface this clearly to the user.

These are why codex-style autonomous design fails here. You need Tim in the loop.

## Existing context the next session needs

### The recipe schema

Bundled recipes live at `data/recipes/{saas,ecommerce,fintech,social,productivity}.json`. Each is shaped:

```json
{
  "name": "saas",
  "version": 1,
  "sections": [
    { "type": "hero-card", "props": { "metric": "primary-revenue", "trend": true } },
    { "type": "kpi-grid", "props": { "columns": 4, "items": ["mrr", "active-users", "churn", "conversion"] } },
    ...
  ]
}
```

The vocabulary of `type` values is implicit — there's no enum file. The 5 recipes use roughly this set:
`hero-card`, `kpi-grid`, `chart-card`, `briefing-carousel`, `progress-section`, `list-section`, `feature-grid`, `pricing-table`, `cta-banner`, etc. (read the 5 JSON files for the full set).

### How recipes feed the rest of the system

`/design-page` reads the active recipe from `.design-rules/config.json` plus the active adapter's `templates/page.*` to scaffold a new page. Each section `type` maps to a pattern in the adapter's `components/patterns/` directory (for adapters that ship patterns — currently only `react-shadcn`).

So the recipe is a **bridge between layout vocabulary and component instantiation**. If `extract` produces a recipe with section types that don't have matching patterns in the active adapter, `/design-page` will need to either skip them, ask the user to fill in, or generate placeholder code.

### Skill rules that should inform extraction quality

- `skills/design-language/SKILL.md` — 69 numbered visual rules for mobile dashboards, KPIs, fintech, charts. The vocabulary in here may be the right starting point for the section-type enum.
- `skills/composition-recipes/SKILL.md` — describes the 5 page-shape archetypes. This is the meta-pattern of "what a recipe is for."
- `skills/design-engine/SKILL.md` — token system, color hierarchy, prohibitions. Less directly relevant, but useful for asset extraction questions.

### Prior agent patterns in this repo

`agents/design-reviewer.md`, `agents/accessibility-reviewer.md`, `agents/ux-auditor.md` are all read-only review agents. They don't write files. The `/design-recipe extract` agent would be the first one to **write** durable artifacts (`.design-rules/recipes/<name>.json`). Worth thinking about whether it should:

- Write directly (with the user's confirmation pre-write).
- Output to stdout/chat and let the user save manually.
- Both: default to chat, with `--save` to commit.

The pattern in `/design-skin` (which does write) is interactive: 4-source lookup, confirmation before write. Similar UX would fit here.

## Suggested initial design questions

The next session should brainstorm these with Tim before any structural design:

1. **Input fidelity.** URL only, or URL + screenshot, or URL + rendered DOM dump?
2. **Detection method.** HTML parsing (cheap, often wrong), vision-based (expensive, taste-aligned), or hybrid?
3. **Vocabulary openness.** Force-fit to existing section types, or allow new ones to be invented?
4. **Output destination.** Always `.design-rules/recipes/<name>.json`, or also chat-only mode?
5. **Component extraction scope.** Defer entirely (out of v1)? Or include?
6. **Asset extraction.** Icons, illustrations, fonts — in or out of v1?
7. **Copyright surfacing.** What does the agent print before/after fetching?
8. **Failure mode.** When the page is JavaScript-heavy and HTML scraping fails, what's the fallback?
9. **Chrome extension or MCP browser tool integration.** The `mcp__Claude_in_Chrome__*` tools are available in Tim's environment. Could the agent drive a real browser? That changes a lot.

## Useful prior art / references

- **Stripe Press, Linear's Method site, Notion's marketing pages** — three well-known examples Tim has cited in past brainstorms as "extract this." Good test corpus once a v0 exists.
- **VoltAgent/awesome-design-md** — the same registry that powers `/design-skin`'s 4-source lookup. Already structured around a per-brand `DESIGN.md` file. May be the right *output* format for extracted recipes (or convertible to recipe JSON).
- **Existing `theme-io.ts` parser/writer** — comment-safe, span-based. Useful pattern reference for any "read existing artifact, modify, write back" work, though probably not directly applicable to recipe JSON.

## Process suggestion for the next session

1. Read this handoff first.
2. Run `brainstorming` skill with the questions above.
3. Don't bring codex into design until the vocabulary, detection method, and vocabulary openness are locked. Codex won't have useful opinions until then.
4. After design is locked, codex *can* meaningfully review the implementation (the agent file structure, fetch logic, output writing — those are structural).

## Files in this repo worth reading before designing

- All 5 files under `data/recipes/`
- `skills/composition-recipes/SKILL.md`
- `skills/design-language/SKILL.md` (skim — section type vocabulary)
- `commands/design-page.md` (how recipes are consumed)
- `commands/design-skin.md` (the 4-source lookup pattern, if you want to mirror it for recipes)
- `agents/design-reviewer.md` (how an agent file is structured)
- `MANIFEST.md` (overall map)
