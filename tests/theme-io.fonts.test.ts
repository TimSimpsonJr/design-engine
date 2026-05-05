import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdir, copyFile, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFontImports, buildGoogleFontsUrl } from '../adapters/react-shadcn/templates/theme-io.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(here, 'fixtures', name);
const TMP = join(here, 'tmp', 'fonts');

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
