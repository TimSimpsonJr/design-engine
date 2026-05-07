// DESIGN.md → W3C Design Tokens one-way derivation parser.
//
// Reads a DESIGN.md file (OD 9-section format or frontmatter YAML format)
// and extracts structured tokens from derivable sections:
//   - Section 2 (Color Palette & Roles)
//   - Section 3 (Typography Rules)
//   - Section 5 (Layout Principles — spacing & radius)
//   - Section 6 (Depth & Elevation — shadows)
//   - YAML frontmatter (colors, typography, spacing, rounded)
//
// Sections 1, 4, 7, 8, 9 are narrative-only and ignored.
// The extraction is one-way and lossy — prose content doesn't produce tokens.
//
// Both numbered (## 2. Color Palette & Roles) and unnumbered
// (## Color Palette & Roles) headings are supported.
// Missing sections produce empty groups. Unknown H2 headings are ignored.

import type { TokenGroup, Tokens } from './theme-io.ts';

// ── Public API ──────────────────────────────────────────────────────

export function parseDesignMd(md: string): Tokens {
  const tokens: Tokens = {
    color:      { $type: 'color' },
    font:       { $type: 'fontFamily' },
    typography: { $type: 'typography' },
    spacing:    { $type: 'dimension' },
    radius:     { $type: 'dimension' },
    shadow:     { $type: 'shadow' },
  };

  // Phase 1: Extract from YAML frontmatter (if present)
  parseFrontmatter(md, tokens);

  // Phase 2: Extract from markdown body sections
  const sections = splitSections(md);
  for (const section of sections) {
    const kind = classifySection(section.heading);
    switch (kind) {
      case 'color':
        parseColorSection(section.body, tokens);
        break;
      case 'typography':
        parseTypographySection(section.body, tokens);
        break;
      case 'layout':
        parseLayoutSection(section.body, tokens);
        break;
      case 'elevation':
        parseElevationSection(section.body, tokens);
        break;
      // 'ignore' and unknown: skip silently
    }
  }

  return tokens;
}

// ── Frontmatter parsing ─────────────────────────────────────────────

function parseFrontmatter(md: string, tokens: Tokens): void {
  // Frontmatter can appear after an optional H1 + description line,
  // wrapped in --- ... --- fences. Some OD files embed YAML in the
  // description block between the first --- and the closing ---.
  const fmMatch = md.match(/^---\r?\n([\s\S]*?)\r?\n---/m);
  if (!fmMatch) {
    // Also try: frontmatter after H1 line + blockquote line
    // Some OD files have a non-fenced YAML block in the description area
    // between H1 and the first H2 (e.g. Linear). Look for the pattern:
    //   > Category: ...
    //   ---
    //   <yaml>
    //   ---
    const altMatch = md.match(/^>\s+.*\r?\n\r?\n---\r?\n([\s\S]*?)\r?\n---/m);
    if (altMatch) {
      parseFrontmatterYaml(altMatch[1], tokens);
    }
    return;
  }
  parseFrontmatterYaml(fmMatch[1], tokens);
}

function parseFrontmatterYaml(yaml: string, tokens: Tokens): void {
  // Simple YAML parser for the flat/nested structures we care about.
  // We handle these top-level keys: colors, typography, spacing, rounded
  const blocks = splitYamlTopLevel(yaml);

  if (blocks.colors) {
    parseFlatYamlBlock(blocks.colors, tokens.color as TokenGroup);
  }
  if (blocks.typography) {
    parseTypographyYamlBlock(blocks.typography, tokens);
  }
  if (blocks.spacing) {
    parseFlatYamlBlock(blocks.spacing, tokens.spacing as TokenGroup);
  }
  if (blocks.rounded) {
    parseFlatYamlBlock(blocks.rounded, tokens.radius as TokenGroup);
  }
}

/** Split a YAML document into top-level key blocks (key: lines-until-next-key) */
function splitYamlTopLevel(yaml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = yaml.split(/\r?\n/);
  let currentKey: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    // Top-level key: no indentation, ends with ':'
    const topMatch = line.match(/^([a-z][a-z0-9_-]*):\s*$/);
    if (topMatch) {
      if (currentKey) {
        result[currentKey] = currentLines.join('\n');
      }
      currentKey = topMatch[1];
      currentLines = [];
      continue;
    }
    // Top-level key with inline value (e.g., version: alpha)
    const inlineMatch = line.match(/^([a-z][a-z0-9_-]*):\s+(.+)$/);
    if (inlineMatch && !line.startsWith(' ')) {
      if (currentKey) {
        result[currentKey] = currentLines.join('\n');
      }
      currentKey = inlineMatch[1];
      currentLines = [];
      // Store inline value as well
      result[currentKey] = inlineMatch[2];
      currentKey = null;
      continue;
    }
    if (currentKey) {
      currentLines.push(line);
    }
  }
  if (currentKey) {
    result[currentKey] = currentLines.join('\n');
  }

  return result;
}

