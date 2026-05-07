import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseThemeCss } from '../adapters/react-shadcn/templates/theme-css-parse.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(here, 'fixtures', name);

test('parseThemeCss handles shadcn @theme inline + :root', () => {
  const css = fs.readFileSync(fix('shadcn-globals.css'), 'utf8');
  const tokens = parseThemeCss(css);
  assert.ok(Object.keys(tokens.color).filter(k => k !== '$type').length > 0, 'extracted some colors');
});

test('parseThemeCss handles Tailwind v4 standalone @theme', () => {
  const css = fs.readFileSync(fix('tailwind-v4-theme.css'), 'utf8');
  const tokens = parseThemeCss(css);
  assert.ok(Object.keys(tokens.color).filter(k => k !== '$type').length > 0);
});

test('parseThemeCss extracts oklch values verbatim', () => {
  const css = `:root { --color-accent: oklch(0.7 0.15 30); }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.accent?.$value, 'oklch(0.7 0.15 30)');
});

test('parseThemeCss extracts hsl, rgba, hex values', () => {
  const css = `:root {
    --color-a: #abc123;
    --color-b: hsl(120 50% 50%);
    --color-c: rgba(0,0,0,0.5);
  }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.a?.$value, '#abc123');
  assert.equal(tokens.color.b?.$value, 'hsl(120 50% 50%)');
  assert.equal(tokens.color.c?.$value, 'rgba(0,0,0,0.5)');
});

test('parseThemeCss tolerates unparseable values — leaves TODO stub', () => {
  const css = `:root { --color-weird: calc(var(--a) + var(--b)); }`;
  const tokens = parseThemeCss(css);
  assert.ok(tokens);
});

test('parseThemeCss strips --color- prefix', () => {
  const css = `:root { --color-primary: #ff0000; --color-accent: #00ff00; }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.primary?.$value, '#ff0000');
  assert.equal(tokens.color.accent?.$value, '#00ff00');
});

test('parseThemeCss strips --radius- prefix', () => {
  const css = `:root { --radius-sm: 0.25rem; --radius-lg: 1rem; }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.radius.sm?.$value, '0.25rem');
  assert.equal(tokens.radius.lg?.$value, '1rem');
});

test('parseThemeCss bare --radius maps to radius.default', () => {
  const css = `:root { --radius: 0.5rem; }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.radius.default?.$value, '0.5rem');
});

test('parseThemeCss strips --font- prefix', () => {
  const css = `:root { --font-sans: 'Inter', sans-serif; }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.font.sans?.$value, "'Inter', sans-serif");
});

test('parseThemeCss strips --shadow- prefix', () => {
  const css = `:root { --shadow-sm: 0 1px 2px rgba(0,0,0,0.05); }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.shadow.sm?.$value, '0 1px 2px rgba(0,0,0,0.05)');
});

test('parseThemeCss strips --spacing- prefix', () => {
  const css = `:root { --spacing-lg: 2rem; --spacing-xl: 4rem; }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.spacing.lg?.$value, '2rem');
  assert.equal(tokens.spacing.xl?.$value, '4rem');
});

test('parseThemeCss strips --duration- prefix into motion group', () => {
  const css = `:root { --duration-fast: 150ms; --duration-slow: 500ms; }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.motion.fast?.$value, '150ms');
  assert.equal(tokens.motion.slow?.$value, '500ms');
});

test('parseThemeCss flat names without prefix use value-based detection', () => {
  const css = `:root { --brand: #6d28d9; --surface: #ffffff; }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.brand?.$value, '#6d28d9');
  assert.equal(tokens.color.surface?.$value, '#ffffff');
});

test('parseThemeCss initializes all standard groups even if empty', () => {
  const css = `:root { --color-primary: #000; }`;
  const tokens = parseThemeCss(css);
  assert.ok(tokens.color);
  assert.ok(tokens.font);
  assert.ok(tokens.typography);
  assert.ok(tokens.spacing);
  assert.ok(tokens.radius);
  assert.ok(tokens.shadow);
  assert.equal(tokens.color.$type, 'color');
  assert.equal(tokens.font.$type, 'fontFamily');
  assert.equal(tokens.spacing.$type, 'dimension');
  assert.equal(tokens.radius.$type, 'dimension');
  assert.equal(tokens.shadow.$type, 'shadow');
});

test('parseThemeCss marks var()/calc() values as unparseable', () => {
  const css = `:root { --color-computed: calc(var(--a) + 10px); }`;
  const tokens = parseThemeCss(css);
  const ext = (tokens.color.computed as any)?.$extensions;
  assert.ok(ext?.designEngine?.unparseable, 'should be marked unparseable');
});

test('parseThemeCss first occurrence wins for duplicate var names', () => {
  const css = `
    @theme { --color-primary: #first; }
    :root { --color-primary: #second; }
  `;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.primary?.$value, '#first');
});

