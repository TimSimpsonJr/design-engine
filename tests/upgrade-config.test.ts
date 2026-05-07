import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { detectOldFormat, upgradeConfig } from '../adapters/react-shadcn/templates/upgrade-config.ts';

test('detectOldFormat identifies pre-schemaVersion-2 configs', () => {
  assert.equal(detectOldFormat({ skin: 'stripe', adapter: 'react-shadcn' }), true);
  assert.equal(detectOldFormat({ skin: 'stripe', adapter: 'react-shadcn', schemaVersion: 2 }), false);
});

test('upgradeConfig adds schemaVersion=2 and themeFile path', () => {
  const old = { skin: 'stripe', adapter: 'react-shadcn' };
  const upgraded = upgradeConfig(old, { themeFile: 'src/app/globals.css' });
  assert.equal(upgraded.schemaVersion, 2);
  assert.equal(upgraded.themeFile, 'src/app/globals.css');
});

test('upgradeConfig preserves all existing fields', () => {
  const old = { skin: 'stripe', adapter: 'react-shadcn', recipe: 'fintech', settingsPage: true };
  const upgraded = upgradeConfig(old, { themeFile: 'theme.css' });
  assert.equal(upgraded.recipe, 'fintech');
  assert.equal(upgraded.settingsPage, true);
});
