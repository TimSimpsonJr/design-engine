# Settings page live two-way write-back — Implementation Plan (v2)

> **For executor:** Use superpowers:subagent-driven-development to dispatch one fresh subagent per task. Review between tasks. Don't batch.

**Goal:** Implement live two-way write-back for the runtime settings page on the `react-shadcn` adapter, plus the two related bug fixes (`--font-primary` consumption gap; bundled skin font errors). Three other adapters and several extensions are deferred to follow-up issues.

**Architecture:** A Vite plugin owns the entire `/__design/*` URL space in dev — both the HTML settings page and the JSON token API. The settings page is plain HTML + vanilla TypeScript (no React, no router, no UI primitive imports). Token state is in-memory in the page; a managed `<style>` tag re-renders `:root` and `.dark` declarations on every keystroke so demo elements styled with normal CSS variables update instantly. Saves debounce 250ms then POST to the API, which surgically rewrites managed declarations in `theme.css` (preserving comments and unmanaged variables) and rewrites the managed `@import` block in `fonts.css`. The user's actual app, in another browser tab, gets HMR-driven repaint after the file write.

**Scope reduction from the design doc:** This PR ships react-shadcn only. Astro adapter, SvelteKit adapter, /design-skin font @import extension, manifest enum migration across all 6 adapters, live Google Fonts catalog API, and richer demo showcase are deferred to follow-up issues (chips spawned in this session). The design doc is updated to reflect this.

**Tech stack:** TypeScript, Vite, Node `fs/promises`. Tests: Node `--test` with `--experimental-strip-types` (Node 22.6+) or tsx.

**Design doc:** [`docs/plans/2026-05-04-settings-page-write-back-design.md`](2026-05-04-settings-page-write-back-design.md). Refer when this plan says "per design doc §X."

