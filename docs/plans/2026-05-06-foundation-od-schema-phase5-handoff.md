# Phase 5 Handoff — Foundation OD-Schema

**For the fresh session resuming this work.**

## Where we are

- **Branch:** `foundation-od-schema` (off `main`)
- **Last commit:** `1511b9f` (Toss DESIGN.md)
- **Phases 1-4 complete** (29 commits since branching). Phase 5 not started.

## What's done

### Phase 1 — Schema spec
- `docs/spec.md` (249 lines) — author/parser-facing spec for DESIGN.md, tokens.json, register.md formats. Includes derivation rules, craft consumption contract (`od.craft.requires`), and OD-compatibility notes.
- `docs/triage-69-rules.md` skeleton.

### Phase 2 — Triage
- `data/craft/<topic>.md` — 8 OD craft baseline files pulled verbatim from upstream.
- `docs/triage-69-rules.md` — classifications signed off by user. 39 UNIV/UNIV-EXTRA, 40 UI-DASH (incl. hybrids), 0 pure TOK (most TOK are HYBRID).

### Phase 3 — Apply triage
- 8 craft files have design-engine additions block prepended. Structure: H1 → attribution blockquote → `## design-engine principles` → `## OD baseline (verbatim from upstream)` → unchanged OD content.
- `skills/design-engine/SKILL.md` gained an 11-rule UNIV-EXTRA section (line 548-735). File grew 590 → 778 lines.
- `data/tokens.json` — 97 W3C tokens across 7 groups (color, font, typography, spacing, radius, shadow, motion). Default template (gets stamped into user projects in Phase 5.5).
- `skills/design-language/SKILL.md` deleted; `skills/mobile-dashboard/SKILL.md` created (1196 lines, UI-DASH content only). Frontmatter description deliberately broad to trigger on data-dense mobile websites generally.
- All 3 skills declare `od.craft.requires` frontmatter (per spec.md Section 6).

### Phase 4 — Restructure design systems
- `data/design-systems/{stripe,vercel,linear-app,notion,toss,kami}/DESIGN.md` — 6 bundled design systems in OD-compatible 9-section format. Stripe/Vercel from awesome-design-md upstream (prose 9-section). Linear-app/Notion from awesome-design-md upstream (awesome-design-skills format with prepended canonical H1+Category). Toss hand-authored (not in upstream catalog). Kami pulled verbatim from OD upstream.
- `data/awesome-design-md-index.json` — 70 brands with OD-normalized slugs (`linear-app`, `mistral-ai`, `opencode-ai`, `together-ai`, `x-ai`); `slugAliases` map preserves upstream URL slugs for fetch.
- **Note:** `data/skins/toss.json` has the wrong brand color (`#721FE5` purple — should be `#3182F6` Toss Blue). The new Toss DESIGN.md uses the correct Toss Blue. Discrepancy is transient — `data/skins/*.json` get deleted in Phase 5.15. No action needed unless a Phase 5 task accidentally reads from the old skin file.

## What's pending — Phase 5

**18 sub-tasks across 6 sub-phases.** Detailed in `docs/plans/2026-05-06-foundation-od-schema-plan.md` Phase 5.

### Phase 5 quick map

| Sub-phase | Tasks | Notes |
|---|---|---|
| Parsers + theme-io | 5.1 (theme-io tokens API), 5.2 (DESIGN.md→tokens parser), 5.2b (tokens→DESIGN.md emitter), 5.3 (theme.css→tokens reverse) | Codex review gates after 5.2 and 5.3. ~6-8 hrs. |
| Upgrade path | 5.4 (helpers), 5.5 (`/design-init` rewrite), 5.5b (integration test + orchestrator) | Codex review gate after 5.5b. ~3-4 hrs. |
| Other commands | 5.6 (`/design-skin`), 5.7 (`/design-tokens`), 5.8 (`/design-review`+`/design-lint`) | ~2-3 hrs. |
| Settings page rewire ×4 | 5.9 (react-shadcn pilot), 5.10 (astro), 5.11 (sveltekit), 5.12 (obsidian-css) | Codex review gate after 5.9. ~3-4 hrs. |
| Cleanup + ship | 5.13 (migrate audit), 5.14 (one-line updates), 5.15 (delete old files), 5.16 (MANIFEST + PR) | ~1-2 hrs. |

**Total: ~14-21 hrs of focused work.** Realistic session-elapsed with reviews/fixes: 20-30 hrs.

