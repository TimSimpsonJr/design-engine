---
name: design-skin
description: Swap the active design system (DESIGN.md + derived tokens + theme.css) in the current project, OR save current DESIGN.md as a named design system globally, OR list available design systems. Resolves via 4-source lookup — project cache, user global ~/.design-rules/design-systems/, plugin bundled, awesome-design-md fetch. Lazy-migrates old JSON skins to DESIGN.md on first access.
argument-hint: <skin-name> | save <name> | list
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---

# /design-skin — Design System Swap & Management

You manage design systems for the current project. Design systems are DESIGN.md files following the OD 9-section format. This command resolves a named design system, derives W3C tokens from it, and writes the resulting CSS variables into the project's theme.css. Parse `$ARGUMENTS` to determine which mode.

## Argument parsing

Trim `$ARGUMENTS` and inspect the first token:
- Empty or just whitespace → error: "Usage: /design-skin <skin-name> | save <name> | list"
- First token is `save` → **Case 2** (save)
- First token is `list` → **Case 3** (list)
- Anything else → **Case 1** (apply skin), with the whole argument as the skin name

---

## Case 1: Apply a design system (bare name)

Example invocations: `/design-skin stripe`, `/design-skin airbnb`, `/design-skin toss`.

### 1a. Verify project initialized

Read `.design-rules/config.json` at the project root. If it doesn't exist, error:

```
No design system initialized in this project — run `/design-init` first.
```

Stop. Do not proceed.

If it exists, parse it. You'll need `adapter` and the current `skin` value (for the confirmation message at the end). Also note the `themeFile` field if present (the path to the project's theme.css, relative to the project root).

### 1b. Normalize the name

Slugify the skin name for filesystem lookup: replace dots with hyphens (e.g., `linear.app` becomes `linear-app`), lowercase, strip characters outside `[a-z0-9-]`. Use the slugified form as `<slug>` for all path lookups below. Keep the original user-provided name for display messages.

### 1c. Lazy-migrate old global skins

Before the 4-source lookup, check whether a legacy JSON skin exists at `~/.design-rules/skins/<slug>.json` **and** no DESIGN.md exists yet at `~/.design-rules/design-systems/<slug>/DESIGN.md`.

If both conditions are true, migrate the old skin:

1. Read `~/.design-rules/skins/<slug>.json` and parse it as JSON.
2. Convert the old skin JSON to a W3C tokens object:
   - Map `colors.light` entries to `{ color: { $type: 'color', <key>: { $value: '<hex>' }, ... } }`.
   - Map `fonts.primary` to `{ font: { $type: 'fontFamily', primary: { $value: '<name>' } } }`.
   - If `colors.dark` is non-empty, note it but it will be lost (DESIGN.md is light-only by default; warn the user).
