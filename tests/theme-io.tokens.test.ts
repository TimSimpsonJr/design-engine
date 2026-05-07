import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readTokensFromCss, writeTokensToCss } from '../adapters/react-shadcn/templates/theme-io.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(here, 'fixtures', name);

test('readTokensFromCss groups flat CSS vars by type-detection', () => {
  const css = fs.readFileSync(fix('theme-standard.css'), 'utf8');
  const tokens = readTokensFromCss(css);
  // type-detected: hex/oklch values → color group
  assert.equal(tokens.color.brand?.$value, '#721FE5');
  assert.equal(tokens.color.background?.$value, '#FAFAFA');
  assert.equal(tokens.color.destructive?.$value, '#d4183d');
});

test('readTokensFromCss recognizes radius-prefixed vars as radius group', () => {
  const css = `:root { --radius: 0.625rem; --radius-lg: 1rem; --brand: #abc; }`;
  const tokens = readTokensFromCss(css);
  assert.equal(tokens.radius.default?.$value, '0.625rem');
  assert.equal(tokens.radius.lg?.$value, '1rem');
  assert.equal(tokens.color.brand?.$value, '#abc');
});

test('readTokensFromCss recognizes font-prefixed vars as font group', () => {
  const css = `:root { --font-sans: 'Inter', system-ui; --font-mono: 'JetBrains Mono'; }`;
  const tokens = readTokensFromCss(css);
  assert.ok(tokens.font.sans);
  assert.ok(tokens.font.mono);
});

test('writeTokensToCss emits flat CSS var names without group prefix', () => {
  const tokens = {
    color: { $type: 'color', brand: { $value: '#ff385c' }, background: { $value: '#fff' } },
    radius: { $type: 'dimension', default: { $value: '0.625rem' }, lg: { $value: '1rem' } },
  };
  const css = writeTokensToCss(tokens);
  assert.match(css, /--brand:\s*#ff385c/);          // no --color- prefix
  assert.match(css, /--background:\s*#fff/);
  assert.match(css, /--radius:\s*0\.625rem/);       // 'default' → bare name
  assert.match(css, /--radius-lg:\s*1rem/);         // non-default → suffix
});

test('writeTokensToCss preserves user-added unmanaged CSS via surgical replacement', () => {
  const existing = `
    :root {
      --brand: #old;
      --my-custom: 42px;
    }
  `;
  const tokens = { color: { $type: 'color', brand: { $value: '#new' } } };
  const result = writeTokensToCss(tokens, { existing });
  assert.match(result, /--brand:\s*#new/);
  assert.match(result, /--my-custom:\s*42px/);  // user-added survives
});

test('writeTokensToCss respects configurable target file path', () => {
  // theme-io must support targeting an arbitrary CSS file path
  // (e.g., src/app/globals.css for derive mode), not just adapter's theme/theme.css.
  // This test verifies the function takes an `existing` string from any source.
  const tokens = { color: { $type: 'color', primary: { $value: '#abc' } } };
  const result = writeTokensToCss(tokens, { existing: ':root { --primary: #old; }' });
  assert.match(result, /--primary:\s*#abc/);
});
