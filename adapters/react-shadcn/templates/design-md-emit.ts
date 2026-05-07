// W3C Design Tokens → DESIGN.md skeleton emitter.
//
// Reverse of design-md-parse.ts: takes a tokens object (W3C format)
// and produces a DESIGN.md skeleton with derivable sections filled in
// and narrative sections stubbed with TODO comments.
//
// Supports two modes:
//   - 'full' (default): emits all 9 OD sections with H1 header.
//   - 'suggestion': emits only derivable sections (2, 3, 5, 6) for
//     diff-friendly output used by `sync --reverse`.

// ── Public API ──────────────────────────────────────────────────────

type EmitOptions = {
  name: string;
  category?: string;
  mode?: 'full' | 'suggestion';
};

export function emitDesignMdSkeleton(tokens: any, options: EmitOptions): string {
  const mode = options.mode ?? 'full';
  const parts: string[] = [];

  if (mode === 'full') {
    parts.push(`# Design System Inspired by ${options.name}\n`);
    if (options.category) {
      parts.push(`> Category: ${options.category}\n`);
    }
    parts.push('');
    parts.push(emitSection1());
  }

  parts.push(emitSection2(tokens));
  parts.push(emitSection3(tokens));

  if (mode === 'full') {
    parts.push(emitSection4());
  }

  parts.push(emitSection5(tokens));
  parts.push(emitSection6(tokens));

  if (mode === 'full') {
    parts.push(emitSection7());
    parts.push(emitSection8());
    parts.push(emitSection9());
  }

  return parts.join('\n');
}

// ── Section emitters ────────────────────────────────────────────────

function emitSection1(): string {
  return [
    '## 1. Visual Theme & Atmosphere',
    '',
    '<!-- TODO: describe visual atmosphere, mood, and overall aesthetic direction -->',
    '',
  ].join('\n');
}

function emitSection2(tokens: any): string {
  const lines: string[] = [
    '## 2. Color Palette & Roles',
    '',
  ];

  const colorGroup = tokens.color;
  if (colorGroup && hasTokenEntries(colorGroup)) {
    for (const [key, entry] of tokenEntries(colorGroup)) {
      const displayName = toTitleCase(key);
      const value = resolveScalarValue(entry);
      lines.push(`- **${displayName}** (\`${value}\`)`);
    }
    lines.push('');
  } else {
    lines.push('<!-- TODO: define color palette with hex values -->');
    lines.push('');
  }

  return lines.join('\n');
}

function emitSection3(tokens: any): string {
  const lines: string[] = [
    '## 3. Typography Rules',
    '',
  ];

  let hasContent = false;

  // Font families
  const fontGroup = tokens.font;
  if (fontGroup && hasTokenEntries(fontGroup)) {
    lines.push('### Font Family');
    lines.push('');
    for (const [key, entry] of tokenEntries(fontGroup)) {
      const displayName = toTitleCase(key);
      const value = resolveScalarValue(entry);
      lines.push(`- **${displayName}**: \`${value}\``);
    }
    lines.push('');
    hasContent = true;
  }

  // Typography hierarchy
  const typoGroup = tokens.typography;
  if (typoGroup && hasTokenEntries(typoGroup)) {
    lines.push('### Type Hierarchy');
    lines.push('');
    lines.push('| Role | Size | Weight | Line Height |');
    lines.push('| --- | --- | --- | --- |');
    for (const [key, entry] of tokenEntries(typoGroup)) {
      const displayName = toTitleCase(key);
      const val = entry?.$value;
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const size = val.size ?? '-';
        const weight = val.weight ?? '-';
        const lineHeight = val.lineHeight ?? '-';
        lines.push(`| ${displayName} | ${size} | ${weight} | ${lineHeight} |`);
      }
    }
    lines.push('');
    hasContent = true;
  }

  if (!hasContent) {
    lines.push('<!-- TODO: define font families and type hierarchy -->');
    lines.push('');
  }

  return lines.join('\n');
}

