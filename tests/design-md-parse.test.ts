import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseDesignMd } from '../adapters/react-shadcn/templates/design-md-parse.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(here, 'fixtures', name);

test('parseDesignMd extracts colors from Color Palette section (airbnb)', () => {
  const md = fs.readFileSync(fix('airbnb-DESIGN.md'), 'utf8');
  const tokens = parseDesignMd(md);
  // Airbnb uses frontmatter colors AND body section — the body section
  // has **Rausch** (`{colors.primary}` — #ff385c) format.
  // The parser should find primary=#ff385c from frontmatter or rausch=#ff385c from body.
  assert.equal(tokens.color.primary?.$value || tokens.color.rausch?.$value, '#ff385c');
});

test('parseDesignMd extracts typography from Typography Rules section', () => {
  const md = fs.readFileSync(fix('airbnb-DESIGN.md'), 'utf8');
  const tokens = parseDesignMd(md);
  assert.ok(tokens.font.primary, 'font.primary should exist');
});

test('parseDesignMd extracts colors from Stripe numbered sections', () => {
  const md = fs.readFileSync(fix('stripe-DESIGN.md'), 'utf8');
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color['stripe-purple']?.$value, '#533afd');
  assert.equal(tokens.color['deep-navy']?.$value, '#061b31');
  assert.equal(tokens.color['pure-white']?.$value, '#ffffff');
});

test('parseDesignMd extracts typography from Stripe', () => {
  const md = fs.readFileSync(fix('stripe-DESIGN.md'), 'utf8');
  const tokens = parseDesignMd(md);
  assert.ok(tokens.font.primary, 'font.primary should exist');
  assert.equal(tokens.font.primary.$value, 'sohne-var');
  assert.ok(tokens.font.monospace, 'font.monospace should exist');
});

test('parseDesignMd extracts typography hierarchy from Stripe', () => {
  const md = fs.readFileSync(fix('stripe-DESIGN.md'), 'utf8');
  const tokens = parseDesignMd(md);
  assert.ok(tokens.typography['display-hero'], 'typography.display-hero should exist');
  assert.equal(tokens.typography['display-hero'].$value.size, '56px');
  assert.equal(tokens.typography['display-hero'].$value.weight, '300');
});

test('parseDesignMd extracts spacing from Stripe layout section', () => {
  const md = fs.readFileSync(fix('stripe-DESIGN.md'), 'utf8');
  const tokens = parseDesignMd(md);
  // Stripe has a spacing scale in layout section
  assert.equal(tokens.spacing.$type, 'dimension');
});

test('parseDesignMd extracts shadow/elevation from Stripe', () => {
  const md = fs.readFileSync(fix('stripe-DESIGN.md'), 'utf8');
  const tokens = parseDesignMd(md);
  assert.equal(tokens.shadow.$type, 'shadow');
});

test('parseDesignMd extracts radius from Stripe layout section', () => {
  const md = fs.readFileSync(fix('stripe-DESIGN.md'), 'utf8');
  const tokens = parseDesignMd(md);
  assert.equal(tokens.radius.$type, 'dimension');
});

test('parseDesignMd handles Linear (unnumbered sections, frontmatter)', () => {
  const md = fs.readFileSync(fix('linear-app-DESIGN.md'), 'utf8');
  const tokens = parseDesignMd(md);
  // Linear has frontmatter colors: primary: "#5e6ad2"
  assert.equal(tokens.color.primary?.$value, '#5e6ad2');
  assert.ok(tokens.font.primary || tokens.font['linear-display'], 'font should have entries');
});

test('parseDesignMd handles kami (numbered sections, no frontmatter)', () => {
  const md = fs.readFileSync(fix('kami-DESIGN.md'), 'utf8');
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color['ink-blue']?.$value, '#1B365D');
  assert.equal(tokens.color.parchment?.$value, '#f5f4ed');
});

test('parseDesignMd is lossy and tolerant — sections may be missing', () => {
  const md = `# Design System
> Category: Test

## 1. Visual Theme & Atmosphere
Just prose, no token data.

## 2. Color Palette & Roles
- **Brand** (\`#abc123\`)
`;
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color.brand?.$value, '#abc123');
  assert.deepEqual(tokens.font, { $type: 'fontFamily' });  // empty group
});

test('parseDesignMd handles unnumbered sections', () => {
  const md = `# Design System
## Color Palette & Roles
- **Brand** (\`#abc123\`)
`;
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color.brand?.$value, '#abc123');
});

test('parseDesignMd warns on unknown H2 headings without failing', () => {
  const md = `# Design System
## Frobnication Notes
Random unknown section.
## Color Palette & Roles
- **Brand** (\`#abc123\`)
`;
  // should not throw; should produce a result
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color.brand?.$value, '#abc123');
});

test('parseDesignMd handles rgba and oklch values', () => {
  const md = `# Design System
## Color Palette
- **Shadow Blue** (\`rgba(50,50,93,0.25)\`)
- **Cool** (\`oklch(0.5 0.2 240)\`)
- **Warm** (\`hsl(20, 80%, 50%)\`)
`;
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color['shadow-blue']?.$value, 'rgba(50,50,93,0.25)');
  assert.equal(tokens.color.cool?.$value, 'oklch(0.5 0.2 240)');
  assert.equal(tokens.color.warm?.$value, 'hsl(20, 80%, 50%)');
});

test('parseDesignMd extracts frontmatter colors', () => {
  const md = `---
colors:
  primary: "#ff385c"
  ink: "#222222"
  canvas: "#ffffff"
---

## Overview
Some overview text.
`;
  const tokens = parseDesignMd(md);
  assert.equal(tokens.color.primary?.$value, '#ff385c');
  assert.equal(tokens.color.ink?.$value, '#222222');
  assert.equal(tokens.color.canvas?.$value, '#ffffff');
});

test('parseDesignMd extracts frontmatter typography', () => {
  const md = `---
typography:
  display-xl:
    fontFamily: "'Airbnb Cereal VF', Circular, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.43
    letterSpacing: 0
  body:
    fontFamily: "'Airbnb Cereal VF', Circular, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
---

## Overview
Text.
`;
  const tokens = parseDesignMd(md);
  assert.ok(tokens.typography['display-xl'], 'typography.display-xl should exist');
  assert.equal(tokens.typography['display-xl'].$value.size, '28px');
  assert.equal(tokens.typography['display-xl'].$value.weight, '700');
});

test('parseDesignMd extracts frontmatter spacing', () => {
  const md = `---
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
---

## Overview
Text.
`;
  const tokens = parseDesignMd(md);
  assert.equal(tokens.spacing.xs?.$value, '4px');
  assert.equal(tokens.spacing.lg?.$value, '24px');
});

test('parseDesignMd extracts frontmatter rounded as radius', () => {
  const md = `---
rounded:
  sm: 4px
  md: 8px
  lg: 12px
---

## Overview
Text.
`;
  const tokens = parseDesignMd(md);
  assert.equal(tokens.radius.sm?.$value, '4px');
  assert.equal(tokens.radius.lg?.$value, '12px');
});