## How to bootstrap a fresh session

Suggested first prompt (paste into the new Claude Code session at the design-engine repo root):

```
Resume foundation work on branch `foundation-od-schema`. Phases 1-4 are complete; Phase 5 has not started.

Read these to bootstrap context:
1. `docs/plans/2026-05-06-foundation-od-schema-design.md` (architectural design — already codex-reviewed, addresses ~6 review findings)
2. `docs/plans/2026-05-06-foundation-od-schema-plan.md` (implementation plan, focus on Phase 5 — already codex-reviewed, addresses ~7 review findings)
3. `docs/plans/2026-05-06-foundation-od-schema-phase5-handoff.md` (this file — handoff notes, what's done, what's pending)
4. `git log --oneline foundation-od-schema --not main` (29 commits to date)

Then invoke `superpowers:subagent-driven-development` and dispatch the implementer for Task 5.1 (theme-io.ts tokens.json reader/writer + tests). User gates noted in the plan:

- USER GATE before continuing past Task 5.5b (codex-reviewed; user reviews if desired)

Codex review gates (auto-trigger via `/cross-model-review-now impl` or by direct codex MCP call):
- after Task 5.2 (DESIGN.md parser)
- after Task 5.3 (theme.css → tokens.json reverse derivation)
- after Task 5.5b (upgrade-path integration test)
- after Task 5.9 (first adapter rewire)

Match the existing SDD execution pattern: implementer subagent → spec compliance review → code quality review (skip code quality review on mechanical/scaffolding tasks where it'd be a no-op, do full dispatch on real code/content tasks).
```

## Subtleties the new session should know

1. **PowerShell vs Bash:** repo on Windows, user shell is PowerShell, but the Bash tool is preferred for plan command examples (`gh`, `curl`, `grep`, `for` loops). The plan's "Execution conventions" section (top of plan doc) covers this.

2. **Test runner:** `cd tests && npm test` (NOT bare `node --test foo.test.ts` — the `npm test` script invokes `node --test --experimental-strip-types ./*.test.ts` per `tests/package.json`).

3. **Real CSS variable convention** for theme files is FLAT (`--brand`, `--background`, `--radius-lg`) — NOT prefixed (`--color-brand`). Phase 5.1 spec is explicit about this; existing `tests/fixtures/theme-*.css` files are the ground truth.

4. **Implementer subagent state isolation:** every fresh implementer subagent reads context from the plan + design doc + git log. Don't try to carry conversational state across subagent dispatches; each one gets a self-contained prompt with full task text + required context. Plan task descriptions are written to be self-contained.

5. **Reviewer subagent caveat:** code quality reviewer uses subagent type `superpowers:code-reviewer`. Spec compliance reviewer uses `general-purpose` with the spec-reviewer prompt template at `~/.claude/plugins/cache/superpowers-marketplace/superpowers/4.3.1/skills/subagent-driven-development/spec-reviewer-prompt.md`.

6. **OD slug fidelity:** `linear-app` not `linear`, `x-ai` not `x.ai`. The `data/awesome-design-md-index.json` has `slugAliases` for upstream URL formation (Phase 5.6 `/design-skin` Source 4 handles the translation).

7. **Old data/ files still exist:** `data/skins/<name>.json` (5 files), `data/tokens/{6 files}.json`. Phase 5.15 deletes these AFTER all readers are rewired. If anything in Phase 5.1–5.14 needs to read them as transitional sources, that's expected.

8. **Commits accumulate on the branch.** No PR is opened until Phase 5.16. The branch has 29 commits already; expect ~30-45 more by PR time.

## Risk surface for Phase 5

The codex reviews on the plan flagged these as the highest-risk tasks; gate placement is calibrated for them:

- **Task 5.2 (DESIGN.md parser)** — if wrong, all derivation downstream is wrong. Gate before commands consume it.
- **Task 5.3 (theme.css reverse derivation)** — many failure modes (oklch math, hsl expressions, @theme variants, calc()). Gate before `/design-init` consumes it.
- **Task 5.5b (upgrade-path integration test)** — high-blast-radius for user projects in derive mode; integration-tested end-to-end.
- **Task 5.9 (first adapter rewire)** — pattern-establishing; codex review before fanning out to adapters 2-4.

The plan also has user-facing decision points where worth pausing:
- Task 5.5b is the natural mid-Phase-5 breakpoint if a second-stage handoff is desired.