/** Parse a flat YAML block (indented key: value pairs) into a token group */
function parseFlatYamlBlock(block: string, group: TokenGroup): void {
  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s+([a-z][a-z0-9_-]*):\s+["']?([^"'\n]+)["']?\s*$/i);
    if (match) {
      const key = match[1].toLowerCase();
      let value = match[2].trim();
      // Strip trailing quotes
      value = value.replace(/^["']|["']$/g, '');
      (group as any)[key] = { $value: value };
    }
  }
}

/** Parse typography YAML block with nested role definitions */
function parseTypographyYamlBlock(block: string, tokens: Tokens): void {
  const lines = block.split(/\r?\n/);
  let currentRole: string | null = null;
  let roleProps: Record<string, string> = {};

  const flushRole = () => {
    if (currentRole && Object.keys(roleProps).length > 0) {
      // Extract font family for the font group
      if (roleProps.fontFamily) {
        const primaryFont = extractPrimaryFont(roleProps.fontFamily);
        // Set font.primary if this is the first role or a display role
        if (!tokens.font.primary) {
          (tokens.font as any).primary = { $value: primaryFont };
        }
      }
      // Build typography token
      const typoValue: Record<string, string> = {};
      if (roleProps.fontSize) typoValue.size = roleProps.fontSize;
      if (roleProps.fontWeight) typoValue.weight = String(roleProps.fontWeight);
      if (roleProps.lineHeight) typoValue.lineHeight = String(roleProps.lineHeight);
      if (roleProps.letterSpacing && roleProps.letterSpacing !== '0') {
        typoValue.letterSpacing = roleProps.letterSpacing;
      }
      if (Object.keys(typoValue).length > 0) {
        (tokens.typography as any)[currentRole!] = { $value: typoValue };
      }
    }
  };

  for (const line of lines) {
    // Role line: 2-space indent, key followed by colon
    const roleMatch = line.match(/^  ([a-z][a-z0-9_-]*):\s*$/i);
    if (roleMatch) {
      flushRole();
      currentRole = roleMatch[1];
      roleProps = {};
      continue;
    }
    // Property line: 4-space indent
    const propMatch = line.match(/^\s{4,}([a-zA-Z][a-zA-Z0-9_-]*):\s+(.+)$/);
    if (propMatch && currentRole) {
      roleProps[propMatch[1]] = propMatch[2].replace(/^["']|["']$/g, '').trim();
    }
  }
  flushRole();
}

// ── Markdown section splitting ──────────────────────────────────────

type Section = { heading: string; body: string };

function splitSections(md: string): Section[] {
  const sections: Section[] = [];
  // Build a set of line offsets that are inside fenced code blocks
  const lines = md.split(/\r?\n/);
  const insideCodeBlock = new Set<number>();
  let inCodeBlock = false;
  let charOffset = 0;
  for (const line of lines) {
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
    } else if (inCodeBlock) {
      insideCodeBlock.add(charOffset);
    }
    charOffset += line.length + 1; // +1 for the newline
  }

  // Match H2 headings, numbered or unnumbered
  const h2Re = /^##\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  const headings: Array<{ heading: string; index: number }> = [];

  while ((match = h2Re.exec(md)) !== null) {
    // Skip H2 matches inside fenced code blocks
    if (insideCodeBlock.has(match.index)) continue;
    headings.push({ heading: match[1].trim(), index: match.index + match[0].length });
  }

  for (let i = 0; i < headings.length; i++) {
    const bodyStart = headings[i].index;
    const bodyEnd = i + 1 < headings.length
      ? md.lastIndexOf('\n##', headings[i + 1].index)
      : md.length;
    sections.push({
      heading: headings[i].heading,
      body: md.slice(bodyStart, bodyEnd >= bodyStart ? bodyEnd : md.length),
    });
  }

  return sections;
}

type SectionKind = 'color' | 'typography' | 'layout' | 'elevation' | 'ignore';

function classifySection(heading: string): SectionKind | null {
  // Strip optional leading number and period: "2. Color Palette & Roles" → "Color Palette & Roles"
  const stripped = heading.replace(/^\d+\.\s*/, '').toLowerCase();

  if (/color\s*palette|colors?\b/.test(stripped)) return 'color';
  if (/typography|font/.test(stripped)) return 'typography';
  if (/layout|spacing/.test(stripped)) return 'layout';
  if (/depth|elevation|shadow/.test(stripped)) return 'elevation';
  if (/shapes?\b/.test(stripped)) return 'layout'; // "Shapes" section often has radius

  // Known narrative-only sections
  if (/visual\s*theme|atmosphere/.test(stripped)) return 'ignore';
  if (/component\s*styl/.test(stripped)) return 'ignore';
  if (/do.s?\s*(and|&)\s*don.t/.test(stripped)) return 'ignore';
  if (/responsive/.test(stripped)) return 'ignore';
  if (/agent\s*prompt/.test(stripped)) return 'ignore';
  if (/overview/.test(stripped)) return 'ignore';
  if (/iteration/.test(stripped)) return 'ignore';
  if (/known\s*gap/.test(stripped)) return 'ignore';

  // Unknown section — return null (ignored silently)
  return null;
}

// ── Section 2: Color Palette ────────────────────────────────────────

function parseColorSection(body: string, tokens: Tokens): void {
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    // Pattern 1: - **Name** (`#hex`) or - **Name** (`rgba(...)`)
    // Also: **Name** (`value`): description
    const match = line.match(
      /\*\*([^*]+)\*\*\s*\(\s*`([^`]+)`\s*\)/
    );
    if (match) {
      const rawName = match[1].trim();
      let value = match[2].trim();

      // If the value contains a reference like {colors.primary} — #hex,
      // extract the actual hex/color value
      const refHexMatch = value.match(/(?:\{[^}]+\}\s*(?:—|-)\s*)(.+)/);
      if (refHexMatch) {
        value = refHexMatch[1].trim();
      }

      // Skip if the value is just a reference like {colors.primary}
      if (value.startsWith('{') && value.endsWith('}')) continue;

      // Only accept color-like values
      if (!isColorValue(value)) continue;

      const key = slugify(rawName);
      (tokens.color as any)[key] = { $value: value };
    }
  }
}

// ── Section 3: Typography ───────────────────────────────────────────

function parseTypographySection(body: string, tokens: Tokens): void {
  const lines = body.split(/\r?\n/);

  // Extract font family declarations
  for (const line of lines) {
    // Pattern: - **Primary**: `fontname`, with fallback: ...
    // Pattern: - **Monospace**: `fontname`, ...
    // Pattern: **Primary** — LinearDisplay; fallback ...
    const fontMatch = line.match(
      /\*\*(\w[\w\s]*?)\*\*\s*(?::|—|-)\s*`([^`]+)`/
    );
    if (fontMatch) {
      const label = fontMatch[1].trim().toLowerCase();
      const fontValue = fontMatch[2].trim();
      // Only accept font-family-related labels; reject spurious matches
      // like "OpenType Features" or other bold-label-colon-backtick patterns
      if (!/^(primary|secondary|display|body|text|mono|monospace|serif|sans|heading|code|default|main|fallback|accent|brand|ui)$/i.test(label)) {
        continue;
      }
      if (/primary|display|default|main|body/i.test(label)) {
        (tokens.font as any).primary = { $value: fontValue };
      } else {
        const key = slugify(label);
        (tokens.font as any)[key] = { $value: fontValue };
      }
    }
  }

  // Also look for font family in prose: e.g. "- **Linear Display** — ..."
  // This handles the "### Font Family" subsection with prose descriptions
  for (const line of lines) {
    const proseFont = line.match(
      /^-\s+\*\*([^*]+)\*\*\s*(?:—|-)\s+([^.;,]+)/
    );
    if (proseFont) {
      const label = proseFont[1].trim();
      const desc = proseFont[2].trim();
      // Only if it looks like a font family description (not a property line we already matched)
      if (/font|display|text|mono|serif|sans/i.test(label) && !desc.startsWith('`')) {
        // Extract font name from the description (first word/phrase before comma or semicolon)
        const fontName = desc.replace(/[,;].*/, '').trim();
        if (fontName && !/^\d/.test(fontName) && !fontName.startsWith('`')) {
          const key = slugify(label);
          if (!(tokens.font as any)[key]) {
            (tokens.font as any)[key] = { $value: fontName };
          }
        }
      }
    }
  }

  // Extract typography hierarchy table
  parseTypographyTable(body, tokens);
}

function parseTypographyTable(body: string, tokens: Tokens): void {
  const lines = body.split(/\r?\n/);
  let inTable = false;
  let columnMap: Record<string, number> = {};

  for (const line of lines) {
    // Detect table header row with pipe-separated columns
    if (!inTable && /^\|.*\|$/.test(line.trim())) {
      const headers = line.split('|')
        .map(h => h.trim().toLowerCase())
        .filter(h => h.length > 0);

      // Check if this looks like a typography hierarchy table
      const hasRole = headers.some(h => /role|token|name/i.test(h));
      const hasSize = headers.some(h => /size/i.test(h));
      if (hasRole && hasSize) {
        // Map column names to indices
        for (let i = 0; i < headers.length; i++) {
          if (/role|token|name/i.test(headers[i])) columnMap.role = i;
          if (/^size$|font\s*size/i.test(headers[i])) columnMap.size = i;
          if (/weight/i.test(headers[i])) columnMap.weight = i;
          if (/line\s*height/i.test(headers[i])) columnMap.lineHeight = i;
          if (/letter[\s-]*spacing/i.test(headers[i])) columnMap.letterSpacing = i;
        }
        inTable = true;
        continue;
      }
    }

    // Skip separator row
    if (inTable && /^\|[\s-|]+\|$/.test(line.trim())) continue;

    // Parse data rows
    if (inTable && /^\|.*\|$/.test(line.trim())) {
      const cells = line.split('|')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      if (cells.length === 0) { inTable = false; continue; }

      const role = cells[columnMap.role]?.trim();
      if (!role) continue;

      // Clean role name: strip backticks, braces, etc.
      const cleanRole = role.replace(/`/g, '').replace(/\{[^}]*\}/g, '').trim();
      const key = slugify(cleanRole);
      if (!key) continue;

      const value: Record<string, string> = {};
      if (columnMap.size !== undefined && cells[columnMap.size]) {
        const sizeRaw = cells[columnMap.size].trim();
        // Extract px or rem value: "56px (3.50rem)" → "56px"
        const sizeMatch = sizeRaw.match(/(\d+(?:\.\d+)?(?:px|rem|em))/);
        if (sizeMatch) value.size = sizeMatch[1];
      }
      if (columnMap.weight !== undefined && cells[columnMap.weight]) {
        const weightRaw = cells[columnMap.weight].trim();
        // Extract first numeric weight: "300-400" → "300", "500" → "500"
        const weightMatch = weightRaw.match(/(\d{3})/);
        if (weightMatch) value.weight = weightMatch[1];
      }
      if (columnMap.lineHeight !== undefined && cells[columnMap.lineHeight]) {
        const lhRaw = cells[columnMap.lineHeight].trim();
        const lhMatch = lhRaw.match(/([\d.]+)/);
        if (lhMatch) value.lineHeight = lhMatch[1];
      }
      if (columnMap.letterSpacing !== undefined && cells[columnMap.letterSpacing]) {
        const lsRaw = cells[columnMap.letterSpacing].trim();
        if (lsRaw !== 'normal' && lsRaw !== '0' && lsRaw !== 'N/A') {
          const lsMatch = lsRaw.match(/(-?[\d.]+(?:px|em|rem)?)/);
          if (lsMatch) value.letterSpacing = lsMatch[1];
        }
      }

      if (Object.keys(value).length > 0) {
        (tokens.typography as any)[key] = { $value: value };
      }
    } else if (inTable && !/^\|/.test(line.trim()) && line.trim().length > 0) {
      // End of table
      inTable = false;
      columnMap = {};
    }
  }
}

// ── Section 5: Layout ───────────────────────────────────────────────

function parseLayoutSection(body: string, tokens: Tokens): void {
  const lines = body.split(/\r?\n/);

  // Look for spacing scale in various formats:
  // - "Scale: 1px, 2px, 4px, ..."
  // - Tabular format
  // - Token references from frontmatter: {spacing.xs} 8px
  for (const line of lines) {
    // Pattern: Scale: values
    const scaleMatch = line.match(/scale:\s*(.+)/i);
    if (scaleMatch) {
      const values = scaleMatch[1].match(/\d+px/g);
      if (values) {
        for (let i = 0; i < values.length; i++) {
          const key = spacingKeyForIndex(i, values.length);
          if (!(tokens.spacing as any)[key]) {
            (tokens.spacing as any)[key] = { $value: values[i] };
          }
        }
      }
    }

    // Pattern: {spacing.name} Npx or `{spacing.name}` Npx
    const tokenRefMatch = line.match(/\{spacing\.([a-z0-9_-]+)\}\s*`?(\d+px)`?/i);
    if (tokenRefMatch) {
      const key = tokenRefMatch[1];
      const value = tokenRefMatch[2];
      (tokens.spacing as any)[key] = { $value: value };
    }
  }

  // Border radius from layout section
  parseRadiusFromBody(body, tokens);
}

function parseRadiusFromBody(body: string, tokens: Tokens): void {
  const lines = body.split(/\r?\n/);
  let lineCharOffset = 0;

  for (const line of lines) {
    // Pattern: Standard (4px) or Micro (1px) — from Stripe layout
    const radiusMatch = line.match(
      /(?:^[-*]\s*)?\*?\*?(\w[\w\s]*?)\*?\*?\s*\(\s*(\d+px)\s*\)/
    );
    if (radiusMatch) {
      const name = radiusMatch[1].trim();
      const value = radiusMatch[2];
      // Only if this looks like a radius entry (near "radius" content)
      const contextStart = Math.max(0, lineCharOffset - 200);
      const contextEnd = lineCharOffset + line.length;
      if (/radius|round|corner/i.test(body.slice(contextStart, contextEnd))) {
        const key = slugify(name);
        if (key && !(tokens.radius as any)[key]) {
          (tokens.radius as any)[key] = { $value: value };
        }
      }
    }

    // Pattern: | `{rounded.md}` | 8px | ... (table format)
    const tableRadiusMatch = line.match(/\|\s*`?\{?rounded\.([a-z0-9_-]+)\}?`?\s*\|\s*(\d+px)\s*\|/i);
    if (tableRadiusMatch) {
      const key = tableRadiusMatch[1];
      const value = tableRadiusMatch[2];
      (tokens.radius as any)[key] = { $value: value };
    }

    // Pattern: | Token | Value | (non-reference table format: | xs | 4px |)
    const simpleTableMatch = line.match(/\|\s*`?([a-z][a-z0-9_-]*)`?\s*\|\s*(\d+px)\s*\|/i);
    if (simpleTableMatch && /radius|round|corner/i.test(body.slice(0, lineCharOffset + line.length))) {
      const key = simpleTableMatch[1];
      const value = simpleTableMatch[2];
      if (!(tokens.radius as any)[key]) {
        (tokens.radius as any)[key] = { $value: value };
      }
    }

    lineCharOffset += line.length + 1; // +1 for the newline
  }
}

// ── Section 6: Elevation ────────────────────────────────────────────

function parseElevationSection(body: string, tokens: Tokens): void {
  const lines = body.split(/\r?\n/);

  for (const line of lines) {
    // Pattern: Level name | shadow value | use
    // The shadow value contains rgba(...) or multiple shadow layers
    const shadowMatch = line.match(
      /\|\s*([^|]+?)\s*\|\s*([^|]*(?:rgba|hsla|#)\([^|]*\)[^|]*)\s*\|/i
    );
    if (shadowMatch) {
      const name = shadowMatch[1].trim();
      const rawValue = shadowMatch[2].trim();

      // Skip "No shadow" or empty entries
      if (/no\s*shadow/i.test(rawValue)) continue;
      if (/outline|border|solid/i.test(rawValue) && !/shadow/i.test(rawValue)) continue;

      const value = rawValue.replace(/`/g, '').trim();
      if (!value) continue;

      const key = slugify(name);
      if (key) {
        (tokens.shadow as any)[key] = { $value: value };
      }
    }
  }

  // Also look for radius in elevation sections (some OD files put it here)
  parseRadiusFromBody(body, tokens);
}

// ── Utilities ───────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isColorValue(value: string): boolean {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return true;
  if (/^(?:rgba?|hsla?|oklch|oklab|lch|lab|hwb|color)\s*\(/i.test(value)) return true;
  return false;
}

function extractPrimaryFont(rawFamily: string): string {
  // Get the first font from a font-family stack: "'Cereal VF', sans-serif" → "Cereal VF"
  const first = rawFamily.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}

function spacingKeyForIndex(i: number, total: number): string {
  // Generate a sensible key name based on position in a scale
  const names = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'];
  if (total <= names.length) {
    // Center the names around md
    const offset = Math.max(0, Math.floor((names.length - total) / 2));
    return names[offset + i] || `${i + 1}`;
  }
  return `${i + 1}`;
}