test('parseThemeCss handles :global wrapper in SvelteKit fixture', () => {
  const css = fs.readFileSync(fix('svelte-theme.css'), 'utf8');
  const tokens = parseThemeCss(css);
  assert.ok(Object.keys(tokens.color).filter(k => k !== '$type').length > 0, 'extracted colors from :global-wrapped :root');
  assert.ok(tokens.font.sans, 'extracted font-sans from :global-wrapped :root');
});

test('parseThemeCss handles Astro flat-name fixture', () => {
  const css = fs.readFileSync(fix('astro-theme.css'), 'utf8');
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.brand?.$value, '#6d28d9');
  assert.ok(tokens.radius.default, 'bare --radius maps to radius.default');
  assert.ok(tokens.spacing.md, 'spacing vars extracted');
  assert.ok(tokens.font.body, 'font vars extracted');
  assert.ok(tokens.shadow.sm, 'shadow vars extracted');
  assert.ok(tokens.motion.fast, 'duration vars extracted to motion group');
});

test('parseThemeCss extracts shadcn fixture shadows and spacing', () => {
  const css = fs.readFileSync(fix('shadcn-globals.css'), 'utf8');
  const tokens = parseThemeCss(css);
  assert.ok(tokens.shadow.sm, 'shadow-sm extracted');
  assert.ok(tokens.spacing.sidebar, 'spacing-sidebar extracted');
  assert.ok(tokens.radius.sm, 'radius-sm extracted');
  assert.ok(tokens.font.sans, 'font-sans extracted');
});

test('parseThemeCss extracts tailwind v4 fixture motion tokens', () => {
  const css = fs.readFileSync(fix('tailwind-v4-theme.css'), 'utf8');
  const tokens = parseThemeCss(css);
  assert.equal(tokens.motion.fast?.$value, '150ms');
  assert.equal(tokens.motion.normal?.$value, '300ms');
  assert.equal(tokens.motion.slow?.$value, '500ms');
  assert.ok(tokens.shadow.card, 'shadow-card extracted');
  assert.ok(tokens.font.display, 'font-display extracted');
});

test('parseThemeCss handles hsl with modern space syntax', () => {
  const css = `:root { --color-test: hsl(262 83% 58%); }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.test?.$value, 'hsl(262 83% 58%)');
});

test('parseThemeCss handles empty CSS gracefully', () => {
  const tokens = parseThemeCss('');
  assert.ok(tokens.color);
  assert.ok(tokens.font);
  assert.equal(Object.keys(tokens.color).filter(k => k !== '$type').length, 0);
});

test('parseThemeCss handles CSS with only comments', () => {
  const tokens = parseThemeCss('/* just a comment */');
  assert.ok(tokens.color);
});

test('parseThemeCss ignores commented-out declarations', () => {
  const css = `:root {
    /* --old-brand: #abc; */
    --brand: #def;
  }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.brand?.$value, '#def');
  assert.equal(tokens.color['old-brand'], undefined, 'commented-out var should not be extracted');
});

test('parseThemeCss marks env() and color-mix() as unparseable', () => {
  const css = `:root {
    --color-safe: env(safe-area-inset-top);
    --color-mixed: color-mix(in oklch, #abc 50%, #def);
  }`;
  const tokens = parseThemeCss(css);
  assert.equal(tokens.color.safe?.$extensions?.designEngine?.unparseable, true);
  assert.equal(tokens.color.mixed?.$extensions?.designEngine?.unparseable, true);
});