function emitSection4(): string {
  return [
    '## 4. Component Stylings',
    '',
    '<!-- TODO: describe component-level styling conventions (buttons, cards, inputs, etc.) -->',
    '',
  ].join('\n');
}

function emitSection5(tokens: any): string {
  const lines: string[] = [
    '## 5. Layout Principles',
    '',
  ];

  let hasContent = false;

  const spacingGroup = tokens.spacing;
  if (spacingGroup && hasTokenEntries(spacingGroup)) {
    lines.push('### Spacing Scale');
    lines.push('');
    for (const [key, entry] of tokenEntries(spacingGroup)) {
      const displayName = toTitleCase(key);
      const value = resolveScalarValue(entry);
      lines.push(`- **${displayName}**: \`${value}\``);
    }
    lines.push('');
    hasContent = true;
  }

  if (!hasContent) {
    lines.push('<!-- TODO: define spacing scale and layout grid -->');
    lines.push('');
  }

  return lines.join('\n');
}

function emitSection6(tokens: any): string {
  const lines: string[] = [
    '## 6. Depth & Elevation',
    '',
  ];

  let hasContent = false;

  const radiusGroup = tokens.radius;
  if (radiusGroup && hasTokenEntries(radiusGroup)) {
    lines.push('### Border Radius');
    lines.push('');
    for (const [key, entry] of tokenEntries(radiusGroup)) {
      const displayName = toTitleCase(key);
      const value = resolveScalarValue(entry);
      lines.push(`- **${displayName}**: \`${value}\``);
    }
    lines.push('');
    hasContent = true;
  }

  const shadowGroup = tokens.shadow;
  if (shadowGroup && hasTokenEntries(shadowGroup)) {
    lines.push('### Shadows');
    lines.push('');
    for (const [key, entry] of tokenEntries(shadowGroup)) {
      const displayName = toTitleCase(key);
      const value = resolveScalarValue(entry);
      lines.push(`- **${displayName}**: \`${value}\``);
    }
    lines.push('');
    hasContent = true;
  }

  if (!hasContent) {
    lines.push('<!-- TODO: define border radius, shadow levels, and elevation system -->');
    lines.push('');
  }

  return lines.join('\n');
}

function emitSection7(): string {
  return [
    "## 7. Do's and Don'ts",
    '',
    "<!-- TODO: list Do's and Don'ts for consistent usage -->",
    '',
  ].join('\n');
}

function emitSection8(): string {
  return [
    '## 8. Responsive Behavior',
    '',
    '<!-- TODO: describe responsive breakpoints and adaptive layout rules -->',
    '',
  ].join('\n');
}

function emitSection9(): string {
  return [
    '## 9. Agent Prompt Guide',
    '',
    '<!-- TODO: describe how an AI agent should apply this design system -->',
    '',
  ].join('\n');
}

// ── Utilities ───────────────────────────────────────────────────────

/** Convert a kebab-case key to Title Case: "stripe-purple" → "Stripe Purple" */
function toTitleCase(key: string): string {
  return key
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Resolve a token entry's $value to a display string.
 * Handles: string, string[], Record<string, string>.
 */
function resolveScalarValue(entry: any): string {
  if (!entry || entry.$value === undefined) return '???';
  const val = entry.$value;
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  }
  return String(val);
}

/** Check whether a token group has any actual token entries (keys beyond $type). */
function hasTokenEntries(group: any): boolean {
  if (!group || typeof group !== 'object') return false;
  return Object.keys(group).some(k => k !== '$type');
}

/** Iterate token entries from a group, skipping $type. */
function* tokenEntries(group: any): Generator<[string, any]> {
  if (!group || typeof group !== 'object') return;
  for (const [key, val] of Object.entries(group)) {
    if (key === '$type') continue;
    yield [key, val];
  }
}
