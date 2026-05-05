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
