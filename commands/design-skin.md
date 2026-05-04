---
name: design-skin
description: Swap the active skin (palette + fonts) in the current project, OR install a custom skin globally, OR save current theme as a named skin, OR list available skins. Resolves via 4-source lookup — project cache, user global ~/.design-rules/skins/, plugin bundled, awesome-design-md fetch.
argument-hint: <skin-name> | install <path-to-json> | save <name> | list
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---

# /design-skin — Skin Swap & Management

You manage skins (palette + fonts) for the current project. Skins are JSON files conforming to the design-engine skin schema. This command has four argument modes — parse `$ARGUMENTS` to figure out which one.

## Argument parsing

Trim `$ARGUMENTS` and inspect the first token:
- Empty or just whitespace → error: "Usage: /design-skin <skin-name> | install <path> | save <name> | list"
- First token is `install` → **Case 2** (install)
- First token is `save` → **Case 3** (save)
- First token is `list` → **Case 4** (list)
- Anything else → **Case 1** (apply skin), with the whole argument as the skin name

---

## Case 1: Apply a skin (bare name)

Example invocations: `/design-skin stripe`, `/design-skin airbnb`, `/design-skin toss`.

### 1a. Verify project initialized

Read `.design-rules/config.json` at the project root. If it doesn't exist, error:

```
No design system initialized in this project — run `/design-init` first.
```

Stop. Do not proceed.

If it exists, parse it. You'll need `adapter` and the current `skin` value (for the confirmation message at the end).

### 1b. 4-source skin lookup

