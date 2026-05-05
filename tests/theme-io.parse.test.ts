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
