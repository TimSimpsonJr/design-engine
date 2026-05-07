import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { handleGetTokens, handlePostTokens } from '../adapters/react-shadcn/templates/vite-plugin-design-engine.ts';

test('GET /api/tokens returns tokens.json contents as JSON', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-api-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(tmpDir, 'tokens.json'), JSON.stringify({
    color: { $type: 'color', brand: { $value: '#abc123' } }
  }));
  const result = await handleGetTokens({ projectRoot: tmpDir });
  assert.equal(result.color.brand.$value, '#abc123');
});

test('POST /api/tokens validates W3C shape and rejects malformed', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-api-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(tmpDir, '.design-rules'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'tokens.json'), '{}');
  fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'globals.css'), ':root { --brand: #old; }');
  fs.writeFileSync(path.join(tmpDir, '.design-rules', 'config.json'),
    JSON.stringify({ schemaVersion: 2, themeFile: 'src/app/globals.css' }));

  // malformed: missing $value
  const malformed = { color: { brand: { value: '#wrong' } } };
  await assert.rejects(() => handlePostTokens({ projectRoot: tmpDir, body: malformed }));
});

test('POST /api/tokens writes tokens.json and regenerates themeFile', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-api-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(tmpDir, '.design-rules'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'tokens.json'), '{}');
  fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'globals.css'), ':root { --brand: #old; --custom: 1px; }');
  fs.writeFileSync(path.join(tmpDir, '.design-rules', 'config.json'),
    JSON.stringify({ schemaVersion: 2, themeFile: 'src/app/globals.css' }));

  const newTokens = { color: { $type: 'color', brand: { $value: '#new' } } };
  await handlePostTokens({ projectRoot: tmpDir, body: newTokens });

  const written = JSON.parse(fs.readFileSync(path.join(tmpDir, 'tokens.json'), 'utf8'));
  assert.equal(written.color.brand.$value, '#new');

  const css = fs.readFileSync(path.join(tmpDir, 'src', 'app', 'globals.css'), 'utf8');
  assert.match(css, /--brand:\s*#new/);
  assert.match(css, /--custom:\s*1px/);  // user-added preserved
});