Look for `<name>.json` in this order. Stop at the first hit and remember which source resolved it (you'll mention it in the confirmation message).

1. **Source 1 — Project cache:** `.design-rules/skins/<name>.json`
2. **Source 2 — User global:** `~/.design-rules/skins/<name>.json` (resolve `~` to the user's home — on Windows that's `%USERPROFILE%`, on Unix `$HOME`)
3. **Source 3 — Plugin bundled:** `${CLAUDE_PLUGIN_ROOT}/data/skins/<name>.json`
4. **Source 4 — awesome-design-md fetch:** `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/<name>/DESIGN.md`. Use WebFetch. If the fetch returns 404 or HTML (rather than markdown), treat as miss.

If Source 4 succeeds, **parse** the DESIGN.md (see "DESIGN.md parsing" below) into a skin JSON object, then **cache** it to `.design-rules/skins/<name>.json` before applying. (Future invocations will hit Source 1 instead of re-fetching.)

### 1c. If no source resolves

Don't apply anything. Print a "skin not found" report:

1. List skins available locally (project + user global + bundled), each on its own line, grouped by source. Use Glob to enumerate `.design-rules/skins/*.json`, `~/.design-rules/skins/*.json`, `${CLAUDE_PLUGIN_ROOT}/data/skins/*.json`.
2. If `${CLAUDE_PLUGIN_ROOT}/data/awesome-design-md-index.json` exists, add a line: "Plus N brands available from awesome-design-md (e.g., airbnb, claude, figma, ...) — run `/design-skin list` for the full catalog."
3. Run a fuzzy-match check: if any locally-available skin name has a small edit distance from the requested name (e.g., `airbnnb` vs `airbnb`, or substring match), suggest it: "Did you mean `airbnb`?"
4. Final hint: "Or install a custom skin: `/design-skin install /path/to/myskin.json`."

Stop. Do not modify files.

### 1d. Validate the resolved skin

The skin JSON must have:
- `name` (string)
- `version` (number or string)
- `colors.light` (object with at least `--brand` or `--primary`)
- `colors.dark` (object — may be empty if light-only, but warn the user)
- `fonts.primary` (string — font family name)

If validation fails, error: "Skin file at <path> is malformed: <reason>." and stop.

### 1e. Apply skin to theme.css

Read the active adapter's manifest at `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/manifest.json`. The `theme.targetPath` is where theme files live in the project (e.g., `src/styles/`).

Read `<targetPath>/theme.css`. You'll edit:
- The `:root { ... }` block — apply `skin.colors.light`
- The `.dark { ... }` block — apply `skin.colors.dark`

For each `key: value` pair in `skin.colors.light`:
- The key is the token name **without** the leading `--` (e.g., `brand`, `primary`, `background`).
- Find the matching `--<key>: <existing>;` line inside the `:root` block. Replace `<existing>` with the new value.
- If the token doesn't exist in `:root`, append it inside the block under a `/* === Skin === */` comment marker (create the marker if absent).

Do the same for `.dark` block with `skin.colors.dark`.

**Preserve non-color tokens** — do NOT touch `--radius`, `--shadow-*`, `--duration-*`, `--ease-*`, `--font-*`, `--font-weight-*`, chart colors, sidebar tokens, etc. Only colors named in the skin get replaced.

If the skin contains tokens not present in theme.css, append them. If theme.css contains tokens not in the skin, leave them alone.

### 1f. Apply fonts

Read `<targetPath>/fonts.css`. Replace the `@import url(...)` lines with the imports for `skin.fonts.primary` (and `skin.fonts.mono` if present).

Font import URL templates:
- Google Fonts (default): `https://fonts.googleapis.com/css2?family=<URL-encoded-name>:wght@400;500;600;700&display=swap`
- If `skin.fonts.importUrl` is explicitly set, use that instead (allows custom CDN imports)

Update the `body { font-family: ... }` line to lead with the new primary font, falling back to whatever's already there.

Update `--font-sans` (or equivalent) in `theme.css` to reference the new font family if such a token exists.

### 1g. Update marker

Edit `.design-rules/config.json`: set `skin` to `<name>`. Preserve all other fields. Update no other field.

### 1h. Confirm

Print a summary:

```
Applied skin `<name>` (resolved from <source>).
  Colors: <count-light> light tokens, <count-dark> dark tokens
  Primary font: <name>
  Mono font: <name or 'unchanged'>

Modified:
- <targetPath>/theme.css
- <targetPath>/fonts.css
- .design-rules/config.json (skin: <old> → <new>)
<- .design-rules/skins/<name>.json (cached, only if Source 4 was used)>
```

---

## Case 2: Install a custom skin globally

Example: `/design-skin install /path/to/myskin.json`.

### 2a. Read and validate

Read the file at the path provided as the second argument (everything after `install` and a space). If the path is missing or the file doesn't exist, error.

Parse as JSON. Validate the schema (same checks as Case 1d):
- `name`, `version`, `colors.light`, `colors.dark`, `fonts.primary`

If invalid, surface the specific failure: "Skin missing required field `colors.dark`. Cannot install."

### 2b. Copy to user global

Resolve `~/.design-rules/skins/`. Create the directory if it doesn't exist.

Write the skin JSON to `~/.design-rules/skins/<skin.name>.json` (use the `name` field from inside the JSON, not the source filename, for consistency).

If a file with that name already exists, ask the user:

```
A skin named `<name>` already exists at ~/.design-rules/skins/<name>.json.
Overwrite? [y/N]
```

Wait for an explicit yes before overwriting.

### 2c. Confirm

```
Installed skin `<name>` (v<version>) to ~/.design-rules/skins/<name>.json.
Apply with: /design-skin <name>
```

This skin is now available across every project on this machine.

---

## Case 3: Save current theme as a named skin

Example: `/design-skin save mytheme`.

### 3a. Verify project initialized

Read `.design-rules/config.json`. If missing, error: "No design system initialized — run `/design-init` first."

Parse `<adapter>` from the marker.

### 3b. Read current theme

Read the adapter's manifest to get `theme.targetPath`. Then read `<targetPath>/theme.css`.

Parse the `:root { ... }` block: extract every `--<token>: <value>;` declaration where the token name suggests a color (matches one of: `brand`, `primary`, `secondary`, `background`, `foreground`, `card`, `popover`, `muted`, `accent`, `destructive`, `success`, `warning`, `info`, `border`, `input`, `ring`, `text-`, `surface-`, `chart-`, `sidebar-`, `*-foreground`, `*-tint`, `alert-badge`, `icon-default`, `switch-background`, `input-background`).

Do the same for the `.dark { ... }` block.

### 3c. Read current fonts

Read `<targetPath>/fonts.css`. Detect the active font import:
- Find the first `@import url(...)` that points at a font CDN.
- Extract the family name from the URL (`family=<name>` parameter for Google Fonts).
- If the body `font-family: '<name>', ...` line is present, prefer that name as the canonical primary.
- Detect a separate mono import (DM Mono, JetBrains Mono, etc.) — same logic, second `@import` if present.

### 3d. Build skin JSON

Construct an object:

```json
{
  "name": "<name>",
  "version": 1,
  "source": "user",
  "colors": {
    "light": { "brand": "#...", ... },
    "dark": { "brand": "#...", ... }
  },
  "fonts": {
    "primary": "<font-name>",
    "mono": "<font-name or null>"
  }
}
```

Strip the leading `--` from token names when storing in `colors.light/dark`.

### 3e. Write to project cache

Write the JSON (pretty-printed, 2-space indent) to `.design-rules/skins/<name>.json`.

If a skin with that name already exists in the project cache, ask before overwriting.

### 3f. Confirm

```
Saved current theme as skin `<name>`.
  <count-light> light colors, <count-dark> dark colors
  Primary font: <name>
  Cached at: .design-rules/skins/<name>.json

Apply later with: /design-skin <name>
For cross-project use: copy to ~/.design-rules/skins/<name>.json
```

---

## Case 4: List available skins

Example: `/design-skin list`.

### 4a. Enumerate sources

Use Glob for each:
- Project: `.design-rules/skins/*.json`
- User global: `~/.design-rules/skins/*.json`
- Bundled: `${CLAUDE_PLUGIN_ROOT}/data/skins/*.json`

Read `${CLAUDE_PLUGIN_ROOT}/data/awesome-design-md-index.json` if it exists. The expected shape is `{ "brands": ["airbnb", "airtable", ...] }` or similar — adapt to whatever the index file actually provides.

Read `.design-rules/config.json` to know the currently active skin (mark it with `[active]`).

### 4b. Print grouped output

Format:

```
Skins in this project (.design-rules/skins/):
- <name> [active]
- <name>
(empty if none)

Skins in user global (~/.design-rules/skins/):
- <name>
(empty if none)

Bundled with plugin:
- <name>
- <name>
(read filenames from ${CLAUDE_PLUGIN_ROOT}/data/skins/)

Available from awesome-design-md (fetched on demand):
- airbnb, airtable, apple, ...
(comma-separated, wrap at ~80 chars; only if the index file exists)

Currently active: <name from config.json, or 'none'>
```

If the project isn't initialized (no `.design-rules/config.json`), still show bundled and global skins, but skip the "active" line and the "in this project" section. Add a hint: "No project initialized — run `/design-init` to set up this project."

---

## DESIGN.md parsing (for Source 4)

awesome-design-md DESIGN.md files come from VoltAgent/awesome-design-md and follow a loose template. Your job is to extract a usable palette.

### Expected structure

DESIGN.md files typically include sections like:

```
## Color Palette

### Primary Color
- Brand: #635BFF

### Secondary Colors
- Accent: #00D4FF

### Text Colors
- Primary text: #0A2540
- Secondary text: #425466

### Background Colors
- Page: #FFFFFF
- Card: #F6F9FC
```

### Extraction approach

For each section heading you can find (case-insensitive: "primary color", "secondary color(s)", "text color(s)", "background color(s)"):

1. Pull every line under that heading until the next heading.
2. Match lines like `- <Label>: #RRGGBB` (also accept `#RRGGBBAA`, `rgb(...)`, `hsl(...)`, `oklch(...)`).
3. Map labels to token names heuristically:
   - "Brand" / "Primary" / "Main" / "Logo" → `brand` and `primary` (set both)
   - "Secondary" / "Accent" → `accent`
   - "Primary text" → `text-primary` and `foreground`
   - "Secondary text" → `text-secondary`
   - "Tertiary text" → `text-tertiary`
   - "Page" / "Background" → `background` and `surface-page`
   - "Card" → `card`
   - Anything else: keep as-is, lowercased and dash-separated.

### Build the skin JSON

```json
{
  "name": "<name>",
  "version": 1,
  "source": "awesome-design-md",
  "sourceUrl": "https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/<name>/DESIGN.md",
  "colors": {
    "light": { "brand": "...", "primary": "...", ... },
    "dark": {}
  },
  "fonts": {
    "primary": "Inter",
    "mono": null
  }
}
```

Most awesome-design-md entries don't specify dark mode or fonts — leave `colors.dark` as `{}` and default fonts to Inter. The user can refine by editing `.design-rules/skins/<name>.json` directly or running `/design-skin save <new-name>` after tweaking.

### Format-not-recognized fallback

If your parser can't extract at least a `brand` or `primary` color, do NOT silently produce an empty skin. Instead:

1. Save the raw DESIGN.md content to `.design-rules/skins/<name>.raw.md` (so the user has it).
2. Print: "DESIGN.md format for `<name>` not recognized — upstream may have changed the template. Raw content saved to `.design-rules/skins/<name>.raw.md`. You can author the skin manually as JSON and run `/design-skin install <path>`."
3. Stop. Do not write a `<name>.json`.

---

## Notes for Claude

- Always use absolute paths or paths anchored at the project root. Don't assume the user is at the repo root.
- Prefer Edit (line-replacement) over Write (full-rewrite) when modifying `theme.css` and `fonts.css` — preserve formatting and untouched tokens.
- When the WebFetch goes through, only cache after successful parse. Don't litter `.design-rules/skins/` with broken half-skins.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the design-engine plugin's install directory. Use it for all reads from `adapters/` and `data/`.
- Skin files use `colors.light` / `colors.dark` with token names **without** the `--` prefix. theme.css uses `--<name>` declarations. Translate between the two carefully.
- If the user passes `/design-skin install` without a path, prompt them: "Provide a path: /design-skin install /path/to/skin.json".
- When saving, the project cache (`.design-rules/skins/`) is the natural target. Suggest copying to `~/.design-rules/skins/` only if the user wants the skin available across projects.