**Issue:** [#4](https://github.com/TimSimpsonJr/design-engine/issues/4) — partially closed by this PR.

**Branch:** `feat/settings-page-write-back` (already created; MANIFEST.md and design doc already committed).

**Platform:** Tim is on Windows. Bash commands in steps work in Git Bash (MINGW64). Avoid `cp`, `/tmp`, heredoc bodies in PR descriptions — use Windows-friendly equivalents shown in each step.

---

## Phase A — Plumbing fixes (5 mechanical tasks)

### Task A.1: Add `--font-primary` declaration to base `theme.css`

**Files:**
- Modify: `adapters/tailwind-v4/theme/theme.css`

**Steps:**

1. Read `adapters/tailwind-v4/theme/theme.css`.
2. Add this declaration to the `:root` block (group near other typography variables, or right before the closing `}`):
   ```css
     --font-primary: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
   ```
3. If a `.dark` block exists, do NOT add `--font-primary` there. Font is shared, declared only in `:root`.
4. Verify with Grep: `--font-primary` appears exactly once in the file.
5. Commit:
   ```
   git add adapters/tailwind-v4/theme/theme.css
   git commit -m "fix(theme): declare --font-primary in :root for consumption by fonts.css"
   ```

---

### Task A.2: Update `fonts.css` to consume `--font-primary` and add managed import block markers

**Files:**
- Modify: `adapters/tailwind-v4/theme/fonts.css` (full rewrite)

**Steps:**

1. Replace the file contents using Write:
   ```css
   /* design-engine: managed-font-imports:start */
   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
   /* design-engine: managed-font-imports:end */

   /* User-managed @import statements may go below the managed block above. */
   /* Example: @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap'); */

   body {
     font-family: var(--font-primary, system-ui), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
     -webkit-font-smoothing: antialiased;
     -moz-osx-font-smoothing: grayscale;
   }
   ```
2. Verify with Grep: `managed-font-imports` (2 lines), `var(--font-primary` (1 line).
3. Commit:
   ```
   git add adapters/tailwind-v4/theme/fonts.css
   git commit -m "fix(theme): consume --font-primary in body rule + mark managed @import block"
   ```

---

### Task A.3: Correct Vercel skin font

**Files:**
- Modify: `data/skins/vercel.json`

**Steps:**

1. Use Edit:
   - From: `"fonts": { "primary": "Inter", "mono": "DM Mono" }`
   - To: `"fonts": { "primary": "Geist", "mono": "Geist Mono" }`
2. Verify with Grep.
3. Commit:
   ```
   git add data/skins/vercel.json
   git commit -m "fix(skins): correct Vercel font to Geist (was Inter)"
   ```

---

### Task A.4: Correct Stripe skin font

**Files:**
- Modify: `data/skins/stripe.json`

**Steps:**

1. Use Edit:
   - From: `"fonts": { "primary": "Inter", "mono": "DM Mono" }`
   - To: `"fonts": { "primary": "SF Pro Display", "mono": "JetBrains Mono" }`
2. Verify with Grep.
3. Commit:
   ```
   git add data/skins/stripe.json
   git commit -m "fix(skins): correct Stripe font to SF Pro Display (sohne-var fallback)"
   ```

---

### Task A.5: Correct Toss skin font

**Files:**
- Modify: `data/skins/toss.json`

**Steps:**

1. Use Edit:
   - From: `"fonts": { "primary": "Inter", "mono": "DM Mono" }`
   - To: `"fonts": { "primary": "Pretendard", "mono": "JetBrains Mono" }`
2. Verify with Grep.
3. Commit:
   ```
   git add data/skins/toss.json
   git commit -m "fix(skins): correct Toss font to Pretendard (Korean-origin UI font)"
   ```

---

## Phase B — react-shadcn live write-back

### Task B.0: Add minimal test infrastructure

**Files:**
- Create: `tests/package.json`
- Create: `tests/.gitignore`
- Create: `tests/README.md`

**Steps:**

1. Create `tests/package.json`:
   ```json
   {
     "name": "design-engine-tests",
     "private": true,
     "type": "module",
     "scripts": {
       "test": "node --test --experimental-strip-types ./*.test.ts"
     }
   }
   ```
   Notes: `--experimental-strip-types` requires Node 22.6+. Older Node: install tsx (`npm i -D tsx`) and change script to `tsx --test ./*.test.ts`.

2. Create `tests/.gitignore`:
   ```
   node_modules/
   package-lock.json
   tmp/
   ```

3. Create `tests/README.md`:
   ```markdown
   # Tests

   Unit tests for the `theme-io` helper template that ships into user projects.

   ```bash
   cd tests
   npm test
   ```

   Requires Node 22.6+ for `--experimental-strip-types`. Older Node:

   ```bash
   npm i -D tsx
   npx tsx --test ./*.test.ts
   ```
   ```

4. Commit:
   ```
   git add tests/
   git commit -m "test: add minimal node --test infrastructure for theme-io helper"
   ```

---

### Task B.1: Create `theme-io` helper — types and CSS scanner

**Files:**
- Create: `adapters/react-shadcn/templates/theme-io.ts`

**Description:** The helper template that gets copied into user projects. The CSS parser is a small character-by-character scanner that's comment-aware and string-aware. It walks the file at depth 0 to find managed `:root` and `.dark` blocks. Token extraction within a block uses span offsets rather than regex replace, eliminating the brittleness of regex-on-CSS-text.

**Step 1:** Write the file with the full content shown in `plan-snippets/theme-io-part1.md` of this plan (see appendix at the bottom — the file content is too large to embed inline here without triggering format truncation; it's reproduced verbatim there).

For the executor's quick reference, the file exports:
- `MANAGED_COLOR_KEYS` — readonly tuple of 9 color keys
- `ColorKey`, `Mode`, `ColorTokens`, `TokenSet` — types
- `ParseError`, `WriteError`, `ParseResult`, `WriteResult` — discriminated unions
- `readTokens(themePath)` — async, returns ParseResult
- `parseTokens(css)` — sync, returns ParseResult; testable in isolation
- `scanTopLevelBlocks(css)` — exported for testing
- `scanDeclarations(body)` — exported for testing
- internal helpers for brace-matching, comment-skipping, string-skipping

**Step 2:** Use the inline content below as authoritative source (copy verbatim):

```ts
// Originally from bitjaru/styleseed (MIT) — see /LICENSE for full attribution.
// Ported to design-engine plugin under MIT.
//
// Generated by design-engine /design-settings-page
// Helper: parses and writes theme.css surgically; manages fonts.css @import block.
// Server-side only (Node fs). Never imported from client code.

import { readFile, writeFile, rename } from 'node:fs/promises';

export const MANAGED_COLOR_KEYS = [
  'brand', 'primary', 'background', 'card', 'foreground',
  'destructive', 'success', 'warning', 'info'
] as const;

export type ColorKey = typeof MANAGED_COLOR_KEYS[number];
export type Mode = 'light' | 'dark';
export type ColorTokens = { [K in ColorKey]: string };
export type TokenSet = {
  light: ColorTokens;
  dark: ColorTokens;
  font: string;
};

export type ParseError = 'no_root_block' | 'ambiguous_root' | 'ambiguous_dark' | 'duplicate_decl' | 'read_failed';
export type WriteError = ParseError | 'no_dark_block' | 'write_failed';
export type ParseResult = { ok: true; tokens: TokenSet } | { ok: false; error: ParseError; message: string };
export type WriteResult = { ok: true; tokens: TokenSet } | { ok: false; error: WriteError; message: string };

const MANAGED_VAR_NAMES = [...MANAGED_COLOR_KEYS, 'font-primary'] as const;
const FALLBACK_COLORS: ColorTokens = {
  brand: '#721FE5', primary: '#030213', background: '#FAFAFA', card: '#FFFFFF',
  foreground: '#2A2A2A', destructive: '#d4183d', success: '#6B9B7A',
  warning: '#D97706', info: '#3B82F6',
};
const FALLBACK_FONT = 'Inter';

export async function readTokens(themePath: string): Promise<ParseResult> {
  let raw: string;
  try { raw = await readFile(themePath, 'utf8'); }
  catch (e) { return { ok: false, error: 'read_failed', message: String(e) }; }
  return parseTokens(raw);
}

export function parseTokens(css: string): ParseResult {
  const blocks = scanTopLevelBlocks(css);
  const rootBlocks = blocks.filter(b => b.selector === ':root' && blockContainsManagedToken(css, b));
  const darkBlocks = blocks.filter(b => b.selector === '.dark' && blockContainsManagedToken(css, b));

  if (rootBlocks.length === 0) return { ok: false, error: 'no_root_block', message: 'No top-level :root block contains managed tokens.' };
  if (rootBlocks.length > 1) return { ok: false, error: 'ambiguous_root', message: `Multiple top-level :root blocks contain managed tokens (${rootBlocks.length}).` };
  if (darkBlocks.length > 1) return { ok: false, error: 'ambiguous_dark', message: `Multiple top-level .dark blocks contain managed tokens (${darkBlocks.length}).` };

  const lightBody = css.slice(rootBlocks[0].bodyStart, rootBlocks[0].bodyEnd);
  const lightDecls = scanDeclarations(lightBody);
  if (hasDuplicates(lightDecls)) return { ok: false, error: 'duplicate_decl', message: 'Duplicate managed variable in :root block.' };

  const lightColors: ColorTokens = { ...FALLBACK_COLORS };
  let font = FALLBACK_FONT;
  for (const d of lightDecls) {
    if ((MANAGED_COLOR_KEYS as readonly string[]).includes(d.name)) (lightColors as any)[d.name] = d.value;
    else if (d.name === 'font-primary') font = parseFontPrimary(d.value);
  }

  let darkColors: ColorTokens = { ...lightColors };
  if (darkBlocks.length === 1) {
    const darkBody = css.slice(darkBlocks[0].bodyStart, darkBlocks[0].bodyEnd);
    const darkDecls = scanDeclarations(darkBody);
    if (hasDuplicates(darkDecls)) return { ok: false, error: 'duplicate_decl', message: 'Duplicate managed variable in .dark block.' };
    for (const d of darkDecls) {
      if ((MANAGED_COLOR_KEYS as readonly string[]).includes(d.name)) (darkColors as any)[d.name] = d.value;
    }
  }

  return { ok: true, tokens: { light: lightColors, dark: darkColors, font } };
}

export type Block = { selector: ':root' | '.dark'; headerStart: number; bodyStart: number; bodyEnd: number };

export function scanTopLevelBlocks(css: string): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  let depth = 0;

  while (i < css.length) {
    const c = css[i];

    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }

    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { depth--; i++; continue; }

    if (depth === 0) {
      const remaining = css.slice(i);
      const rootMatch = remaining.match(/^:root(?=\s*\{)/);
      const darkMatch = remaining.match(/^\.dark(?=\s*\{)/);
      const match = rootMatch ?? darkMatch;
      if (match) {
        const headerStart = i;
        const openIdx = css.indexOf('{', i);
        if (openIdx === -1) break;
        const closeIdx = findMatchingBrace(css, openIdx);
        if (closeIdx === -1) break;
        blocks.push({
          selector: rootMatch ? ':root' : '.dark',
          headerStart,
          bodyStart: openIdx + 1,
          bodyEnd: closeIdx,
        });
        i = closeIdx + 1;
        continue;
      }
    }

    i++;
  }
  return blocks;
}

function findMatchingBrace(css: string, openIdx: number): number {
  let depth = 1;
  let i = openIdx + 1;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

export type Declaration = {
  name: string;
  value: string;
  valueStart: number;
  valueEnd: number;
};

export function scanDeclarations(body: string): Declaration[] {
  const decls: Declaration[] = [];
  let i = 0;
  while (i < body.length) {
    const c = body[i];
    if (c === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2);
      i = end === -1 ? body.length : end + 2;
      continue;
    }
    // Skip strings — declaration values like `content: "--brand: #fff"` must not register as managed declarations.
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      while (i < body.length && body[i] !== quote) {
        if (body[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === '-' && body[i + 1] === '-') {
      const decl = parseDeclarationAt(body, i);
      if (decl && (MANAGED_VAR_NAMES as readonly string[]).includes(decl.name)) {
        decls.push(decl);
        i = decl.valueEnd + 1;
        continue;
      }
    }
    i++;
  }
  return decls;
}

function parseDeclarationAt(body: string, start: number): Declaration | null {
  const colonIdx = findColonSkippingCommentsAndStrings(body, start);
  if (colonIdx === -1) return null;
  const name = body.slice(start + 2, colonIdx).trim();
  if (!/^[a-z][a-z0-9-]*$/i.test(name)) return null;
  let valueStart = colonIdx + 1;
  while (valueStart < body.length && /\s/.test(body[valueStart])) valueStart++;
  const semiIdx = findSemicolonSkippingStrings(body, valueStart);
  if (semiIdx === -1) return null;
  const value = body.slice(valueStart, semiIdx).trim();
  return { name, value, valueStart, valueEnd: semiIdx };
}

function findColonSkippingCommentsAndStrings(body: string, from: number): number {
  let i = from;
  while (i < body.length) {
    const c = body[i];
    if (c === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2);
      i = end === -1 ? body.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      while (i < body.length && body[i] !== quote) {
        if (body[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === ':') return i;
    if (c === ';' || c === '{' || c === '}' || c === '\n') return -1;
    i++;
  }
  return -1;
}

function findSemicolonSkippingStrings(body: string, from: number): number {
  let i = from;
  while (i < body.length) {
    const c = body[i];
    if (c === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2);
      i = end === -1 ? body.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      while (i < body.length && body[i] !== quote) {
        if (body[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === ';' || c === '}') return c === ';' ? i : -1;
    i++;
  }
  return -1;
}

function blockContainsManagedToken(css: string, block: Block): boolean {
  const body = css.slice(block.bodyStart, block.bodyEnd);
  return scanDeclarations(body).length > 0;
}

function hasDuplicates(decls: Declaration[]): boolean {
  const seen = new Set<string>();
  for (const d of decls) {
    if (seen.has(d.name)) return true;
    seen.add(d.name);
  }
  return false;
}

function parseFontPrimary(raw: string): string {
  const first = raw.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}
```

**Step 3:** Verify TypeScript syntax:
```
npx --yes tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck adapters/react-shadcn/templates/theme-io.ts
```
Expected: no output (clean compile).

**Step 4:** Commit:
```
git add adapters/react-shadcn/templates/theme-io.ts
git commit -m "feat(theme-io): add comment-safe CSS scanner + parseTokens/readTokens"
```

---

### Task B.2: Tests for `parseTokens` covering edge cases

**Files:**
- Create: `tests/theme-io.parse.test.ts`
- Create: `tests/fixtures/theme-standard.css`
- Create: `tests/fixtures/theme-with-comments.css`
- Create: `tests/fixtures/theme-no-managed.css`
- Create: `tests/fixtures/theme-comment-with-managed-syntax.css`
- Create: `tests/fixtures/theme-string-with-managed-syntax.css`
- Create: `tests/fixtures/theme-nested-media.css`
- Create: `tests/fixtures/theme-dark-no-font.css`

**Step 1:** Create the 6 fixture files. Contents (each is its own file):

**`tests/fixtures/theme-standard.css`:**
```css
:root {
  --brand: #721FE5;
  --primary: #030213;
  --background: #FAFAFA;
  --card: #FFFFFF;
  --foreground: #2A2A2A;
  --destructive: #d4183d;
  --success: #6B9B7A;
  --warning: #D97706;
  --info: #3B82F6;
  --font-primary: 'Inter', system-ui, sans-serif;
}

.dark {
  --brand: #ffffff;
  --primary: #ededed;
  --background: #0a0a0a;
  --card: #141414;
  --foreground: #ededed;
  --destructive: #ff6b61;
  --success: #3b8ff0;
  --warning: #fbbf24;
  --info: #3b8ff0;
}
```

**`tests/fixtures/theme-with-comments.css`:**
```css
/* Top-level comment */
:root {
  /* Brand color — primary identity */
  --brand: #533afd;
  --primary: #061b31;
  --custom-thing: 42px; /* unmanaged — should be preserved */
  --background: #ffffff;
  --card: #ffffff;
  --foreground: #061b31;
  --destructive: #ea2261;
  --success: #15be53;
  --warning: #9b6829;
  --info: #2874ad;
  --font-primary: 'Geist', system-ui, sans-serif;
  --my-other-thing: blue;
}
```

**`tests/fixtures/theme-no-managed.css`:**
```css
:root {
  --custom-only: red;
}
```

**`tests/fixtures/theme-comment-with-managed-syntax.css`:**
```css
:root {
  /* note: don't set --brand: #ffffff; here, use the one below */
  --brand: #533afd;
  --primary: #061b31;
  --background: #ffffff;
  --card: #ffffff;
  --foreground: #061b31;
  --destructive: #ea2261;
  --success: #15be53;
  --warning: #9b6829;
  --info: #2874ad;
}
```

**`tests/fixtures/theme-string-with-managed-syntax.css`:**
```css
:root {
  content: "--brand: #fff";
  --brand: #533afd;
  --primary: #061b31;
  --background: #ffffff;
  --card: #ffffff;
  --foreground: #061b31;
  --destructive: #ea2261;
  --success: #15be53;
  --warning: #9b6829;
  --info: #2874ad;
}
```

**`tests/fixtures/theme-nested-media.css`:**
```css
:root {
  --brand: #721FE5;
  --primary: #030213;
  --background: #FAFAFA;
  --card: #FFFFFF;
  --foreground: #2A2A2A;
  --destructive: #d4183d;
  --success: #6B9B7A;
  --warning: #D97706;
  --info: #3B82F6;
}

@media (prefers-color-scheme: dark) {
  :root {
    --brand: #ffffff;
  }
}
```

**`tests/fixtures/theme-dark-no-font.css`:**
```css
:root {
  --brand: #721FE5;
  --primary: #030213;
  --background: #FAFAFA;
  --card: #FFFFFF;
  --foreground: #2A2A2A;
  --destructive: #d4183d;
  --success: #6B9B7A;
  --warning: #D97706;
  --info: #3B82F6;
  --font-primary: 'Geist', system-ui;
}

.dark {
  --brand: #ffffff;
  --background: #000000;
}
```

**Step 2:** Create `tests/theme-io.parse.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readTokens, parseTokens } from '../adapters/react-shadcn/templates/theme-io.ts';
import { readFile } from 'node:fs/promises';