3. Run `emitDesignMdSkeleton(tokens, { name: '<slug>' })` (from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/design-md-emit.ts`) to produce a 9-section DESIGN.md skeleton with Sections 2 and 3 filled from the JSON data and remaining sections TODO-stubbed.
4. Create directory `~/.design-rules/design-systems/<slug>/` if it doesn't exist.
5. Write the skeleton to `~/.design-rules/design-systems/<slug>/DESIGN.md`.
6. Delete the old `~/.design-rules/skins/<slug>.json`.
7. Print a one-line notice: `Migrated legacy skin ~/.design-rules/skins/<slug>.json → ~/.design-rules/design-systems/<slug>/DESIGN.md`

If the old JSON has a non-empty `colors.dark` object, add a warning: `Note: dark-mode overrides from the old skin were not migrated. Edit the DESIGN.md to add dark-mode guidance.`

Proceed to the 4-source lookup (which will now find the migrated DESIGN.md via Source 2).

### 1d. 4-source design system lookup

Look for a DESIGN.md in this order. Stop at the first hit and remember which source resolved it.

1. **Source 1 — Project cache:** `.design-rules/design-systems/<slug>/DESIGN.md`
2. **Source 2 — User global:** `~/.design-rules/design-systems/<slug>/DESIGN.md` (resolve `~` to the user's home directory)
3. **Source 3 — Plugin bundled:** `${CLAUDE_PLUGIN_ROOT}/data/design-systems/<slug>/DESIGN.md`
4. **Source 4 — awesome-design-md fetch:** Fetch `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/<slug>/DESIGN.md` using WebFetch. If the fetch returns 404 or HTML (rather than markdown), treat as miss.

If Source 4 succeeds:
1. Create directory `.design-rules/design-systems/<slug>/` if it doesn't exist.
2. Write the fetched DESIGN.md content **verbatim** to `.design-rules/design-systems/<slug>/DESIGN.md` (project cache). Do not parse or transform it before caching.
3. The cached file is now the resolved DESIGN.md. Future invocations will hit Source 1.

### 1e. If no source resolves

Don't apply anything. Print a "skin not found" report:

1. List design systems available locally (project + user global + bundled), each on its own line, grouped by source. Use Glob to enumerate `**/DESIGN.md` under `.design-rules/design-systems/`, `~/.design-rules/design-systems/`, and `${CLAUDE_PLUGIN_ROOT}/data/design-systems/`. Extract the slug from the parent directory name.
2. Also check for legacy JSON skins: `.design-rules/skins/*.json`, `~/.design-rules/skins/*.json`. If any exist, list them with a note: `(legacy JSON — will be auto-migrated on first use)`.
3. If `${CLAUDE_PLUGIN_ROOT}/data/awesome-design-md-index.json` exists, add a line: "Plus N brands available from awesome-design-md (e.g., airbnb, claude, figma, ...) — run `/design-skin list` for the full catalog."
4. Run a fuzzy-match check: if any locally-available name has a small edit distance from the requested name (e.g., `airbnnb` vs `airbnb`, or substring match), suggest it: "Did you mean `airbnb`?"

Stop. Do not modify files.

### 1f. Apply: copy DESIGN.md, derive tokens, regenerate theme.css

This is the core apply pipeline. It replaces the old direct-CSS-variable approach with a DESIGN.md-first flow.

#### 1f-i. Copy resolved DESIGN.md to project root

Copy the resolved DESIGN.md file to `<projectRoot>/DESIGN.md`. If a DESIGN.md already exists at the project root, overwrite it (this is the "active design system" slot).

#### 1f-ii. Parse DESIGN.md to W3C tokens

Run `parseDesignMd(content)` (from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/design-md-parse.ts`) on the content of `<projectRoot>/DESIGN.md`. This returns a `Tokens` object with groups: `color`, `font`, `typography`, `spacing`, `radius`, `shadow`.

If the parser cannot extract at least one color token (i.e., the `color` group has no entries beyond `$type`), do NOT silently produce empty output. Instead:
1. Print: "DESIGN.md format for `<name>` not recognized — the parser could not extract color tokens. The DESIGN.md has been copied to the project root; you can edit it to add structured color data, or run `/design-skin save <name>` after manually adjusting theme.css."
2. Stop. Do not write tokens.json or modify theme.css.

#### 1f-iii. Write tokens.json

Write the `Tokens` object as JSON (pretty-printed, 2-space indent) to `<projectRoot>/tokens.json`. If the file already exists, overwrite it.

#### 1f-iv. Regenerate theme.css

1. Determine the theme file path. If `.design-rules/config.json` has a `themeFile` field, use that (relative to project root). Otherwise, read the adapter's manifest at `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/manifest.json` and use `theme.targetPath` + `/theme.css`.
2. Read the existing theme.css content.
3. Run `writeTokensToCss(tokens, { existing: themeFileContent })` (from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/theme-io.ts`). This surgically replaces managed CSS variables in-place while preserving all unmanaged declarations.
4. Write the result back to the theme file.

#### 1f-v. Apply fonts

This step updates `fonts.css` with the appropriate `@import` for the primary font extracted from the DESIGN.md. It works the same as before:

1. Check whether the `font` group in the parsed tokens has a `primary` entry. If so, use its `$value` as the font name. If not, skip font changes.
2. Read `${CLAUDE_PLUGIN_ROOT}/data/font-sources.json` for the font source lookup.
3. If `<targetPath>/fonts.css` does not exist (e.g., `obsidian-css` adapter), skip this step.
4. Otherwise, locate the managed `@import` block in `fonts.css` delimited by:

```
/* design-engine: managed-font-imports:start */
... existing @import lines ...
/* design-engine: managed-font-imports:end */
```

5. Build the new block contents. Look up the font name in `font-sources.json`:
   - `type: "google"` → build the URL: URL-encode the family (spaces to `+`), join weights with `;`, final URL: `https://fonts.googleapis.com/css2?family=<encoded-name>:wght@<weights>&display=swap`. Add `@import url('<URL>');`
   - `type: "system"` → no `@import`. Browser uses the local font.
   - `type: "proprietary"` → no `@import`. User is expected to host the font.
   - Not in `font-sources.json` → no `@import`. Print warning: `Font '<name>' not in data/font-sources.json — no @import added.`

6. If the font group also has a `mono` or `monospace` entry, apply the same lookup logic for that font.

7. Replace the managed block contents. If the markers are not present, prepend a fresh managed block at the top of the file.

8. Use Edit (not Write) so user-managed content in `fonts.css` is preserved.

### 1g. Update marker

Edit `.design-rules/config.json`: set `skin` to `<slug>`. Preserve all other fields.

### 1h. Confirm

Print a summary:

```
Applied design system `<name>` (resolved from <source>).
  DESIGN.md: copied to <projectRoot>/DESIGN.md
  Tokens: <count> tokens derived across <group-count> groups → tokens.json
  Theme CSS: <count-vars> variables updated in <themeFile>
  Primary font: <name> <font-suffix>
  Mono font: <name or 'unchanged'> <font-suffix>

Modified:
- DESIGN.md
- tokens.json
- <themeFile>
<- <targetPath>/fonts.css (omit if font step was skipped)>
- .design-rules/config.json (skin: <old> → <new>)
<- .design-rules/design-systems/<slug>/DESIGN.md (cached, only if Source 4 was used)>
```

Font suffix options (same as before):
- `(Google Fonts @import added)` for `type: "google"`
- `(system font, no @import)` for `type: "system"`
- `(proprietary font, no @import — host it yourself)` for `type: "proprietary"`
- `(unknown font, no @import — add to data/font-sources.json)` if not in lookup
- `(skipped — adapter has no fonts.css)` if fonts.css doesn't exist

---

## Case 2: Save current DESIGN.md as a named design system

Example: `/design-skin save mytheme`, `/design-skin save linear.app`.

### 2a. Verify project initialized

Read `.design-rules/config.json`. If missing, error: "No design system initialized — run `/design-init` first."

### 2b. Read current DESIGN.md

Read `<projectRoot>/DESIGN.md`. If it doesn't exist, error:

```
No DESIGN.md found at the project root. Apply a design system first with `/design-skin <name>`, or create one manually.
```

Stop.

### 2c. Slugify the name

Take the name argument (everything after `save` and a space). Slugify it: lowercase, replace dots with hyphens (e.g., `linear.app` becomes `linear-app`), strip characters outside `[a-z0-9-]`.

### 2d. Write to user global cache

Create directory `~/.design-rules/design-systems/<slug>/` if it doesn't exist.

Write the DESIGN.md content verbatim to `~/.design-rules/design-systems/<slug>/DESIGN.md`.

If a DESIGN.md already exists at that path, ask the user:

```
A design system named `<slug>` already exists at ~/.design-rules/design-systems/<slug>/DESIGN.md.
Overwrite? [y/N]
```

Wait for an explicit yes before overwriting.

### 2e. Confirm

```
Saved current DESIGN.md as design system `<slug>`.
  Cached at: ~/.design-rules/design-systems/<slug>/DESIGN.md

Apply in any project with: /design-skin <slug>
```

---

## Case 3: List available design systems

Example: `/design-skin list`.

### 3a. Enumerate sources

Use Glob for each:
- Project: `.design-rules/design-systems/*/DESIGN.md`
- User global: `~/.design-rules/design-systems/*/DESIGN.md`
- Bundled: `${CLAUDE_PLUGIN_ROOT}/data/design-systems/*/DESIGN.md`

Also check for legacy JSON skins (these will be auto-migrated on first use):
- Project: `.design-rules/skins/*.json`
- User global: `~/.design-rules/skins/*.json`

Read `${CLAUDE_PLUGIN_ROOT}/data/awesome-design-md-index.json` if it exists.

Read `.design-rules/config.json` to know the currently active skin (mark it with `[active]`).

### 3b. Print grouped output

Format:

```
Design systems in this project (.design-rules/design-systems/):
- <slug> [active]
- <slug>
(empty if none)

Design systems in user global (~/.design-rules/design-systems/):
- <slug>
(empty if none)

Bundled with plugin:
- <slug>
- <slug>
(list directory names under ${CLAUDE_PLUGIN_ROOT}/data/design-systems/)

Legacy JSON skins (auto-migrated on first use):
- <name> (project cache)
- <name> (user global)
- <name> (bundled)
(omit this section entirely if no legacy skins exist)

Available from awesome-design-md (fetched on demand):
- airbnb, airtable, apple, ...
(comma-separated, wrap at ~80 chars; only if the index file exists)

Currently active: <name from config.json, or 'none'>
```

If the project isn't initialized (no `.design-rules/config.json`), still show bundled and global design systems, but skip the "active" line and the "in this project" section. Add a hint: "No project initialized — run `/design-init` to set up this project."

---

## Notes for Claude

- Always use absolute paths or paths anchored at the project root. Don't assume the user is at the repo root.
- Prefer Edit (line-replacement) over Write (full-rewrite) when modifying `theme.css` and `fonts.css` — preserve formatting and untouched tokens.
- When the WebFetch goes through (Source 4), cache the raw DESIGN.md verbatim first, then parse. This way the cache always has a valid DESIGN.md even if parsing is updated later.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the design-engine plugin's install directory. Use it for all reads from `adapters/` and `data/`.
- `parseDesignMd()` returns W3C Design Token groups. `writeTokensToCss()` flattens those groups into `--name: value;` CSS declarations. The group prefix is stripped by `writeTokensToCss` (e.g., `color.brand` becomes `--brand`).
- The old JSON skin format used `colors.light` / `colors.dark` with token names without `--` prefix. The new DESIGN.md format captures the full design system and derives tokens via `parseDesignMd()`. The lazy migration in step 1c bridges the gap.
- The `emitDesignMdSkeleton()` function used for migration takes a W3C tokens object and an options object with `name` (string) and optional `category` (string). It produces a full 9-section DESIGN.md with derivable sections (2, 3, 5, 6) filled from the tokens and narrative sections (1, 4, 7, 8, 9) stubbed with TODO comments.
- Slugification for dotted brand names (e.g., `linear.app` to `linear-app`) matters because the filesystem paths use the slug. Always slugify before path construction.
- The `tokens.json` written in step 1f-iii is the W3C Design Tokens format that other tools (settings page, `/design-tokens`) can consume directly.
