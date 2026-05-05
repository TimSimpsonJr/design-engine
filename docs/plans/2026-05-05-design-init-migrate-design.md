# /design-init --migrate — Adapter Migration Design

**Status:** Approved (cross-model-review with codex, 2026-05-05)
**Closes:** [#2](https://github.com/TimSimpsonJr/design-engine/issues/2)

## Problem

A user starts a project on adapter X (e.g., `astro`), later decides to migrate to adapter Y (e.g., `sveltekit`). Today the workaround is to re-run `/design-init` with `--reset`, manually clean old files, and re-edit `.design-rules/config.json`. Need a first-class migration path.

## Scope

### In scope (v1)

Web adapters: `tailwind-v4`, `react-shadcn`, `astro`, `sveltekit`, `plain-css`.

### Out of scope (v1)

- **Migration to/from `obsidian-css`.** Obsidian uses `styles.css` (not `theme.css`), the settings tab can be merged into the user's `main.ts`, and the artifact set is too fragile for safe auto-cleanup. Emit clear error if attempted: `Obsidian migration not supported in v1. Run /design-init --reset instead.`
- **Settings-page regeneration.** `/design-init --migrate` does not generate any settings-page artifacts. After migration, user runs `/design-settings-page` to regenerate UI for the new adapter.
- **Build-config rollback (auto-revert).** When old adapter was direct-mode, the migration prints exact lines to remove from `vite.config.ts` / `astro.config.mjs` but never auto-edits user-owned config files. Auto-add on the new side is `/design-settings-page`'s job and remains there.

## Routing

Add `--migrate` flag to `/design-init`. Parse alongside existing `--with-settings` and `--reset`. New Step 0 branch:

- If `--migrate` is set AND marker exists → migration flow (M1–M7).
- If `--migrate` is set AND marker absent → error: `Nothing to migrate — run /design-init first.`
- If `--migrate` and current adapter is `obsidian-css` → error (see scope).

`--migrate` is mutually exclusive with `--reset`. If both passed, error.

## Migration Flow

### M1 — Echo + select target

Read existing `.design-rules/config.json`. Echo to user. Re-run adapter signal-detection (existing Step 1 logic). Show full list of 5 supported adapters; mark detected match as `(detected)`. Detection suggests, never auto-selects.

Reject same-as-current with `Already on <adapter> — nothing to migrate.`

Reject `obsidian-css` selection (same v1-scope error).

### M2 — Preflight plan

Compute the migration plan in memory. Display as a checklist for user confirmation. The plan includes:

1. **Theme file destination:** `<oldTargetPath>` → `<newTargetPath>` (or `same path — overwrite in place`).
2. **Settings-page artifacts to clean up:** Probe disk for files in `artifactSetFor(oldAdapter)`. List existing files for cleanup.
3. **Old build-config patches detected:** Print which lines to manually remove from `vite.config.ts` / `astro.config.mjs` (no auto-edit).
4. **Token preservation:** Try `parseTokens(<oldTargetPath>/theme.css)`. If the file is unparseable, abort with `theme.css unparseable — fix manually or run /design-init --reset`. Otherwise proceed.
5. **`settingsPage` reset:** If old config had `settingsPage: true`, note that the field will be reset to `false` and user should re-run `/design-settings-page` after migration.
6. **`.cursorrules` action:** If new adapter has `cursorRules: false` and `.cursorrules` exists with a `# Design Engine Conventions` section, plan to remove the section (file kept).
7. **Files flagged for manual cleanup** (see M5):
   - Old theme files at old `targetPath` if `targetPath` differs from new `targetPath`.
   - Any deterministic file that fails byte-compare in M5 (user-modified).

Ask: `Proceed with migration? [y/N]`

### M3 — Capture user-customized tokens

Run `parseTokens(oldTheme)` (already aborted in M2 on parse failure). Hold both `:root` and `.dark` token maps in memory.

Skip entirely if `mode == retrofit-byo` — user manages their own theme; no parse, no overlay.

### M4 — Write new adapter's theme files

Reuse existing `/design-init` logic:

- Step 7a: resolve adapter chain via `extends`.
- Step 7b: copy theme files from chain into new `theme.targetPath`.
- Step 7c: apply active skin to `:root` and `.dark` blocks.
- Step 7d: apply active font to `fonts.css` + `--font-primary`.

Then overlay preserved tokens via `writeTokens()` (in-place edit on the just-written new theme.css). User customizations override skin defaults.

Skip M4 entirely if `mode == retrofit-byo`.

### M5 — Cleanup old artifacts

Compute `toDelete = artifactSetFor(oldAdapter) ∩ existing-on-disk - artifactSetFor(newAdapter)`.

For each candidate:

| Category | Behavior |
|---|---|
| Deterministic file (pure copy) — passes byte-compare against canonical | Auto-delete |
| Deterministic file — fails byte-compare (user-modified) | Skip; add to manual-cleanup list |
| Non-deterministic file (compiled or substituted) | Auto-delete unconditionally |
| Old theme files at old `targetPath` (when `targetPath` differs) | **Never auto-delete** — always manual-cleanup list |
| Old build-config patches | Never edit user config; print removal instructions in M7 |

**Why old theme files are never auto-deleted:** `writeTokens()` only preserves unmanaged user-added CSS *in place*; it does not transfer that content to a freshly generated file at a new `targetPath`. Auto-deleting old `theme.css` would silently drop any user-added unmanaged variables or comments.

If M5 deletes succeed in part and fail in part (e.g., file permission), halt-and-report — no rollback. List orphaned files in M7.

### M6 — Update marker, conventions, .cursorrules

Update `.design-rules/config.json`:
- `adapter`: new
- `skin`, `recipe`, `font`, `mode`: preserved
- `settingsPage`: `false` (always reset; user re-runs `/design-settings-page` if desired)
- `migratedAt`: current ISO 8601 timestamp
- `migratedFrom`: old adapter name
- `lastInitVersion`: bumped to current
- `createdAt`: preserved (when project was first init'd, not when migrated)

Replace `## Design Engine Conventions` block in `CLAUDE.md` (existing logic from Step 7g).

`.cursorrules`:
- If new adapter has `cursorRules: true`: refresh the `# Design Engine Conventions` section.
- If new adapter has `cursorRules: false` and the section exists: remove it. If the file becomes empty, leave it (don't delete user-owned files).

### M7 — Summary

Print:

```
Migrated design-engine: <oldAdapter> → <newAdapter>
  Skin:    <preserved>
  Recipe:  <preserved>
  Font:    <preserved>

Files written:
- <newTargetPath>/theme.css
- <newTargetPath>/{base,fonts,index}.css
- .design-rules/config.json (updated)
- CLAUDE.md (conventions block updated)
- .cursorrules (refreshed | section removed | unchanged)

Files cleaned up:
- <list of auto-deleted files>

⚠ Manual cleanup required:
- <oldTargetPath>/theme.css   ← may contain user-added CSS; review before deleting
- <oldTargetPath>/{base,fonts,index}.css
- <user-modified files that failed byte-compare>
- vite.config.ts / astro.config.mjs:
    Remove these lines:
      import designEngine from './src/design-engine/<old-plugin>';
      designEngine()  // inside plugins array

Next steps:
- Run `npm install` if you changed frameworks (e.g., installed @sveltejs/kit).
- Run `/design-settings-page` to regenerate the settings UI for the new adapter.
```

## Artifact Ownership Rules

### `artifactSetFor(adapter)` — settings-page artifacts (for migration cleanup)

**Hardcoded lookup table** in `/design-init.md`. v1 values (synced to `main` as of 2026-05-05, post-#7 and post-#9):

| Adapter | writeCapable | Settings-page artifacts (paths relative to project root) | Determinism |
|---|---|---|---|
| `react-shadcn` | direct | `src/design-engine/theme-io.ts` | deterministic |
| | | `src/design-engine/vite-plugin-design-engine.ts` | deterministic |
| | | `src/design-engine/__design-page.html` | deterministic |
| | | `src/design-engine/__design-page.js` | non-deterministic (esbuild output) |
| `astro` | direct | `src/design-engine/theme-io.ts` | deterministic |
| | | `src/design-engine/astro-integration-design-engine.ts` | deterministic |
| | | `src/design-engine/__design-page.html` | deterministic |
| | | `src/design-engine/__design-page.js` | non-deterministic (esbuild output) |
| `sveltekit` | direct | `src/lib/server/design-engine/theme-io.ts` | deterministic |
| | | `src/routes/__design/api/tokens/+server.ts` | deterministic |
| | | `src/routes/__design/+page.svelte` | deterministic |
| `plain-css` | snippet | `design-settings.html` (root) | non-deterministic (substituted) |
| `tailwind-v4` | none | (none) | — |

**Maintenance note** in command markdown: this table must be updated whenever an adapter's `writeCapable` changes or settings-page generation paths change in `/design-settings-page.md`. Future improvement: declarative `artifacts: []` field in adapter `manifest.json`.

### Theme-file ownership

Theme files at `theme.targetPath` (`theme.css`, `base.css`, `fonts.css`, `index.css`) are derived from the adapter chain via `extends`. Source-side enumeration: union of filenames contributed by the resolved chain, placed at the leaf adapter's `theme.targetPath`.

Theme files are never auto-deleted (see M5 rationale).

### Replace-not-delete

- `## Design Engine Conventions` block in `CLAUDE.md`.
- `# Design Engine Conventions` block in `.cursorrules` (or section removal — never file delete).

## Token Preservation Strategy

`parseTokens(oldTheme)` extracts the **managed token set + font reference**. After M4 writes a fresh new theme.css from skin defaults, `writeTokens()` overlays the captured tokens.

What's preserved:
- Managed tokens (skin colors, font, motion, etc.) the user customized via `/design-tokens` or direct edits.
- The `--font-primary` value.

What's NOT preserved:
- User-added CSS variables outside the managed set.
- Comments or unmanaged declarations the user added to old theme.css.
- Any of the above in old theme files when old `targetPath` differs from new `targetPath` — that's why old theme files always land in manual-cleanup.

## Schema Changes

`.design-rules/config.json` gains two optional fields, present only after migration:

```json
{
  "migratedAt": "<ISO 8601 timestamp>",
  "migratedFrom": "<old adapter name>"
}
```

Document in `/design-init.md` Step 7e and update `MANIFEST.md` Key Relationships.

## Failure Mode

Halt-and-report. No rollback. Matches existing `/design-init` Step 7 pattern.

If any step fails:
1. Stop further writes/deletes.
2. Print exactly what was done so far.
3. Print exactly what was not done.
4. Suggest cleanup steps.

## Open Questions Resolved with Codex

| Question | Resolution |
|---|---|
| File ownership boundary | Manifest/command-derived, not hardcoded. Lookup table in `/design-init.md`. |
| User-edited plugin file | Byte-compare deterministic files; exclude mismatches from auto-delete. Trust contract for non-deterministic files. |
| Token preservation | Overlay all managed tokens, no diff against old skin defaults. |
| Direct ↔ snippet transition prompt | Single bulk confirmation; surface mode change in M2 plan. |
| Build-config rollback | v1 never auto-reverts; print instructions only. |
| Future-proofing different `targetPath` | Always read from manifest; same-targetPath case overwrites without delete. |
| Retrofit-byo migration | Skip theme read/write/delete entirely; only marker + conventions + cleanup of plugin-generated settings artifacts (if they exist). |
| Detection in M1 | Re-run signal detection; mark detected match as `(detected)`; never auto-select. |
| Old/new path overlap | Set difference: `oldArtifacts - newArtifacts` so shared files (e.g., `theme-io.ts` between react-shadcn and astro) are never deleted. |
| Settings-page generation | Decoupled — `--migrate` doesn't touch settings UI; user runs `/design-settings-page` separately. |
| `__design-page.js` byte-compare | Skip; treat as generated-only. |
| M2.5 byte-compare scope | Limit to deterministic files only. Non-deterministic (compiled/substituted) auto-delete without compare. |

## Out of Scope / Follow-ups

- **Obsidian-css migration.** Settings tab merging into user's main.ts is fragile; would need a manual-confirmation flow per file.
- **Declarative `artifacts: []` field in adapter manifests.** Replaces hardcoded lookup table. Better long-term, but the current table is small and pinned to known set.
- **Ownership ledger** (`.design-rules/ownership.json` with file fingerprints). Replaces byte-compare with content-addressed identity. Useful when settings-page artifacts grow.
- **Build-config auto-revert.** Add only after introducing sentinel comments around plugin imports/calls so removal is unambiguous.
- **Google Fonts catalog autocomplete** (deferred under #4 follow-ups, not this issue).

## Cross-Model Review Log

Design iterated 4 rounds with codex (`gpt-5.2-codex` via MCP, fallback to default model after API rejection). Findings caught and resolved before approval:

- **Round 1:** Cleanup overlap (would delete newly-written shared files); obsidian-css doesn't fit theme.css model; settings-page ownership beyond `src/design-engine/*`; auto-revert risk.
- **Round 2:** Settings-page intent vs artifact state coupling; SvelteKit artifact set; M2.5 scope on non-deterministic outputs.
- **Round 3:** Old theme-file auto-delete data-loss risk via `writeTokens` not transferring to new `targetPath`.
- **Round 4:** Approved.

Codex did not decide UI/UX taste questions (prompt copy, summary wording, exact confirmation phrasing) — those are flagged for Tim during implementation review.
