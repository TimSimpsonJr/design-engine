# Design: Live two-way write-back for the runtime settings page

**Issue:** [#4 — Settings page live two-way write-back via Vite plugin / dev API](https://github.com/TimSimpsonJr/design-engine/issues/4)
**Branch:** `feat/settings-page-write-back`
**Date:** 2026-05-04

## Problem

The runtime settings page (route `/__design`) is currently snippet-only. Users tweak design tokens in the UI, the page generates a CSS snippet, and they manually copy/paste it back into `theme.css`. The original product promise was live two-way write-back: edit a token → server writes `theme.css` directly → Vite/Astro/SvelteKit HMR repaints across the running app, no paste step.

Two related bugs surfaced during design:

1. **`--font-primary` is set but never consumed.** `theme.css` declares the variable; `fonts.css` hardcodes `body { font-family: 'Inter', ... }`. So even on `obsidian-css` today, font edits never visibly take effect.
2. **Bundled skins specify `Inter` for every brand.** Vercel upstream specifies Geist; Stripe specifies sohne-var (fallback SF Pro Display); Linear, Notion, Toss were ported sloppily. Switching skins changes colors but not typography.

Both fold into this PR because the live-font-write story is incoherent without them.

## Goals

- Edit a token in the settings UI → file write → HMR-driven live update across the entire running app, with no manual paste step.
- Cover the three web adapters (`react-shadcn`, `astro`, `sveltekit`) in one PR.
- Edit both light and dark mode tokens; UI mode toggle flips both the editing target and the page chrome.
- Free-text font picker with autocomplete sourced from the live Google Fonts catalog; auto-`@import` for fonts the user picks from autocomplete.
- The settings page itself becomes the preview — realistic demo components reflect token edits live, no separate fake "preview card".
- Fix the `--font-primary` consumption gap so font edits actually work.
- Correct bundled skin font fields per upstream specs.

## Non-goals

- Editing `plain-css` projects (no dev server). Stays snippet-only.
- Editing `obsidian-css` (already has direct write-back via Vault API).
- Production-mode settings page. Strictly dev-only.
- Editing tokens beyond colors + font (radii, spacing, shadows etc. — future PR).
- Custom theme variants beyond light/dark (e.g., high-contrast, sepia). Dark `:root.dark` block only.
- A "Reset to defaults" or "Reload from file" button. Users with tweaks save them as a custom skin via existing `/design-skin save <name>`.
- Refreshing the awesome-design-md catalog or fixing other bundled skin fields beyond `fonts`.

## Architecture overview

```
User clicks color picker
  ↓
Page state updates (immediate local re-render — preview is the page itself)
  ↓
Debounce 250ms or blur
  ↓
POST /__design/api/tokens  { mode: "light" | "dark", tokens: {...} }
  ↓
Adapter-specific server handler (Vite plugin / Astro integration / SvelteKit endpoint)
  ↓
Shared theme-io helper:
  - Read theme.css
  - Surgically replace managed variables in :root or .dark block
  - Write atomically (temp + rename)
  ↓
Vite/Astro/SvelteKit watcher detects change → CSS HMR
  ↓
Browser repaints with new variables (whole app, not just settings page)
  ↓
Server returns normalized tokens; UI reconciles (in case of validation/normalization)
```

## Detailed design

### 1. Server endpoint contract

All three web adapters expose the same HTTP contract:

**`GET /__design/api/tokens`**

Returns the current theme tokens parsed from `theme.css`.

```json
{
  "light": { "brand": "#533afd", "primary": "#061b31", ... , "font": "Inter" },
  "dark":  { "brand": "#665efd", "primary": "#e2e8f0", ... , "font": "Inter" }
}
```

If parsing fails (file missing, exotic shape), returns `409 Conflict` with `{ "error": "parse_failed", "message": "..." }`. The page falls back to snippet mode (Copy CSS button) and surfaces the error.

**`POST /__design/api/tokens`**

```json
// request
{ "mode": "light" | "dark", "tokens": { "brand": "#...", ..., "font": "Pacifico" } }

// response (success)
{ "ok": true, "tokens": {...} }   // normalized values

// response (failure)
{ "ok": false, "error": "write_failed" | "parse_failed" | "not_dev", "message": "..." }
```

Successful writes also rewrite the managed `@import` block in `fonts.css` if the picked font came from the autocomplete catalog (see §5).

**Dev gating.** Triple layer:
- Page-level: `if (!import.meta.env.DEV) location.replace('/')` (prevents the route from rendering in production).
- Handler-level: returns `404` (not redirect) if not dev.
- Plugin/integration registration: only registers in dev mode (the route literally does not exist in prod builds).

### 2. Shared `theme-io` helper

To avoid duplicating parser/writer logic three times, generate one `theme-io` helper into the user's project. Each framework shim imports it.

**Location in user project:** `src/lib/design-engine/theme-io.ts` (or framework-equivalent path).

**Exports:**
- `readTokens(themePath: string): TokenSet` — parses `theme.css`, returns `{ light, dark }`.
- `writeTokens(themePath: string, mode: "light" | "dark", tokens: TokenObj): TokenObj` — surgical replace, atomic write, returns normalized values.
- `writeFontImports(fontsPath: string, importEntries: ImportEntry[]): void` — rewrites the managed `@import` block in `fonts.css`.

The helper uses Node's `fs/promises` only — no third-party deps. ~120-150 LOC.

### 3. `theme.css` edit strategy

Surgical, block-aware replacement. Wholesale `:root { ... }` rewrite is wrong for this file — it would clobber user comments, custom variables, and the `@theme inline` block.

**Algorithm:**

1. Parse the file into a sequence of CSS blocks (`:root`, `.dark`, `@theme inline`, etc.).
2. Find the top-level `:root` block whose body contains at least one managed token (`--brand`, `--background`, etc.).
3. For each managed variable in the request, locate its declaration line within the chosen block and replace the value only.
4. If a managed variable is not present in the block, append it to the block (preserves intent on first edit after manual deletion).
5. Same algorithm for `.dark` block when `mode === "dark"`.

**Comments and unmanaged variables** between managed declarations are preserved verbatim.

**Fail closed:** If the file has no `:root` block, multiple top-level `:root` blocks containing managed tokens, or any structural ambiguity that makes the target block uncertain, the helper returns a parse error. The UI falls back to snippet mode and surfaces the error inline. Users edit `theme.css` manually to bring it into a parseable shape.

**Atomic write:** Write to `theme.css.tmp`, then rename. Avoids partial reads by Vite's watcher mid-write.

### 4. Light + dark mode editing

**Token state shape (page):**
```ts
type TokenObj = {
  brand: string; primary: string; background: string; card: string;
  foreground: string; destructive: string; success: string;
  warning: string; info: string; font: string;
};
type TokenSet = { light: TokenObj; dark: TokenObj };
```

**Mode toggle UI.** Top of page. Light / Dark switch. State `currentMode: "light" | "dark"`.

**Page chrome follows the toggle.** When `currentMode === "dark"`, the page wrapper applies the `dark` class (or `data-theme="dark"`) so the page itself renders in dark mode using the same tokens. This means the page IS the preview — you see your edits applied to real components in the chosen mode immediately.

**Editing flow.** Color/font controls show the values for `currentMode`. Editing a control mutates `tokens[currentMode][key]`, debounced POST to server with `{ mode: currentMode, tokens: tokens[currentMode] }`. Other mode's tokens untouched.

### 5. Font picker — Google Fonts catalog integration

**Source of truth:** `https://fonts.google.com/metadata/fonts` (unauthenticated, returns full catalog as JSON, ~2.6MB).

**Page-side flow:**
1. On font input focus (lazy — not on mount): fetch the metadata endpoint, cache in browser session storage.
2. Build autocomplete suggestions from `families[]` field. Each entry: `{ family, category, variants }`.
3. Show all categories (sans-serif, serif, display, handwriting, monospace) — no filtering. Suffix the category in the dropdown row: `Inter — sans-serif`, `Pacifico — display`.
4. User can also type a custom name not in the suggestions — accepted, but treated as "unknown" (no auto-import; see below).

**Offline fallback:** If the metadata fetch fails, fall back to a hardcoded ~15-font list (Inter, Pretendard, Geist, DM Sans, Manrope, Plus Jakarta Sans, IBM Plex Sans, Roboto, Open Sans, Source Sans Pro, Outfit, JetBrains Mono, Space Grotesk, Albert Sans, System default). Page still functional, just reduced suggestions.

**Auto-`@import` policy:**
- Pick from autocomplete (= known Google Fonts entry) → server adds `@import` to `fonts.css` managed block.
- Type a custom name not in autocomplete → server skips the `@import` write. Variable still set; assumes user has the font available locally or imported elsewhere.

**Per-font weight URL generation.** The autocomplete entry includes available variants. Server generates the @import URL with only weights that exist for that font:
- Single-weight fonts (e.g., Pacifico): `https://fonts.googleapis.com/css2?family=Pacifico&display=swap`
- Multi-weight fonts (e.g., Inter): `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap`
- Variable fonts: include axis range from metadata (e.g., `Inter:wght@100..900`).

This avoids 404s from requesting weights a font doesn't ship.

### 6. Managed font import block in `fonts.css`

Wrap auto-managed `@import` rules in a comment-delimited region:

```css
/* design-engine: managed-font-imports:start */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');
/* design-engine: managed-font-imports:end */

@import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap');  /* unmanaged — user added */

body {
  font-family: var(--font-primary);
}
```

**Why a managed block, not append:**
- `@import` rules must come before regular CSS rules. Blind append eventually lands an `@import` after `body { ... }`, producing invalid CSS.
- Dedupe is automatic — we always rewrite the block, not add to it.
- Users can keep their own `@import` rules outside the block; we never touch those.

**Block content rule:** The block contains exactly one `@import` for the currently active `--font-primary` font (the one most recently picked from autocomplete) plus any fonts referenced by previously-saved custom skins (handled by `/design-skin` apply, see §11). When `--font-primary` is set to a custom (non-autocomplete) font name, the block's primary `@import` is removed.

**`fonts.css` body rule fix.** Replace the hardcoded `body { font-family: 'Inter', 'Pretendard', ...; }` with `body { font-family: var(--font-primary), system-ui, sans-serif; }`. This is bug fix #1 from the problem statement.

### 7. Demo showcase on the settings page

The page becomes the preview. Demo elements style from live CSS variables (no inline tokens) so the file write → HMR loop is what visibly drives the demo.

**Layout (top to bottom):**
1. Header: title + Light/Dark mode toggle + status indicator
2. Color editor section (rows of color picker + hex input for the 9 tokens, in the active mode)
3. Font picker section (autocomplete combobox)
4. Demo showcase section (see below)
5. Generated CSS preview + Copy CSS button (fallback)

**Demo showcase elements (minimum useful set):**
- Page shell + card surface (background tone visible)
- Typography stack: display heading (h1), heading (h2), body paragraph, small/label, inline code
- Buttons row: brand, primary, destructive, outline (4)
- Status chips: success, warning, error, info (4)
- One form row: text input + select
- One KPI/stat card (number + delta + label)

**Implementation per adapter:**
- `react-shadcn`: compose existing primitives where convenient (Button, Card, Badge, Input, Select). Inline in the settings-page template.
- `astro`: plain HTML elements styled with Tailwind classes referencing the same CSS variables. Inline.
- `sveltekit`: same as astro, idiomatic Svelte. Inline.

No shared `<DemoShowcase />` component extracted in this PR. Per-adapter inline keeps the templates self-contained, generated routes self-explanatory, and avoids cross-adapter coupling. Future PR can extract if any settings-page template exceeds ~350 LOC or the showcase grows interactive state.

### 8. UX behavior

- **Auto-save.** No explicit Save button. Edit a control → local preview updates immediately → POST debounced 250ms + flush on blur.
- **Status indicator.** Inline at top of page: idle (no badge) / "Saving…" / "Saved" / "Error: <message> [Retry]". No success toast.
- **Errors.** Persistent inline error with Retry button. Toast-only would be too easy to miss during rapid tweaking. On retry click, re-POST the last attempted request. If 5 consecutive retries fail, fall back to snippet mode (show Copy CSS button as primary affordance).
- **Read on mount.** Page calls `GET /__design/api/tokens` on mount; UI initializes from server response. No DEFAULT_TOKENS hardcoded fallback (was the old behavior); if GET fails, show error and Copy CSS button.
- **Copy CSS button kept.** Secondary action. Always available — useful as fallback if writes are failing, or for sharing the snippet outside the project.
- **Download theme.css button removed.** Redundant with direct write.
- **No Reset / Reload buttons.** Users with tweaks → `/design-skin save <name>`. Recovery → `git checkout theme.css`.

### 9. Manifest schema bump

Promote `settingsPage.writeCapable` to an explicit enum:

```json
"writeCapable": "none" | "snippet" | "direct"
```

| Adapter | Before | After |
|---|---|---|
| `react-shadcn` | `"snippet"` | `"direct"` |
| `astro` | `"snippet"` | `"direct"` |
| `sveltekit` | `"snippet"` | `"direct"` |
| `obsidian-css` | `true` | `"direct"` |
| `plain-css` | `"snippet"` | `"snippet"` (no change) |
| `tailwind-v4` | `false` | `"none"` |

Update `commands/design-settings-page.md` to consume the enum (replaces the boolean/string mix in current branching logic).

### 10. Bundled skin font corrections

Per upstream awesome-design-md (where present) or known brand specs:

| Skin | Before | After | Rationale |
|---|---|---|---|
| `vercel.json` | `Inter` (mono `DM Mono`) | `Geist` (mono `Geist Mono`) | Upstream spec; Vercel's own font |
| `stripe.json` | `Inter` (mono `DM Mono`) | `SF Pro Display` (mono `JetBrains Mono`) | Stripe's documented fallback for proprietary `sohne-var` |
| `notion.json` | `Inter` | `Inter` (no change) | Notion Sans = Inter-variant; Inter is closest loadable equivalent |
| `linear.json` | `Inter` | `Inter` (no change) | Matches Linear's Inter Variable usage |
| `toss.json` | `Inter` | `Pretendard` | Korean-origin design system; Pretendard is the standard Korean UI font |

### 11. `/design-skin` extension — managed font import

When `/design-skin <name>` applies a skin, also rewrite the managed `@import` block in `fonts.css` (using the same `writeFontImports` helper from §2) to load the skin's chosen font. Without this, switching to Vercel sets `--font-primary: 'Geist'` but Geist never loads — the regression we're already fixing for the live picker would re-emerge for the static skin-swap path.

Same rules as §5 auto-import: only known Google Fonts entries get an @import. For skins specifying proprietary fonts (`SF Pro Display`, `Toss Product Sans`, etc.), no @import — variable is set, browser falls back to system equivalent.

This requires `/design-skin` to know which skin fonts are Google-Fonts vs. system/proprietary. Hardcode a small map in the command, refreshable as skins are added:

```ts
{
  "Inter": { google: true },
  "Pretendard": { google: true },
  "Geist": { google: true, mono: "Geist Mono" },
  "SF Pro Display": { google: false },  // system on macOS
  "Toss Product Sans": { google: false }, // proprietary
  ...
}
```

## Implementation order

Build in this order to validate the round-trip end-to-end before porting to other adapters:

1. **Phase A — `theme.css` + `fonts.css` plumbing fixes** (no settings-page changes yet).
   - Add `--font-primary` declaration to `adapters/tailwind-v4/theme/theme.css`.
   - Change `adapters/tailwind-v4/theme/fonts.css` body rule to `var(--font-primary)`.
   - Add managed font import block markers (initially containing the existing Inter import).
   - Update bundled skin JSON files per §10.
   - Verify `/design-skin vercel` (manually run) writes the correct font + @import.

2. **Phase B — `react-shadcn` end-to-end.**
   - Build `theme-io` helper (read/write/import-block management).
   - Build Vite plugin `vite-plugin-design-engine.ts` exposing `GET`/`POST /__design/api/tokens`.
   - Update `adapters/react-shadcn/templates/settings-page.tsx` with light/dark editor, demo showcase, font autocomplete, auto-save, status indicator.
   - Update `commands/design-settings-page.md` to write the Vite plugin and patch `vite.config.ts` (or print instructions if the config doesn't match the scaffold shape).
   - Update `adapters/react-shadcn/manifest.json` `writeCapable` to `"direct"`.
   - Smoke test: scaffold a fresh react-shadcn project, run `/design-settings-page`, edit a color, verify HMR updates app.

3. **Phase C — `astro` adapter.**
   - Astro integration `astro-integration-design-engine.ts` hooks `astro:server:setup`, installs Vite middleware reusing the same theme-io helper.
   - Update `adapters/astro/templates/settings-page.astro`.
   - Update `commands/design-settings-page.md` astro branch to write the integration + patch `astro.config.mjs`.
   - Update `adapters/astro/manifest.json` `writeCapable` to `"direct"`.

4. **Phase D — `sveltekit` adapter.**
   - SvelteKit endpoint at `src/routes/__design/api/tokens/+server.ts` reusing theme-io helper.
   - Update `adapters/sveltekit/templates/settings-page.svelte`.
   - Update `commands/design-settings-page.md` sveltekit branch.
   - Update `adapters/sveltekit/manifest.json` `writeCapable` to `"direct"`.

5. **Phase E — `/design-skin` font-import extension** (§11).

6. **Phase F — Manifest schema migration.**
   - Promote `writeCapable` to enum across all 6 adapter manifests.
   - Update consumers (`commands/design-settings-page.md`, any agent or skill that reads the field).
   - Update README and any docs that reference the old shape.

## Files affected (full inventory)

**Created:**
- `adapters/react-shadcn/templates/vite-plugin-design-engine.ts` — Vite plugin (also reused by Astro integration).
- `adapters/astro/templates/astro-integration-design-engine.ts` — Astro integration wrapper.
- `adapters/react-shadcn/templates/theme-io.ts` — Shared helper. Astro and SvelteKit settings-page generation copies the same file (under different names if path conventions differ).

**Modified:**
- `adapters/tailwind-v4/theme/theme.css` — add `--font-primary` declaration.
- `adapters/tailwind-v4/theme/fonts.css` — body rule consumes variable; managed import block markers.
- `adapters/react-shadcn/templates/settings-page.tsx` — full rewrite (light/dark, demo showcase, autocomplete, auto-save).
- `adapters/astro/templates/settings-page.astro` — full rewrite.
- `adapters/sveltekit/templates/settings-page.svelte` — full rewrite.
- `adapters/react-shadcn/manifest.json` — `writeCapable: "direct"`.
- `adapters/astro/manifest.json` — `writeCapable: "direct"`.
- `adapters/sveltekit/manifest.json` — `writeCapable: "direct"`.
- `adapters/obsidian-css/manifest.json` — `writeCapable: "direct"` (was `true`).
- `adapters/plain-css/manifest.json` — `writeCapable: "snippet"` (no change, schema enum migration only).
- `adapters/tailwind-v4/manifest.json` — `writeCapable: "none"` (was `false`).
- `commands/design-settings-page.md` — branching by adapter for write-capable mode, write supporting integration files, patch framework configs.
- `commands/design-skin.md` — apply font @import to managed block when swapping skins.
- `data/skins/vercel.json` — font correction.
- `data/skins/stripe.json` — font correction.
- `data/skins/toss.json` — font correction.
- `MANIFEST.md` — regenerate before PR merge.
- `README.md` — update "Settings page" capability descriptions if any reference snippet-only mode.

**Out of scope but worth tracking separately:**
- Audit/fix bundled skin colors against upstream (only fonts in this PR).
- Refresh awesome-design-md catalog from current upstream.
- Add Linear and Toss to upstream awesome-design-md (currently 404).
- Token expansion beyond colors + font (radii, spacing, shadows, motion editors).

## Risks

- **Undocumented Google Fonts metadata endpoint.** `https://fonts.google.com/metadata/fonts` powers fonts.google.com itself; reasonably stable but not officially supported. Fallback to bundled list mitigates outage but not removal. Acceptable — worst case we revert to a bundled snapshot.
- **Auto-editing user's `vite.config.ts` / `astro.config.mjs`.** Risky on customized configs. Mitigation: only safe-edit when the config matches the scaffold shape; otherwise print a one-line registration snippet and ask the user to add it manually.
- **Atomic rename on Windows.** `fs.rename` over an existing file works on POSIX but historically has edge cases on Windows (file in use by Vite watcher). Need to verify; may need a small retry loop or `fs.copyFile` + `fs.unlink` as fallback.
- **Mode toggle interaction with Tailwind dark class detection.** Tailwind's `darkMode: "class"` strategy expects `dark` on `<html>`. The settings page applies it on its own wrapper div, which is fine for self-contained demo, but worth verifying it doesn't conflict with the user's app-wide dark mode setup.
- **Demo showcase rendering on Astro.** Astro's `is:global` styles and partial hydration model may complicate live token reactivity. Verify in Phase C smoke test; if needed, isolate showcase in a `<script>`-driven re-render rather than relying purely on CSS variable inheritance.

## Open questions deferred to implementation

- Exact location of the managed `theme-io` helper inside the user's project. Recommended: `src/lib/design-engine/`. Confirm during Phase B implementation against react-shadcn's existing convention.
- Whether to detect Next.js app vs. pages router for react-shadcn (existing `/design-settings-page` already does this; just needs to handle one extra file path).
- Best way to express `is:global` style scoping for Astro's settings page demo — verify in Phase C.
