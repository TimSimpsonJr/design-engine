// Originally from bitjaru/styleseed (MIT) — see /LICENSE for full attribution.
// Ported to design-engine plugin under MIT.
//
// Reverse derivation parser: reads an existing project's theme CSS
// (shadcn globals.css, Tailwind v4 @theme, Astro :root, SvelteKit :global)
// and extracts a W3C-style tokens.json structure.
//
// Used by /design-init derive mode to bootstrap tokens.json from existing CSS.

import type { Tokens, TokenGroup, TokenValue } from './theme-io.ts';
export type { Tokens, TokenGroup, TokenValue };

// ---------------------------------------------------------------------------
// Block detection patterns
// ---------------------------------------------------------------------------

// Finds the matching closing brace for an opening brace at `openIdx`.
// Handles nested braces, block comments, and quoted strings.
// (Duplicated from theme-io.ts to keep this module self-contained at runtime,
// since both files are dropped into user projects independently.)
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

// ---------------------------------------------------------------------------
// Value type detection (mirrors theme-io.ts but extended for reverse parse)
// ---------------------------------------------------------------------------

const COLOR_HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_FUNC_RE = /^(?:oklch|oklab|hsl|hsla|rgb|rgba|lch|lab|color)\s*\(/i;
const DIMENSION_RE = /^-?[\d.]+(?:px|rem|em|%|vh|vw|svh|dvh|lvh)$/;
const DURATION_RE = /^-?[\d.]+(?:ms|s)$/;
const FONT_FAMILY_RE = /['"]/;
const FONT_COMMA_RE = /,/;

function detectValueType(value: string): string {
  if (COLOR_HEX_RE.test(value)) return 'color';
  if (COLOR_FUNC_RE.test(value)) return 'color';
  if (DURATION_RE.test(value)) return 'duration';
  if (DIMENSION_RE.test(value)) return 'dimension';
  if (FONT_FAMILY_RE.test(value) || FONT_COMMA_RE.test(value)) return 'fontFamily';
  return 'other';
}

// ---------------------------------------------------------------------------
// Prefix-based grouping rules
// ---------------------------------------------------------------------------

// `--color-<name>` -> color.<name>   (strip the color- prefix)
// `--radius-<name>` -> radius.<name>
// `--font-<name>` -> font.<name>
// `--shadow-<name>` -> shadow.<name>
// `--spacing-<name>` -> spacing.<name>
// `--duration-<name>` -> motion.<name>
const PREFIX_GROUPS: Array<{ prefix: string; group: string; type: string }> = [
  { prefix: 'color-', group: 'color', type: 'color' },
  { prefix: 'font-', group: 'font', type: 'fontFamily' },
  { prefix: 'radius-', group: 'radius', type: 'dimension' },
  { prefix: 'shadow-', group: 'shadow', type: 'shadow' },
  { prefix: 'spacing-', group: 'spacing', type: 'dimension' },
  { prefix: 'duration-', group: 'motion', type: 'duration' },
];

// Exact name -> group mapping (bare names like --radius without suffix)
const EXACT_GROUPS: Record<string, { group: string; key: string; type: string }> = {
  radius: { group: 'radius', key: 'default', type: 'dimension' },
};

function classifyVar(
  name: string,
  value: string,
): { group: string; key: string; type: string } {
  // Check exact name matches first
  const exact = EXACT_GROUPS[name];
  if (exact) return exact;

  // Check prefix-based groups
  for (const { prefix, group, type } of PREFIX_GROUPS) {
    if (name.startsWith(prefix)) {
      const suffix = name.slice(prefix.length);
      // Handle bare prefix with no suffix (e.g., --radius-default -> radius.default)
      return { group, key: suffix || 'default', type };
    }
  }

  // Fall back to value-based type detection for flat/unprefixed names
  const type = detectValueType(value);
  if (type === 'color') return { group: 'color', key: name, type: 'color' };
  if (type === 'fontFamily') return { group: 'font', key: name, type: 'fontFamily' };
  if (type === 'duration') return { group: 'motion', key: name, type: 'duration' };
  if (type === 'dimension') return { group: 'dimension', key: name, type: 'dimension' };
  return { group: 'other', key: name, type };
}

// ---------------------------------------------------------------------------
// Check if a value is "unparseable" (contains var() or calc() expressions)
// ---------------------------------------------------------------------------

function isUnparseable(value: string): boolean {
  return /\bvar\s*\(/.test(value) || /\bcalc\s*\(/.test(value);
}

// ---------------------------------------------------------------------------
// Block body extraction
// ---------------------------------------------------------------------------

/** Extract all --name: value pairs from all supported CSS blocks. */
function extractAllVarDeclarations(
  css: string,
): Array<{ name: string; value: string }> {
  const pairs: Array<{ name: string; value: string }> = [];
  const seen = new Set<string>();

  // Match :root, .dark, @theme, @theme inline, :global blocks
  const blockRe = /(?::root|\.dark(?![\w-])|@theme(?:\s+inline)?|:global)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(css)) !== null) {
    const openIdx = css.indexOf('{', match.index);
    if (openIdx === -1) continue;
    const closeIdx = findMatchingBrace(css, openIdx);
    if (closeIdx === -1) continue;

    const body = css.slice(openIdx + 1, closeIdx);
    extractVarsFromBody(body, pairs, seen);
  }

  return pairs;
}

/**
 * Recursively extract --name: value; pairs from a block body.
 * Handles nested blocks (like :root inside :global) by recursing
 * into any `selector { ... }` sub-blocks found.
 */
function extractVarsFromBody(
  body: string,
  pairs: Array<{ name: string; value: string }>,
  seen: Set<string>,
): void {
  // First, try to extract declarations at this level
  const declRe = /--([a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/gi;
  let declMatch: RegExpExecArray | null;
  while ((declMatch = declRe.exec(body)) !== null) {
    const name = declMatch[1].trim();
    const value = declMatch[2].trim();
    if (!seen.has(name)) {
      seen.add(name);
      pairs.push({ name, value });
    }
  }

  // Then check for nested blocks (:root inside :global, etc.)
  const nestedBlockRe = /(?::root|\.dark(?![\w-]))\s*\{/g;
  let nestedMatch: RegExpExecArray | null;
  while ((nestedMatch = nestedBlockRe.exec(body)) !== null) {
    const nestedOpen = body.indexOf('{', nestedMatch.index);
    if (nestedOpen === -1) continue;
    const nestedClose = findMatchingBrace(body, nestedOpen);
    if (nestedClose === -1) continue;
    const nestedBody = body.slice(nestedOpen + 1, nestedClose);
    extractVarsFromBody(nestedBody, pairs, seen);
  }
}

// ---------------------------------------------------------------------------
// Standard group initialization
// ---------------------------------------------------------------------------

const STANDARD_GROUPS: Array<{ name: string; type: string }> = [
  { name: 'color', type: 'color' },
  { name: 'font', type: 'fontFamily' },
  { name: 'typography', type: 'typography' },
  { name: 'spacing', type: 'dimension' },
  { name: 'radius', type: 'dimension' },
  { name: 'shadow', type: 'shadow' },
];

function initStandardGroups(): Tokens {
  const tokens: Tokens = {};
  for (const { name, type } of STANDARD_GROUPS) {
    tokens[name] = { $type: type };
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type ParsedTokenValue = TokenValue & {
  $extensions?: { designEngine: { unparseable: boolean } };
};

/**
 * Parse an existing project's theme CSS and extract a W3C-style tokens object.
 *
 * Handles:
 * - `@theme { ... }` and `@theme inline { ... }` (Tailwind v4 / shadcn)
 * - `:root { ... }` (standard CSS custom properties)
 * - `.dark { ... }` (dark mode overrides -- extracted but not separated)
 * - `:global { :root { ... } }` (SvelteKit)
 * - `--color-<name>` prefixed vars (common in Tailwind v4)
 * - oklch(), hsl(), rgba(), hex color values
 * - calc()/var() expressions marked as unparseable
 *
 * Differs from readTokensFromCss (theme-io.ts) in that:
 * 1. It strips the `--color-` prefix: `--color-accent` -> `tokens.color.accent`
 * 2. It marks unparseable values with $extensions.designEngine.unparseable
 * 3. It initializes all standard groups with $type, even if empty
 */
export function parseThemeCss(css: string): Tokens {
  const tokens = initStandardGroups();
  const pairs = extractAllVarDeclarations(css);

  for (const { name, value } of pairs) {
    const { group, key, type } = classifyVar(name, value);

    // Ensure the group exists with $type
    if (!tokens[group]) {
      tokens[group] = { $type: type };
    }

    // Build the token value
    const tokenValue: ParsedTokenValue = { $value: value };
    if (isUnparseable(value)) {
      tokenValue.$extensions = { designEngine: { unparseable: true } };
    }

    (tokens[group] as any)[key] = tokenValue;
  }

  return tokens;
}