const here = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(here, 'fixtures', name);

test('parseTokens handles standard light + dark', async () => {
  const css = await readFile(fix('theme-standard.css'), 'utf8');
  const result = parseTokens(css);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.tokens.light.brand, '#721FE5');
  assert.equal(result.tokens.dark.brand, '#ffffff');
  assert.equal(result.tokens.font, 'Inter');
});

test('parseTokens preserves font name from quoted value', async () => {
  const css = await readFile(fix('theme-with-comments.css'), 'utf8');
  const result = parseTokens(css);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.tokens.font, 'Geist');
  assert.equal(result.tokens.light.brand, '#533afd');
});

test('parseTokens fails closed when no :root has managed tokens', async () => {
  const css = await readFile(fix('theme-no-managed.css'), 'utf8');
  const result = parseTokens(css);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error, 'no_root_block');
});

test('parseTokens ignores managed-token syntax inside comments', async () => {
  const css = await readFile(fix('theme-comment-with-managed-syntax.css'), 'utf8');
  const result = parseTokens(css);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.tokens.light.brand, '#533afd');
});

test('parseTokens ignores managed-token syntax inside quoted strings', async () => {
  const css = await readFile(fix('theme-string-with-managed-syntax.css'), 'utf8');
  const result = parseTokens(css);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  // The real --brand declaration should be picked up, not the one inside content: "..."
  assert.equal(result.tokens.light.brand, '#533afd');
});

test('parseTokens ignores nested :root inside @media', async () => {
  const css = await readFile(fix('theme-nested-media.css'), 'utf8');
  const result = parseTokens(css);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.tokens.light.brand, '#721FE5');
  assert.equal(result.tokens.dark.brand, '#721FE5');
});

test('parseTokens dark inherits unspecified fields from light', async () => {
  const css = await readFile(fix('theme-dark-no-font.css'), 'utf8');
  const result = parseTokens(css);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.tokens.font, 'Geist');
  assert.equal(result.tokens.dark.brand, '#ffffff');
  assert.equal(result.tokens.dark.background, '#000000');
  assert.equal(result.tokens.dark.primary, '#030213');
  assert.equal(result.tokens.dark.success, '#6B9B7A');
});

test('readTokens fails closed on missing file', async () => {
  const result = await readTokens(fix('does-not-exist.css'));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error, 'read_failed');
});
```

**Step 3:** Run tests:
```
cd tests && npm test && cd ..
```
Expected: 8 tests pass.

**Step 4:** Commit:
```
git add tests/
git commit -m "test(theme-io): cover parseTokens edge cases — comments, strings, nested media, inheritance"
```

---

### Task B.3: `theme-io` — write function with span-based replacement and atomic-rename retry

**Files:**
- Modify: `adapters/react-shadcn/templates/theme-io.ts`

**Step 1:** Append to the file:

```ts
async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const tmp = filePath + '.tmp';
  await writeFile(tmp, contents, 'utf8');
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await rename(tmp, filePath);
      return;
    } catch (e: any) {
      lastErr = e;
      if (e?.code !== 'EBUSY' && e?.code !== 'EPERM' && e?.code !== 'EACCES') throw e;
      await new Promise(r => setTimeout(r, 50));
    }
  }
  throw lastErr;
}

export async function writeTokens(themePath: string, mode: Mode, colors: ColorTokens, font?: string): Promise<WriteResult> {
  let raw: string;
  try { raw = await readFile(themePath, 'utf8'); }
  catch (e) { return { ok: false, error: 'read_failed', message: String(e) }; }

  const blocks = scanTopLevelBlocks(raw);
  const targetSelector = mode === 'light' ? ':root' : '.dark';
  const targets = blocks.filter(b => b.selector === targetSelector && blockContainsManagedToken(raw, b));

  if (targets.length === 0) return { ok: false, error: mode === 'light' ? 'no_root_block' : 'no_dark_block', message: `No ${targetSelector} block with managed tokens.` };
  if (targets.length > 1) return { ok: false, error: mode === 'light' ? 'ambiguous_root' : 'ambiguous_dark', message: `Multiple ${targetSelector} blocks with managed tokens.` };

  const block = targets[0];
  const bodyStart = block.bodyStart;
  const bodyEnd = block.bodyEnd;
  const body = raw.slice(bodyStart, bodyEnd);
  const decls = scanDeclarations(body);

  const wantedReplacements = new Map<string, string>();
  for (const k of MANAGED_COLOR_KEYS) wantedReplacements.set(k, colors[k]);
  if (mode === 'light' && font !== undefined) wantedReplacements.set('font-primary', formatFontPrimary(font));

  const allKeys: readonly string[] = mode === 'light' ? [...MANAGED_COLOR_KEYS, 'font-primary'] : MANAGED_COLOR_KEYS;

  let newBody = body;
  const orderedExisting = decls
    .filter(d => wantedReplacements.has(d.name))
    .sort((a, b) => b.valueStart - a.valueStart);
  for (const d of orderedExisting) {
    const newValue = wantedReplacements.get(d.name)!;
    newBody = newBody.slice(0, d.valueStart) + newValue + newBody.slice(d.valueEnd);
    wantedReplacements.delete(d.name);
  }

  if (wantedReplacements.size > 0) {
    const trailingMatch = newBody.match(/(\s*)$/);
    const trailing = trailingMatch?.[1] ?? '';
    const insertAt = newBody.length - trailing.length;
    const missing = Array.from(wantedReplacements.entries())
      .filter(([k]) => allKeys.includes(k))
      .map(([k, v]) => `\n  --${k}: ${v};`)
      .join('');
    newBody = newBody.slice(0, insertAt) + missing + newBody.slice(insertAt);
  }

  const newRaw = raw.slice(0, bodyStart) + newBody + raw.slice(bodyEnd);

  try { await atomicWrite(themePath, newRaw); }
  catch (e) { return { ok: false, error: 'write_failed', message: String(e) }; }

  const reread = await readTokens(themePath);
  if (!reread.ok) return { ok: false, error: 'write_failed', message: 'Wrote file but failed to re-read: ' + reread.message };
  return { ok: true, tokens: reread.tokens };
}

function formatFontPrimary(name: string): string {
  const needsQuotes = /[^a-zA-Z0-9-]/.test(name);
  const quoted = needsQuotes ? `'${name}'` : name;
  return `${quoted}, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
}
```

**Step 2:** Verify TypeScript:
```
npx --yes tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck adapters/react-shadcn/templates/theme-io.ts
```

**Step 3:** Commit:
```
git add adapters/react-shadcn/templates/theme-io.ts
git commit -m "feat(theme-io): add writeTokens with span-based edits + Windows-safe atomic rename"
```

---

### Task B.4: Tests for `writeTokens` round-trip

**Files:**
- Create: `tests/theme-io.write.test.ts`

**Step 1:** Write the test file:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdir, copyFile, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readTokens, writeTokens } from '../adapters/react-shadcn/templates/theme-io.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(here, 'fixtures', name);
const TMP = join(here, 'tmp');

async function workingCopy(srcName: string): Promise<string> {
  await mkdir(TMP, { recursive: true });
  const dest = join(TMP, srcName);
  await copyFile(fix(srcName), dest);
  return dest;
}

test('writeTokens light mode replaces colors and font in :root', async (t) => {
  const path = await workingCopy('theme-standard.css');
  t.after(() => rm(TMP, { recursive: true, force: true }));

  const before = await readTokens(path);
  if (!before.ok) throw new Error('precondition');

  const newColors = { ...before.tokens.light, brand: '#ff0000' };
  const result = await writeTokens(path, 'light', newColors, 'Geist');
  assert.equal(result.ok, true);

  const after = await readTokens(path);
  if (!after.ok) throw new Error('postcondition');
  assert.equal(after.tokens.light.brand, '#ff0000');
  assert.equal(after.tokens.font, 'Geist');
  assert.equal(after.tokens.dark.brand, '#ffffff');
});

test('writeTokens dark mode replaces values in .dark block only', async (t) => {
  const path = await workingCopy('theme-standard.css');
  t.after(() => rm(TMP, { recursive: true, force: true }));

  const before = await readTokens(path);
  if (!before.ok) throw new Error('precondition');

  const newColors = { ...before.tokens.dark, brand: '#abcdef' };
  const result = await writeTokens(path, 'dark', newColors);
  assert.equal(result.ok, true);

  const after = await readTokens(path);
  if (!after.ok) throw new Error('postcondition');
  assert.equal(after.tokens.dark.brand, '#abcdef');
  assert.equal(after.tokens.light.brand, '#721FE5');
});

