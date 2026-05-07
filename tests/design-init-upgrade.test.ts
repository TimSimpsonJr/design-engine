import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { runDesignInitUpgrade } from '../adapters/react-shadcn/templates/upgrade-config.ts';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(here, 'fixtures', 'old-project');

test('upgrade produces DESIGN.md, tokens.json, register.md, and bumps schemaVersion', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-test-'));
  fs.cpSync(FIXTURE, tmpDir, { recursive: true });

  await runDesignInitUpgrade(tmpDir);

  assert.ok(fs.existsSync(path.join(tmpDir, 'DESIGN.md')), 'DESIGN.md created');
  assert.ok(fs.existsSync(path.join(tmpDir, 'tokens.json')), 'tokens.json created');
  assert.ok(fs.existsSync(path.join(tmpDir, 'register.md')), 'register.md created');

  const config = JSON.parse(fs.readFileSync(path.join(tmpDir, '.design-rules/config.json'), 'utf8'));
  assert.equal(config.schemaVersion, 2);
  assert.ok(config.themeFile, 'themeFile set in config');

  const tokens = JSON.parse(fs.readFileSync(path.join(tmpDir, 'tokens.json'), 'utf8'));
  assert.equal(tokens.color?.brand?.$value, '#533afd');

  const register = fs.readFileSync(path.join(tmpDir, 'register.md'), 'utf8');
  assert.match(register, /## 1\. Color Stance/);
  assert.match(register, /## 5\. Material Posture/);

  const globals = fs.readFileSync(path.join(tmpDir, 'src/app/globals.css'), 'utf8');
  assert.match(globals, /--user-custom:\s*99px/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('upgrade detects user-customized values diverging from bundled skin', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-test-'));
  fs.cpSync(FIXTURE, tmpDir, { recursive: true });

  const customGlobals = fs.readFileSync(path.join(tmpDir, 'src/app/globals.css'), 'utf8')
    .replace('--brand: #533afd', '--brand: #ff0000');
  fs.writeFileSync(path.join(tmpDir, 'src/app/globals.css'), customGlobals);

  const result = await runDesignInitUpgrade(tmpDir);

  const tokens = JSON.parse(fs.readFileSync(path.join(tmpDir, 'tokens.json'), 'utf8'));
  assert.equal(tokens.color?.brand?.$value, '#ff0000');

  assert.ok(result.warnings?.some((w: string) => w.includes('customized') || w.includes('diverge')));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
