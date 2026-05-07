import { test } from 'node:test';
import * as assert from 'node:assert';
import { emitDesignMdSkeleton } from '../adapters/react-shadcn/templates/design-md-emit.ts';

test('emitDesignMdSkeleton produces 9 sections with H1 stub', () => {
  const tokens = {
    color: { $type: 'color', brand: { $value: '#abc123' }, background: { $value: '#fff' } },
    font: { $type: 'fontFamily', sans: { $value: ['Inter', 'system-ui'] } },
  };
  const md = emitDesignMdSkeleton(tokens, { name: 'Acme Corp' });
  assert.match(md, /^# Design System Inspired by Acme Corp/m);
  assert.match(md, /^## 1\. Visual Theme & Atmosphere/m);
  assert.match(md, /^## 2\. Color Palette & Roles/m);
  assert.match(md, /^## 3\. Typography Rules/m);
  assert.match(md, /^## 4\. Component Stylings/m);
  assert.match(md, /^## 5\. Layout Principles/m);
  assert.match(md, /^## 6\. Depth & Elevation/m);
  assert.match(md, /^## 7\. Do's and Don'ts/m);
  assert.match(md, /^## 8\. Responsive Behavior/m);
  assert.match(md, /^## 9\. Agent Prompt Guide/m);
});

test('emitDesignMdSkeleton fills derivable sections, stubs others', () => {
  const tokens = {
    color: { $type: 'color', brand: { $value: '#ff385c' } },
    font: { $type: 'fontFamily', sans: { $value: ['Inter'] } },
  };
  const md = emitDesignMdSkeleton(tokens, { name: 'Test' });
  assert.match(md, /#ff385c/);                              // color value present
  assert.match(md, /Inter/);                                // font name present
  assert.match(md, /<!-- TODO: describe visual atmosphere/); // section 1 TODO
  assert.match(md, /<!-- TODO:.*[Dd]o's and [Dd]on'ts/);    // section 7 TODO
});

test('emitDesignMdSkeleton handles empty tokens gracefully', () => {
  const md = emitDesignMdSkeleton({}, { name: 'Empty' });
  assert.match(md, /^# Design System Inspired by Empty/m);
  assert.equal((md.match(/<!-- TODO:/g) || []).length >= 5, true);
});

test('emitDesignMdSkeleton emits diff-friendly suggestion mode for sync --reverse', () => {
  const tokens = { color: { $type: 'color', brand: { $value: '#new' } } };
  const md = emitDesignMdSkeleton(tokens, { name: 'Test', mode: 'suggestion' });
  assert.match(md, /^## 2\. Color Palette & Roles/m);
  assert.doesNotMatch(md, /^## 1\. Visual Theme/m);
});