test('writeTokens preserves comments and unmanaged variables', async (t) => {
  const path = await workingCopy('theme-with-comments.css');
  t.after(() => rm(TMP, { recursive: true, force: true }));

  const before = await readTokens(path);
  if (!before.ok) throw new Error('precondition');

  const newColors = { ...before.tokens.light, brand: '#newcolor' };
  await writeTokens(path, 'light', newColors);

  const raw = await readFile(path, 'utf8');
  assert.match(raw, /\/\* Brand color — primary identity \*\//);
  assert.match(raw, /--custom-thing: 42px; \/\* unmanaged — should be preserved \*\//);
  assert.match(raw, /--my-other-thing: blue;/);
  assert.match(raw, /--brand: #newcolor;/);
});

test('writeTokens does not touch comment-disguised declarations', async (t) => {
  const path = await workingCopy('theme-comment-with-managed-syntax.css');
  t.after(() => rm(TMP, { recursive: true, force: true }));

  const before = await readTokens(path);
  if (!before.ok) throw new Error('precondition');

  const newColors = { ...before.tokens.light, brand: '#newvalue' };
  await writeTokens(path, 'light', newColors);

  const raw = await readFile(path, 'utf8');
  assert.match(raw, /\/\* note: don't set --brand: #ffffff; here, use the one below \*\//);
  assert.match(raw, /^\s*--brand: #newvalue;/m);
});

test('writeTokens appends missing managed variable instead of replacing', async (t) => {
  const path = await workingCopy('theme-dark-no-font.css');
  t.after(() => rm(TMP, { recursive: true, force: true }));

  const before = await readTokens(path);
  if (!before.ok) throw new Error('precondition');

  const fullDark = { ...before.tokens.dark, primary: '#abcabc' };
  const result = await writeTokens(path, 'dark', fullDark);
  assert.equal(result.ok, true);

  const after = await readTokens(path);
  if (!after.ok) throw new Error('postcondition');
  assert.equal(after.tokens.dark.primary, '#abcabc');
  assert.equal(after.tokens.dark.brand, '#ffffff');
});
```

**Step 2:** Run tests:
```
cd tests && npm test && cd ..
```
Expected: 8 prior + 5 new = 13 tests pass.

**Step 3:** Commit:
```
git add tests/theme-io.write.test.ts
git commit -m "test(theme-io): cover writeTokens round-trip + comment-safety + missing-var append"
```

---

### Task B.5: `theme-io` — managed `@import` block management for `fonts.css`

**Files:**
- Modify: `adapters/react-shadcn/templates/theme-io.ts`

**Step 1:** Append:

```ts
export type FontImportEntry = {
  name: string;
  url: string;
};

const FONT_BLOCK_START = '/* design-engine: managed-font-imports:start */';
const FONT_BLOCK_END = '/* design-engine: managed-font-imports:end */';

export type FontImportResult = { ok: true } | { ok: false; error: string; message: string };

export async function writeFontImports(fontsPath: string, entries: FontImportEntry[]): Promise<FontImportResult> {
  let raw: string;
  try { raw = await readFile(fontsPath, 'utf8'); }
  catch (e) { return { ok: false, error: 'read_failed', message: String(e) }; }

  const newBlock = renderFontImportBlock(entries);
  const startIdx = raw.indexOf(FONT_BLOCK_START);
  const endIdx = raw.indexOf(FONT_BLOCK_END);

  let newRaw: string;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const blockEnd = endIdx + FONT_BLOCK_END.length;
    newRaw = raw.slice(0, startIdx) + newBlock + raw.slice(blockEnd);
  } else {
    newRaw = newBlock + '\n\n' + raw;
  }

  try { await atomicWrite(fontsPath, newRaw); }
  catch (e) { return { ok: false, error: 'write_failed', message: String(e) }; }
  return { ok: true };
}

function renderFontImportBlock(entries: FontImportEntry[]): string {
  const lines = entries.map(e => `@import url('${e.url}');`).join('\n');
  return `${FONT_BLOCK_START}\n${lines}${lines ? '\n' : ''}${FONT_BLOCK_END}`;
}

export function buildGoogleFontsUrl(family: string, weights?: number[], axisRange?: string): string {
  const familyParam = family.replace(/ /g, '+');
  let suffix = '';
  if (axisRange) suffix = `:wght@${axisRange}`;
  else if (weights && weights.length) suffix = `:wght@${weights.join(';')}`;
  return `https://fonts.googleapis.com/css2?family=${familyParam}${suffix}&display=swap`;
}
```

**Step 2:** Verify TypeScript.

**Step 3:** Commit:
```
git add adapters/react-shadcn/templates/theme-io.ts
git commit -m "feat(theme-io): add writeFontImports + buildGoogleFontsUrl"
```

---

### Task B.6: Tests for font import management

**Files:**
- Create: `tests/theme-io.fonts.test.ts`
- Create: `tests/fixtures/fonts-with-block.css`
- Create: `tests/fixtures/fonts-no-block.css`

**Step 1:** Create `tests/fixtures/fonts-with-block.css`:
```css
/* design-engine: managed-font-imports:start */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
/* design-engine: managed-font-imports:end */

body {
  font-family: var(--font-primary), system-ui, sans-serif;
}
```

**Step 2:** Create `tests/fixtures/fonts-no-block.css`:
```css
body {
  font-family: 'Inter', sans-serif;
}
```

**Step 3:** Create `tests/theme-io.fonts.test.ts`:
```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdir, copyFile, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFontImports, buildGoogleFontsUrl } from '../adapters/react-shadcn/templates/theme-io.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(here, 'fixtures', name);
const TMP = join(here, 'tmp');

async function workingCopy(name: string): Promise<string> {
  await mkdir(TMP, { recursive: true });
  const dest = join(TMP, name);
  await copyFile(fix(name), dest);
  return dest;
}

test('buildGoogleFontsUrl: single weight', () => {
  assert.equal(buildGoogleFontsUrl('Pacifico'), 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
});

test('buildGoogleFontsUrl: multiple weights', () => {
  assert.equal(buildGoogleFontsUrl('Inter', [400, 500, 700]), 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
});

test('buildGoogleFontsUrl: variable axis range', () => {
  assert.equal(buildGoogleFontsUrl('Inter', undefined, '100..900'), 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
});

test('buildGoogleFontsUrl: encodes spaces', () => {
  assert.equal(buildGoogleFontsUrl('Plus Jakarta Sans', [400, 700]), 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap');
});

test('writeFontImports replaces existing managed block', async (t) => {
  const path = await workingCopy('fonts-with-block.css');
  t.after(() => rm(TMP, { recursive: true, force: true }));
  await writeFontImports(path, [{ name: 'Geist', url: buildGoogleFontsUrl('Geist', [400, 500, 600, 700]) }]);
  const raw = await readFile(path, 'utf8');
  assert.match(raw, /family=Geist:wght@400;500;600;700/);
  assert.doesNotMatch(raw, /family=Inter/);
  assert.match(raw, /body \{[\s\S]*var\(--font-primary\)/);
});

test('writeFontImports prepends block when missing', async (t) => {
  const path = await workingCopy('fonts-no-block.css');
  t.after(() => rm(TMP, { recursive: true, force: true }));
  await writeFontImports(path, [{ name: 'Inter', url: buildGoogleFontsUrl('Inter', [400, 700]) }]);
  const raw = await readFile(path, 'utf8');
  assert.match(raw, /^\/\* design-engine: managed-font-imports:start \*\//);
  assert.match(raw, /body \{/);
});

test('writeFontImports clears block when given empty list', async (t) => {
  const path = await workingCopy('fonts-with-block.css');
  t.after(() => rm(TMP, { recursive: true, force: true }));
  await writeFontImports(path, []);
  const raw = await readFile(path, 'utf8');
  assert.match(raw, /managed-font-imports:start \*\/\s*\/\* design-engine: managed-font-imports:end/);
});
```

**Step 4:** Run tests:
```
cd tests && npm test && cd ..
```
Expected: 13 prior + 7 new = 20 tests pass.

**Step 5:** Commit:
```
git add tests/theme-io.fonts.test.ts tests/fixtures/fonts-*.css
git commit -m "test(theme-io): cover writeFontImports + buildGoogleFontsUrl"
```

---

### Task B.7: Vite plugin — base structure + JSON API

**Files:**
- Create: `adapters/react-shadcn/templates/vite-plugin-design-engine.ts`

**Description:** A Connect-style middleware on the Vite dev server that owns `/__design/*`. Handles HTML page serving, asset serving (the page JS), and the GET/POST API. Calls `next()` for non-matching paths so the rest of Vite's middleware chain still works.

**Step 1:** Write the file:

```ts
// Originally from bitjaru/styleseed (MIT) — see /LICENSE for full attribution.
// Ported to design-engine plugin under MIT.
//
// Generated by design-engine /design-settings-page
// Vite plugin: serves the design-engine settings page and token API at /__design/*
// Dev-only: configureServer is not called during production builds.

import type { Plugin, ViteDevServer } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import {
  readTokens, writeTokens, writeFontImports, buildGoogleFontsUrl,
  type Mode, type ColorTokens
} from './theme-io';

export type DesignEnginePluginOptions = {
  themePath?: string;
  fontsPath?: string;
};

const DEFAULT_THEME = 'src/styles/theme.css';
const DEFAULT_FONTS = 'src/styles/fonts.css';

export default function designEnginePlugin(options: DesignEnginePluginOptions = {}): Plugin {
  const themePath = options.themePath ?? DEFAULT_THEME;
  const fontsPath = options.fontsPath ?? DEFAULT_FONTS;
  const here = dirname(fileURLToPath(import.meta.url));

  return {
    name: 'design-engine-settings',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const root = server.config.root;
      const fullThemePath = resolve(root, themePath);
      const fullFontsPath = resolve(root, fontsPath);

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';

        if (!url.startsWith('/__design')) return next();

        if (url === '/__design') {
          res.statusCode = 302;
          res.setHeader('location', '/__design/');
          res.end();
          return;
        }

        if (url === '/__design/' && req.method === 'GET') {
          const html = await readFile(resolve(here, '__design-page.html'), 'utf8');
          res.statusCode = 200;
          res.setHeader('content-type', 'text/html; charset=utf-8');
          res.end(html);
          return;
        }

        if (url === '/__design/page.js' && req.method === 'GET') {
          const js = await readFile(resolve(here, '__design-page.js'), 'utf8');
          res.statusCode = 200;
          res.setHeader('content-type', 'text/javascript; charset=utf-8');
          res.end(js);
          return;
        }

        if (url === '/__design/api/tokens' && req.method === 'GET') {
          const result = await readTokens(fullThemePath);
          res.setHeader('content-type', 'application/json');
          if (result.ok) {
            res.end(JSON.stringify(result.tokens));
          } else {
            res.statusCode = 409;
            res.end(JSON.stringify({ error: result.error, message: result.message }));
          }
          return;
        }

        if (url === '/__design/api/tokens' && req.method === 'POST') {
          let body = '';
          req.setEncoding('utf8');
          for await (const chunk of req) body += chunk;
          let parsed: { mode: Mode; colors: ColorTokens; font?: string; fontImport?: { name: string; weights?: number[]; axisRange?: string } | null };
          try {
            parsed = JSON.parse(body);
          } catch {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'bad_request', message: 'Invalid JSON' }));
            return;
          }

          const writeResult = await writeTokens(fullThemePath, parsed.mode, parsed.colors, parsed.font);
          if (!writeResult.ok) {
            res.statusCode = 409;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: writeResult.error, message: writeResult.message }));
            return;
          }

          if (parsed.fontImport && parsed.fontImport.name) {
            const importUrl = buildGoogleFontsUrl(parsed.fontImport.name, parsed.fontImport.weights, parsed.fontImport.axisRange);
            const fontResult = await writeFontImports(fullFontsPath, [{ name: parsed.fontImport.name, url: importUrl }]);
            if (!fontResult.ok) {
              res.statusCode = 207;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: 'font_write_failed', message: fontResult.message, tokens: writeResult.tokens }));
              return;
            }
          } else if (parsed.fontImport === null) {
            const fontResult = await writeFontImports(fullFontsPath, []);
            if (!fontResult.ok) {
              res.statusCode = 207;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: 'font_write_failed', message: fontResult.message, tokens: writeResult.tokens }));
              return;
            }
          }

          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true, tokens: writeResult.tokens }));
          return;
        }

        if (url === '/__design/api/tokens' || url === '/__design/' || url === '/__design/page.js') {
          res.statusCode = 405;
          res.end();
          return;
        }

        res.statusCode = 404;
        res.end();
      });
    },
  };
}
```

**Step 2:** Verify TypeScript syntax (errors about missing 'vite' module are expected — Vite isn't a dep of the plugin repo).

**Step 3:** Commit:
```
git add adapters/react-shadcn/templates/vite-plugin-design-engine.ts
git commit -m "feat(react-shadcn): add Vite plugin owning /__design/* (HTML + JSON API)"
```

---

### Task B.8: Settings page HTML shell

**Files:**
- Create: `adapters/react-shadcn/templates/__design-page.html`

**Description:** HTML scaffold with embedded styles using CSS custom properties prefixed `--de-*` (to avoid clobbering user app vars). The settings page JS (next task) updates these vars on every keystroke for instant live preview. Body's font-family uses `var(--de-font-primary)`.

**Step 1:** Write the file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Design Engine Settings</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style id="de-tokens">
    :root {
      --de-brand: #721FE5;
      --de-primary: #030213;
      --de-background: #FAFAFA;
      --de-card: #FFFFFF;
      --de-foreground: #2A2A2A;
      --de-destructive: #d4183d;
      --de-success: #6B9B7A;
      --de-warning: #D97706;
      --de-info: #3B82F6;
      --de-font-primary: 'Inter', system-ui, sans-serif;
    }
    html.de-dark {
      --de-brand: #ffffff;
      --de-primary: #ededed;
      --de-background: #0a0a0a;
      --de-card: #141414;
      --de-foreground: #ededed;
      --de-destructive: #ff6b61;
      --de-success: #3b8ff0;
      --de-warning: #fbbf24;
      --de-info: #3b8ff0;
    }
    body {
      margin: 0;
      font-family: var(--de-font-primary);
      background: var(--de-background);
      color: var(--de-foreground);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .de-page { max-width: 900px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
    .de-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .de-title { font-size: 24px; font-weight: 700; margin: 0; }
    .de-subtitle { font-size: 14px; opacity: 0.7; margin: 4px 0 0 0; }
    .de-status { font-size: 12px; }
    .de-status-saving { opacity: 0.7; }
    .de-status-saved { color: var(--de-success); }
    .de-status-error { color: var(--de-destructive); }
    .de-mode-toggle { display: inline-flex; border: 1px solid color-mix(in oklab, var(--de-foreground) 20%, transparent); border-radius: 6px; overflow: hidden; }
    .de-mode-toggle button { padding: 6px 12px; font-size: 13px; background: transparent; color: inherit; border: none; cursor: pointer; }
    .de-mode-toggle button.active { background: var(--de-foreground); color: var(--de-background); }
    .de-card { background: var(--de-card); border: 1px solid color-mix(in oklab, var(--de-foreground) 10%, transparent); border-radius: 8px; padding: 24px; }
    .de-card h2 { font-size: 18px; font-weight: 700; margin: 0 0 16px 0; }
    .de-color-row { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
    .de-color-row label { width: 128px; font-family: ui-monospace, monospace; font-size: 13px; }
    .de-color-row input[type="color"] { width: 64px; height: 40px; border: none; padding: 0; background: transparent; cursor: pointer; }
    .de-color-row input[type="text"] { flex: 1; padding: 8px 12px; border: 1px solid color-mix(in oklab, var(--de-foreground) 20%, transparent); border-radius: 6px; font-family: ui-monospace, monospace; background: var(--de-background); color: var(--de-foreground); }
    .de-font-input { width: 100%; padding: 8px 12px; border: 1px solid color-mix(in oklab, var(--de-foreground) 20%, transparent); border-radius: 6px; font-family: ui-monospace, monospace; background: var(--de-background); color: var(--de-foreground); box-sizing: border-box; }
    .de-font-suggestions { position: absolute; z-index: 10; background: var(--de-card); border: 1px solid color-mix(in oklab, var(--de-foreground) 20%, transparent); border-radius: 6px; max-height: 256px; overflow-y: auto; left: 0; right: 0; top: 100%; margin-top: 4px; }
    .de-font-suggestions button { display: flex; justify-content: space-between; width: 100%; padding: 8px 12px; background: transparent; border: none; cursor: pointer; color: inherit; text-align: left; }
    .de-font-suggestions button:hover { background: color-mix(in oklab, var(--de-foreground) 5%, transparent); }
    .de-font-cat { font-size: 11px; opacity: 0.6; }
    .de-demo { display: flex; flex-direction: column; gap: 24px; }
    .de-demo-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .de-btn { padding: 6px 12px; border-radius: 6px; font-size: 13px; border: none; cursor: pointer; color: white; }
    .de-btn-brand { background: var(--de-brand); }
    .de-btn-primary { background: var(--de-primary); }
    .de-btn-destructive { background: var(--de-destructive); }
    .de-btn-outline { background: transparent; color: var(--de-foreground); border: 1px solid color-mix(in oklab, var(--de-foreground) 30%, transparent); }
    .de-chip { padding: 2px 8px; border-radius: 4px; font-size: 12px; color: white; }
    .de-chip-success { background: var(--de-success); }
    .de-chip-warning { background: var(--de-warning); }
    .de-chip-error { background: var(--de-destructive); }
    .de-chip-info { background: var(--de-info); }
    .de-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 480px; }
    .de-form input, .de-form select { padding: 8px 12px; border: 1px solid color-mix(in oklab, var(--de-foreground) 20%, transparent); border-radius: 6px; background: var(--de-background); color: var(--de-foreground); font-size: 14px; }
    .de-stat-card { background: var(--de-card); border: 1px solid color-mix(in oklab, var(--de-foreground) 10%, transparent); border-radius: 8px; padding: 16px; max-width: 320px; }
    .de-stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; opacity: 0.7; margin: 0; }
    .de-stat-value { font-size: 36px; font-weight: 700; margin: 4px 0; }
    .de-stat-delta { font-size: 13px; font-weight: 700; color: var(--de-success); margin: 0; }
    .de-pre { background: color-mix(in oklab, var(--de-foreground) 5%, transparent); padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 12px; font-family: ui-monospace, monospace; white-space: pre; }
    .de-error-box { background: var(--de-card); border: 1px solid var(--de-destructive); border-radius: 8px; padding: 24px; color: var(--de-destructive); }
    .de-loading { padding: 24px; font-size: 14px; }
    .de-relative { position: relative; }
  </style>
</head>
<body>
  <div id="de-root"></div>
  <script type="module" src="/__design/page.js"></script>
</body>
</html>
```

**Step 2:** Commit:
```
git add adapters/react-shadcn/templates/__design-page.html
git commit -m "feat(react-shadcn): add settings page HTML shell with token-driven CSS"
```

---

### Task B.9: Settings page TypeScript bundle

**Files:**
- Create: `adapters/react-shadcn/templates/__design-page.ts`

**Description:** Page logic. Uses safe DOM construction (`document.createElement` + `textContent` for user-provided values) rather than `innerHTML` with templated strings. State is module-scoped. Updates the `<style id="de-tokens">` on every keystroke for instant local preview; debounces server saves at 250ms with blur flush.

**Note on DOM safety:** All user-provided values (color hex codes from server, font names from autocomplete) are inserted via `textContent` or attribute setters — never via `innerHTML` with template strings. The HTML structure is constructed with `createElement` so there's no XSS surface even though server-returned values are technically "untrusted" data.

**Step 1:** Write the file:

```ts
// Generated by design-engine /design-settings-page
// Settings page logic — runs in the browser at /__design/

const MANAGED_COLOR_KEYS = ['brand', 'primary', 'background', 'card', 'foreground', 'destructive', 'success', 'warning', 'info'] as const;
type ColorKey = typeof MANAGED_COLOR_KEYS[number];
type Mode = 'light' | 'dark';
type ColorTokens = Record<ColorKey, string>;
type TokenSet = { light: ColorTokens; dark: ColorTokens; font: string };

type FontEntry = { family: string; category: string; weights?: number[] };

const OFFLINE_FONTS: FontEntry[] = [
  { family: 'Inter', category: 'sans-serif', weights: [400, 500, 600, 700, 800] },
  { family: 'Geist', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Pretendard', category: 'sans-serif', weights: [400, 500, 600, 700, 800] },
  { family: 'DM Sans', category: 'sans-serif', weights: [400, 500, 700] },
  { family: 'Manrope', category: 'sans-serif', weights: [400, 500, 600, 700, 800] },
  { family: 'Plus Jakarta Sans', category: 'sans-serif', weights: [400, 500, 600, 700, 800] },
  { family: 'IBM Plex Sans', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Roboto', category: 'sans-serif', weights: [400, 500, 700] },
  { family: 'Open Sans', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Source Sans 3', category: 'sans-serif', weights: [400, 600, 700] },
  { family: 'JetBrains Mono', category: 'monospace', weights: [400, 500, 700] },
  { family: 'Space Grotesk', category: 'sans-serif', weights: [400, 500, 700] },
  { family: 'Outfit', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Albert Sans', category: 'sans-serif', weights: [400, 500, 600, 700] },
];

let tokens: TokenSet | null = null;
let mode: Mode = 'light';
let saveTimer: number | null = null;
let pendingFontImport: { name: string; weights?: number[]; axisRange?: string } | null | undefined = undefined;
let lastSaveError: string | null = null;
let statusEl: HTMLElement | null = null;

const root = document.getElementById('de-root')!;
const tokensStyle = document.getElementById('de-tokens') as HTMLStyleElement;

bootstrap();

async function bootstrap() {
  try {
    const res = await fetch('/__design/api/tokens');
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(body.message ?? 'Failed to load tokens');
    }
    tokens = await res.json();
    render();
  } catch (e) {
    renderError(String((e as Error).message));
  }
}

function renderError(msg: string) {
  while (root.firstChild) root.removeChild(root.firstChild);
  const page = document.createElement('div');
  page.className = 'de-page';
  const title = document.createElement('h1');
  title.className = 'de-title';
  title.textContent = 'Design Engine Settings';
  const box = document.createElement('div');
  box.className = 'de-error-box';
  const p1 = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = 'Could not load theme.css';
  p1.appendChild(strong);
  const p2 = document.createElement('p');
  p2.textContent = msg;
  box.appendChild(p1);
  box.appendChild(p2);
  page.appendChild(title);
  page.appendChild(box);
  root.appendChild(page);
}

function render() {
  if (!tokens) {
    while (root.firstChild) root.removeChild(root.firstChild);
    const loading = document.createElement('div');
    loading.className = 'de-loading';
    loading.textContent = 'Loading...';
    root.appendChild(loading);
    return;
  }
  applyModeClass();
  updateTokensStyle();
  while (root.firstChild) root.removeChild(root.firstChild);
  root.appendChild(buildPage());
}

function applyModeClass() {
  if (mode === 'dark') document.documentElement.classList.add('de-dark');
  else document.documentElement.classList.remove('de-dark');
}

function updateTokensStyle() {
  if (!tokens) return;
  const lightLines = MANAGED_COLOR_KEYS.map(k => `  --de-${k}: ${tokens!.light[k]};`).join('\n');
  const darkLines = MANAGED_COLOR_KEYS.map(k => `  --de-${k}: ${tokens!.dark[k]};`).join('\n');
  const fontDecl = `  --de-font-primary: '${tokens.font}', system-ui, sans-serif;`;
  tokensStyle.textContent = `:root {\n${lightLines}\n${fontDecl}\n}\nhtml.de-dark {\n${darkLines}\n}\nbody { font-family: var(--de-font-primary); background: var(--de-background); color: var(--de-foreground); margin: 0; min-height: 100vh; }`;
}

function buildPage(): HTMLElement {
  if (!tokens) return document.createElement('div');
  const page = document.createElement('div');
  page.className = 'de-page';

  page.appendChild(buildHeader());
  page.appendChild(buildColorEditor());
  page.appendChild(buildFontPicker());
  page.appendChild(buildDemoShowcase());
  page.appendChild(buildCssFallback());

  return page;
}

function buildHeader(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'de-header';

  const left = document.createElement('div');
  const title = document.createElement('h1');
  title.className = 'de-title';
  title.textContent = 'Design Engine Settings';
  const subtitle = document.createElement('p');
  subtitle.className = 'de-subtitle';
  subtitle.textContent = 'Edit tokens — changes save and reload automatically.';
  left.appendChild(title);
  left.appendChild(subtitle);

  const right = document.createElement('div');
  right.style.display = 'flex';
  right.style.alignItems = 'center';
  right.style.gap = '12px';

  statusEl = document.createElement('span');
  statusEl.className = 'de-status';
  statusEl.id = 'de-status';
  right.appendChild(statusEl);

  if (lastSaveError) {
    const err = document.createElement('span');
    err.className = 'de-status de-status-error';
    err.textContent = `Error: ${lastSaveError}`;
    const retry = document.createElement('button');
    retry.textContent = 'Retry';
    retry.style.marginLeft = '8px';
    retry.addEventListener('click', () => { lastSaveError = null; flushSave(); });
    err.appendChild(retry);
    right.appendChild(err);
  }

  const toggle = document.createElement('div');
  toggle.className = 'de-mode-toggle';
  for (const m of ['light', 'dark'] as Mode[]) {
    const btn = document.createElement('button');
    btn.textContent = m === 'light' ? 'Light' : 'Dark';
    if (mode === m) btn.classList.add('active');
    btn.addEventListener('click', () => { mode = m; render(); });
    toggle.appendChild(btn);
  }
  right.appendChild(toggle);

  header.appendChild(left);
  header.appendChild(right);
  return header;
}

function buildColorEditor(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'de-card';
  const h2 = document.createElement('h2');
  h2.textContent = `Colors (${mode} mode)`;
  card.appendChild(h2);

  for (const key of MANAGED_COLOR_KEYS) {
    const row = document.createElement('div');
    row.className = 'de-color-row';

    const label = document.createElement('label');
    label.textContent = `--${key}`;

    const colorIn = document.createElement('input');
    colorIn.type = 'color';
    colorIn.value = tokens![mode][key];

    const textIn = document.createElement('input');
    textIn.type = 'text';
    textIn.value = tokens![mode][key];

    const onChange = (newValue: string) => {
      colorIn.value = newValue;
      textIn.value = newValue;
      updateColor(key, newValue);
    };
    colorIn.addEventListener('input', () => onChange(colorIn.value));
    textIn.addEventListener('input', () => onChange(textIn.value));
    colorIn.addEventListener('blur', () => flushSave());
    textIn.addEventListener('blur', () => flushSave());

    row.appendChild(label);
    row.appendChild(colorIn);
    row.appendChild(textIn);
    card.appendChild(row);
  }

  return card;
}

function buildFontPicker(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'de-card';
  const h2 = document.createElement('h2');
  h2.textContent = 'Font (shared across modes)';
  card.appendChild(h2);

  const wrap = document.createElement('div');
  wrap.className = 'de-relative';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'de-font-input';
  input.placeholder = 'Type a font name…';
  input.value = tokens!.font;
  input.autocomplete = 'off';

  const suggestions = document.createElement('div');
  suggestions.className = 'de-font-suggestions';
  suggestions.hidden = true;

  const renderSuggestions = (q: string) => {
    while (suggestions.firstChild) suggestions.removeChild(suggestions.firstChild);
    const ql = q.toLowerCase();
    const matches = OFFLINE_FONTS.filter(f => f.family.toLowerCase().includes(ql)).slice(0, 20);
    if (matches.length === 0) { suggestions.hidden = true; return; }
    suggestions.hidden = false;
    for (const f of matches) {
      const btn = document.createElement('button');
      const fam = document.createElement('span');
      fam.style.fontFamily = `'${f.family}', system-ui`;
      fam.textContent = f.family;
      const cat = document.createElement('span');
      cat.className = 'de-font-cat';
      cat.textContent = f.category;
      btn.appendChild(fam);
      btn.appendChild(cat);
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        input.value = f.family;
        updateFont(f.family, { name: f.family, weights: f.weights });
        suggestions.hidden = true;
        flushSave();
      });
      suggestions.appendChild(btn);
    }
  };

  input.addEventListener('focus', () => renderSuggestions(input.value));
  input.addEventListener('input', () => {
    renderSuggestions(input.value);
    updateFont(input.value, null);
  });
  input.addEventListener('blur', () => {
    const match = OFFLINE_FONTS.find(f => f.family.toLowerCase() === input.value.toLowerCase());
    if (match) updateFont(match.family, { name: match.family, weights: match.weights });
    else updateFont(input.value, null);
    setTimeout(() => { suggestions.hidden = true; }, 150);
    flushSave();
  });

  wrap.appendChild(input);
  wrap.appendChild(suggestions);
  card.appendChild(wrap);
  return card;
}

function buildDemoShowcase(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'de-card';
  const h2 = document.createElement('h2');
  h2.textContent = 'Live Preview';
  card.appendChild(h2);

  const demo = document.createElement('div');
  demo.className = 'de-demo';

  const typoSection = document.createElement('section');
  const h1 = document.createElement('h1');
  h1.style.cssText = 'font-size: 32px; font-weight: 700; margin: 0;';
  h1.textContent = 'Display heading';
  const sectionH2 = document.createElement('h2');
  sectionH2.style.cssText = 'font-size: 20px; font-weight: 600; margin: 8px 0;';
  sectionH2.textContent = 'Section heading';
  const para = document.createElement('p');
  para.style.cssText = 'font-size: 14px; margin: 8px 0;';
  para.textContent = 'Body paragraph showing how foreground color and the primary font interact at default reading size.';
  const small = document.createElement('p');
  small.style.cssText = 'font-size: 12px; opacity: 0.7; margin: 8px 0;';
  small.textContent = 'Small label / muted text';
  const code = document.createElement('code');
  code.style.cssText = 'font-size: 12px; padding: 2px 6px; background: color-mix(in oklab, var(--de-foreground) 10%, transparent); border-radius: 4px; font-family: ui-monospace, monospace;';
  code.textContent = 'inline code';
  typoSection.appendChild(h1);
  typoSection.appendChild(sectionH2);
  typoSection.appendChild(para);
  typoSection.appendChild(small);
  typoSection.appendChild(code);

  const buttonsRow = document.createElement('div');
  buttonsRow.className = 'de-demo-row';
  for (const [label, cls] of [['Brand', 'de-btn-brand'], ['Primary', 'de-btn-primary'], ['Destructive', 'de-btn-destructive'], ['Outline', 'de-btn-outline']] as const) {
    const b = document.createElement('button');
    b.className = `de-btn ${cls}`;
    b.textContent = label;
    buttonsRow.appendChild(b);
  }

  const chipsRow = document.createElement('div');
  chipsRow.className = 'de-demo-row';
  for (const [label, cls] of [['Success', 'de-chip-success'], ['Warning', 'de-chip-warning'], ['Error', 'de-chip-error'], ['Info', 'de-chip-info']] as const) {
    const c = document.createElement('span');
    c.className = `de-chip ${cls}`;
    c.textContent = label;
    chipsRow.appendChild(c);
  }

  const form = document.createElement('div');
  form.className = 'de-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Text input';
  const select = document.createElement('select');
  for (const opt of ['Option A', 'Option B']) {
    const o = document.createElement('option');
    o.textContent = opt;
    select.appendChild(o);
  }
  form.appendChild(input);
  form.appendChild(select);

  const stat = document.createElement('div');
  stat.className = 'de-stat-card';
  const statLabel = document.createElement('p');
  statLabel.className = 'de-stat-label';
  statLabel.textContent = 'REVENUE';
  const statValue = document.createElement('p');
  statValue.className = 'de-stat-value';
  statValue.textContent = '$48.2K';
  const statDelta = document.createElement('p');
  statDelta.className = 'de-stat-delta';
  statDelta.textContent = '+8.2% vs last month';
  stat.appendChild(statLabel);
  stat.appendChild(statValue);
  stat.appendChild(statDelta);

  demo.appendChild(typoSection);
  demo.appendChild(buttonsRow);
  demo.appendChild(chipsRow);
  demo.appendChild(form);
  demo.appendChild(stat);
  card.appendChild(demo);
  return card;
}

function buildCssFallback(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'de-card';
  const h2 = document.createElement('h2');
  h2.textContent = 'Generated CSS (fallback)';
  card.appendChild(h2);
  const note = document.createElement('p');
  note.style.cssText = 'font-size: 12px; opacity: 0.7; margin: 0 0 12px 0;';
  note.textContent = 'Live write-back is active. Use this snippet for sharing or as a fallback.';
  card.appendChild(note);
  const pre = document.createElement('pre');
  pre.className = 'de-pre';
  pre.id = 'de-css-output';
  pre.textContent = generateCss();
  card.appendChild(pre);
  const copy = document.createElement('button');
  copy.className = 'de-btn de-btn-outline';
  copy.style.marginTop = '12px';
  copy.textContent = 'Copy CSS';
  copy.addEventListener('click', () => navigator.clipboard.writeText(generateCss()));
  card.appendChild(copy);
  return card;
}

function generateCss(): string {
  if (!tokens) return '';
  const lightLines = MANAGED_COLOR_KEYS.map(k => `  --${k}: ${tokens!.light[k]};`).join('\n');
  const darkLines = MANAGED_COLOR_KEYS.map(k => `  --${k}: ${tokens!.dark[k]};`).join('\n');
  return `:root {\n${lightLines}\n  --font-primary: '${tokens.font}', system-ui, sans-serif;\n}\n\n.dark {\n${darkLines}\n}`;
}

function updateColor(key: ColorKey, value: string) {
  if (!tokens) return;
  tokens[mode][key] = value;
  updateTokensStyle();
  const pre = document.getElementById('de-css-output');
  if (pre) pre.textContent = generateCss();
  scheduleSave();
}

function updateFont(name: string, fontImport: { name: string; weights?: number[]; axisRange?: string } | null) {
  if (!tokens) return;
  tokens.font = name;
  pendingFontImport = fontImport;
  updateTokensStyle();
  const pre = document.getElementById('de-css-output');
  if (pre) pre.textContent = generateCss();
  scheduleSave();
}

function setStatus(s: 'idle' | 'saving' | 'saved') {
  if (!statusEl) return;
  if (s === 'idle') { statusEl.textContent = ''; statusEl.className = 'de-status'; return; }
  if (s === 'saving') { statusEl.textContent = 'Saving…'; statusEl.className = 'de-status de-status-saving'; return; }
  if (s === 'saved') { statusEl.textContent = 'Saved'; statusEl.className = 'de-status de-status-saved'; }
}

function scheduleSave() {
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => { flushSave(); }, 250);
}

async function flushSave() {
  if (!tokens) return;
  if (saveTimer !== null) { window.clearTimeout(saveTimer); saveTimer = null; }
  setStatus('saving');
  const payload = { mode, colors: tokens[mode], font: tokens.font, fontImport: pendingFontImport };
  try {
    const res = await fetch('/__design/api/tokens', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
    tokens = body.tokens;
    lastSaveError = null;
    updateTokensStyle();
    setStatus('saved');
    window.setTimeout(() => { if (statusEl?.textContent === 'Saved') setStatus('idle'); }, 1500);
  } catch (e) {
    lastSaveError = String((e as Error).message);
    render();
  }
  pendingFontImport = undefined;
}
```

**Step 2:** Verify TypeScript syntax. The browser DOM types should be available with the default `--lib` for Node `tsc`. If errors appear about `document`, `HTMLElement`, etc., add `--lib ES2022,DOM` to the verify command.

**Step 3:** Commit:
```
git add adapters/react-shadcn/templates/__design-page.ts
git commit -m "feat(react-shadcn): add settings page logic — vanilla TS, safe DOM, autosave"
```

---

### Task B.10: Update `react-shadcn` manifest — `writeCapable: "direct"`

**Files:**
- Modify: `adapters/react-shadcn/manifest.json`

**Step 1:** Use Edit:
- From: `"writeCapable": "snippet"`
- To: `"writeCapable": "direct"`

**Step 2:** Verify with Grep.

**Step 3:** Commit:
```
git add adapters/react-shadcn/manifest.json
git commit -m "feat(react-shadcn): flip writeCapable to direct"
```

---

### Task B.11: Update `/design-settings-page` command — react-shadcn direct-mode handling

**Files:**
- Modify: `commands/design-settings-page.md`

**Description:** The existing command's logic was largely written for snippet mode (with token substitution into a single template file) and assumed a Next.js or React Router structure for react-shadcn (which the scaffold doesn't have). For direct mode, we sidestep all that — the Vite plugin owns the URL space, no router needed, no per-skin substitution needed (the page reads tokens from theme.css at runtime).

**Step 1:** Read the current `commands/design-settings-page.md` to understand its existing structure.

**Step 2:** Replace Step 2 (manifest read) with enum-aware logic:

Replace the existing Step 2 contents with:

```markdown
## Step 2: Read adapter manifest

Read `${CLAUDE_PLUGIN_ROOT}/adapters/<adapter>/manifest.json`.

Inspect the `settingsPage` field:
- `writeCapable`: `"direct"` (live API write-back), `"snippet"` (copy/paste output), or `"none"` (no settings page).
- `devGate`: e.g. `"import.meta.env.DEV"` for Vite-based adapters, `null` for others.
- `routePath`: where the settings page is reachable.

Note: `obsidian-css` may still report `true` and `tailwind-v4` may still report `false`. Treat those as `"direct"` and `"none"` respectively. (Full enum migration is a follow-up issue.)

If `writeCapable` is `"none"` (or `false`), tell the user the active adapter doesn't provide a settings page template and stop.
```

**Step 3:** After Step 7 (per-adapter dev guards), insert Step 7.5 (react-shadcn direct-mode setup):

```markdown
## Step 7.5: For react-shadcn direct mode, set up live write-back files

Applies only when `<adapter>` is `react-shadcn` AND `writeCapable === "direct"`.

Skip the existing Step 6 output path and Step 4-5 token-substitution logic for this case. Direct mode uses a different scaffold — no per-template token substitution, no route file. (Snippet-mode adapters like `plain-css` continue using the original logic.)

For react-shadcn direct mode, write four files into the user's project (paths relative to project root):

1. `src/design-engine/theme-io.ts` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/theme-io.ts`.
2. `src/design-engine/vite-plugin-design-engine.ts` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/vite-plugin-design-engine.ts`. Its `import` of `'./theme-io'` is correct (sibling, extensionless).
3. `src/design-engine/__design-page.html` — copy from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/__design-page.html`.
4. `src/design-engine/__design-page.js` — compile from `${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/__design-page.ts`. Use:
   ```
   npx esbuild --bundle --format=esm --target=es2022 --platform=browser --outfile=src/design-engine/__design-page.js "${CLAUDE_PLUGIN_ROOT}/adapters/react-shadcn/templates/__design-page.ts"
   ```
   esbuild is normally installed transitively with Vite. If `npx esbuild` fails (esbuild not found), tell the user: "esbuild not available — run `npm install` to install dependencies, then re-run `/design-settings-page`." Don't auto-install — let the user handle it.

The Vite plugin loads `__design-page.html` and `__design-page.js` at runtime via `fs.readFile`, resolved relative to the plugin file's own directory (`import.meta.url`). They MUST be co-located.

Then patch `vite.config.ts` to register the plugin. Read `vite.config.ts` first. If it matches the simple scaffold shape (one `defineConfig` call with a `plugins` array), edit to add:

```ts
import designEngine from './src/design-engine/vite-plugin-design-engine';

export default defineConfig({
  plugins: [react(), designEngine()],
  // ...other existing config
});
```

If `vite.config.ts` is custom or conditional, do NOT auto-edit. Print this snippet and ask the user to add it manually:

```
[design-engine] Could not safely auto-patch vite.config.ts.
Add this to your config:
  import designEngine from './src/design-engine/vite-plugin-design-engine';
  // Inside defineConfig({ plugins: [...] }):
  designEngine()
```
```

**Step 4:** Update Step 9 (confirmation summary) to point react-shadcn direct-mode users to `http://localhost:5173/__design/` (note trailing slash).

**Step 5:** Commit:
```
git add commands/design-settings-page.md
git commit -m "feat(commands): /design-settings-page handles react-shadcn direct-mode write-back"
```

---

### Task B.12: Phase B smoke test — react-shadcn end-to-end

**Step 1:** Pick a scratch directory outside the plugin repo. Use Read/Write/Bash inside the repo to set up the smoke test if a real Vite project isn't easily available.

If a real test is feasible:

1. `mkdir -p /c/temp/de-smoke && cd /c/temp/de-smoke`
2. `npm create vite@latest . -- --template react-ts` (accept defaults)
3. `npm install`
4. From within Claude Code in this directory, run `/design-init` (pick `react-shadcn`, `vercel` skin), then `/design-settings-page`.
5. Until `/design-skin` font @import is shipped (deferred), manually add the Geist @import to fonts.css's managed block.
6. `npm run dev` and open `http://localhost:5173/__design/`.

**Step 2:** Verify:
- Page loads with Vercel theme tokens populated.
- Demo showcase renders correctly.
- Edit `--brand` to red — status "Saving..." then "Saved", brand button repaints, theme.css disk content updated.
- Toggle Dark mode — page chrome flips, edits go to `.dark` block.
- Type "Pacifico" (not in offline list), blur — theme.css updated, fonts.css managed block emptied.
- Type "Inter", pick from autocomplete — fonts.css managed block now has Inter @import.
- Click Copy CSS, paste elsewhere.
- Open user's app at `/`, edit a color in /__design/, verify HMR repaints user's app.

**Step 3:** Verify dev gate: `npm run build && npm run preview` — `/__design/` should 404.

**Step 4:** If smoke test isn't feasible from inside the executor session (no real Vite project), document the limitation in the PR description as "smoke test pending, unit tests passing." Mark the PR as Draft if so.

**Step 5:** No commit.

---

## Phase F (reduced) — Final cleanup before PR

### Task F.1: Regenerate MANIFEST.md

**Files:**
- Modify: `MANIFEST.md`

**Step 1:** Update entries for new files:
- Under `adapters/react-shadcn/templates/`: add `theme-io.ts`, `vite-plugin-design-engine.ts`, `__design-page.html`, `__design-page.ts`.
- Under `adapters/tailwind-v4/theme/`: note managed-font-imports markers in `fonts.css` and `--font-primary` declaration in `theme.css`.
- Add a `tests/` section noting the test infrastructure.
- Update Key Relationships to remove "fixed in feat/settings-page-write-back" notes (they're now fixed; describe current state).

**Step 2:** Commit:
```
git add MANIFEST.md
git commit -m "docs(manifest): regenerate to reflect issue #4 (react-shadcn) changes"
```

---

### Task F.2: Run all tests one more time

**Step 1:**
```
cd tests && npm test && cd ..
```
Expected: 20 passing.

**Step 2:** No commit. If failures, fix as a new task before proceeding.

---

### Task F.3: Push branch and create PR

**Step 1:** Push:
```
git push -u origin feat/settings-page-write-back
```

**Step 2:** Create PR via `gh pr create`. Use a heredoc body in Bash (works in Git Bash on Windows):

```
gh pr create --title "Live write-back for runtime settings page on react-shadcn (issue #4 partial)" --body "$(cat <<'EOF'
## Summary

Live two-way write-back for the runtime settings page on the react-shadcn adapter.

- Vite plugin owns /__design/* in dev — both the HTML settings page and the JSON token API
- Settings page is plain HTML + vanilla TypeScript (no React, no router, no UI primitive imports)
- Light + dark mode editing with mode toggle that flips both editing target and page chrome
- In-memory live preview via managed style tag updating on every keystroke; demo elements use normal CSS variables
- Free-text font picker with curated 14-font autocomplete; auto-managed @import block in fonts.css
- Surgical theme.css writer (comment-safe, string-safe, span-based); preserves comments and unmanaged variables
- Atomic file write with Windows-friendly retry on EBUSY/EPERM
- Bug fix: --font-primary now actually consumed by body rule in fonts.css (was hardcoded to Inter)
- Bug fix: bundled skin fonts corrected (Vercel→Geist, Stripe→SF Pro Display, Toss→Pretendard)
- Test infrastructure: 20 unit tests for the theme-io helper

Partially closes #4. Astro adapter, SvelteKit adapter, /design-skin font @import extension, manifest enum migration, and Google Fonts catalog API are deferred to follow-up issues.

## Design + plan

- Design: docs/plans/2026-05-04-settings-page-write-back-design.md
- Implementation: docs/plans/2026-05-04-settings-page-write-back-implementation.md

## Test plan

- [ ] cd tests && npm test — 20 unit tests pass
- [ ] Smoke: scaffold fresh react-shadcn project, run /design-init (vercel skin), /design-settings-page, edit colors and font, verify HMR-driven live preview in user app tab
- [ ] Smoke: npm run build && npm run preview — /__design/ unreachable in production
- [ ] Smoke: parser handles theme.css with comments containing managed-token syntax (no false positives)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3:** Note the PR URL.

---

## Out of scope for this PR (tracked as session chips)

- Port live write-back to Astro adapter
- Port live write-back to SvelteKit adapter
- /design-skin: rewrite managed font @import block on skin apply
- Migrate writeCapable to enum across all 6 adapters + consumers
- Live Google Fonts catalog autocomplete

## Notes for the implementer

- **Frequent commits.** Each task is its own commit. Don't batch.
- **Smoke test (B.12) requires a real Vite project** — if not feasible from the executor session, document as pending and ship as Draft PR.
- **Avoid `cp`, `/tmp`, `head` in commands.** Use Read + Write instead. `git`, `npm`, `npx`, `gh` work in Git Bash on Windows.
- **TypeScript template files** don't compile against Vite/React deps in the plugin repo. Only the unit tests for `theme-io.ts` actually run via Node `--test`. For other TS files, syntax check via `tsc --noEmit --skipLibCheck` is the cheap check.
- **The Vite plugin reads `__design-page.html` and `__design-page.js` at runtime** via `fs.readFile`, resolved relative to its own directory (`import.meta.url`). The HTML and JS files MUST be co-located with the plugin file in the user's project (`src/design-engine/`).
- **The page logic file is bundled** by esbuild during scaffolding (Task B.11 step 4). esbuild ships with Vite, so it's available in the user's node_modules. The compiled `.js` is what the plugin serves.
- **The DOM construction style in `__design-page.ts` uses `createElement` + `textContent`** (not template strings with innerHTML). This is intentional for safety even though the data sources (server JSON, hardcoded constants) are trusted.

If anything goes wrong in execution: fix as a new task in this branch, document the deviation by updating this plan via Edit, and continue. The branch is the unit of delivery.
