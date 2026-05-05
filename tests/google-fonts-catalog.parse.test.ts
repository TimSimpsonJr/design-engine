import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseGoogleFontsResponse } from '../adapters/react-shadcn/templates/google-fonts-catalog.ts';

const XSSI_PREFIX = ")]}'\n";

function wrap(metadata: object): string {
  return XSSI_PREFIX + JSON.stringify(metadata);
}

test('parse: strips XSSI prefix followed by newline', () => {
  const raw = wrap({ familyMetadataList: [{ family: 'Inter', category: 'sans-serif', fonts: { '400': {} } }] });
  const out = parseGoogleFontsResponse(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].family, 'Inter');
});

test('parse: tolerates BOM before XSSI prefix', () => {
  const raw = '﻿' + wrap({ familyMetadataList: [{ family: 'Inter', category: 'sans-serif', fonts: { '400': {} } }] });
  const out = parseGoogleFontsResponse(raw);
  assert.equal(out.length, 1);
});

test('parse: tolerates raw JSON with no prefix', () => {
  const raw = JSON.stringify({ familyMetadataList: [{ family: 'Inter', category: 'sans-serif', fonts: { '400': {} } }] });
  const out = parseGoogleFontsResponse(raw);
  assert.equal(out.length, 1);
});

test('parse: empty familyMetadataList returns []', () => {
  const out = parseGoogleFontsResponse(wrap({ familyMetadataList: [] }));
  assert.deepEqual(out, []);
});

test('parse: missing familyMetadataList returns []', () => {
  const out = parseGoogleFontsResponse(wrap({ somethingElse: 1 }));
  assert.deepEqual(out, []);
});

test('parse: variable-axis font emits axisRange and no weights', () => {
  const raw = wrap({
    familyMetadataList: [
      {
        family: 'Inter',
        category: 'sans-serif',
        axes: [{ tag: 'wght', min: 100, max: 900 }],
        fonts: { '400': {}, '700': {} },
      },
    ],
  });
  const out = parseGoogleFontsResponse(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].axisRange, '100..900');
  assert.equal(out[0].weights, undefined);
});

test('parse: axis range rounds non-integer min/max', () => {
  const raw = wrap({
    familyMetadataList: [
      { family: 'Inter', category: 'sans-serif', axes: [{ tag: 'wght', min: 100.7, max: 899.4 }] },
    ],
  });
  const out = parseGoogleFontsResponse(raw);
  assert.equal(out[0].axisRange, '101..899');
});

test('parse: static-axis font emits sorted weights', () => {
  const raw = wrap({
    familyMetadataList: [
      { family: 'Roboto', category: 'sans-serif', fonts: { '700': {}, '400': {}, '500': {} } },
    ],
  });
  const out = parseGoogleFontsResponse(raw);
  assert.deepEqual(out[0].weights, [400, 500, 700]);
});

test('parse: single-weight 400 omits weights field', () => {
  const raw = wrap({
    familyMetadataList: [
      { family: 'Pacifico', category: 'handwriting', fonts: { '400': {} } },
    ],
  });
  const out = parseGoogleFontsResponse(raw);
  assert.equal(out[0].weights, undefined);
});

test('parse: filters non-numeric weight keys', () => {
  const raw = wrap({
    familyMetadataList: [
      { family: 'Roboto', category: 'sans-serif', fonts: { '400': {}, '700': {}, italic: {}, '400italic': {} } },
    ],
  });
  const out = parseGoogleFontsResponse(raw);
  assert.deepEqual(out[0].weights, [400, 700]);
});

test('parse: filters out-of-range weight keys', () => {
  const raw = wrap({
    familyMetadataList: [
      { family: 'Roboto', category: 'sans-serif', fonts: { '400': {}, '50': {}, '1500': {} } },
    ],
  });
  const out = parseGoogleFontsResponse(raw);
  // 50 and 1500 dropped; 400 alone collapses to no weights field.
  assert.equal(out[0].weights, undefined);
});

test('parse: normalizes category lowercase + underscore→dash', () => {
  const raw = wrap({
    familyMetadataList: [
      { family: 'Inter', category: 'SANS_SERIF', fonts: { '400': {}, '700': {} } },
    ],
  });
  const out = parseGoogleFontsResponse(raw);
  assert.equal(out[0].category, 'sans-serif');
});

test('parse: defaults missing/empty category to sans-serif', () => {
  const raw = wrap({
    familyMetadataList: [
      { family: 'Inter', fonts: { '400': {}, '700': {} } },
      { family: 'Roboto', category: '', fonts: { '400': {}, '700': {} } },
    ],
  });
  const out = parseGoogleFontsResponse(raw);
  assert.equal(out[0].category, 'sans-serif');
  assert.equal(out[1].category, 'sans-serif');
});

test('parse: skips entries with no family string', () => {
  const raw = wrap({
    familyMetadataList: [
      { family: 'Inter', category: 'sans-serif', fonts: { '400': {}, '700': {} } },
      { category: 'sans-serif' },
      { family: '', category: 'sans-serif' },
      { family: 42, category: 'sans-serif' },
    ],
  });
  const out = parseGoogleFontsResponse(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].family, 'Inter');
});
