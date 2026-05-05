import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createGoogleFontsCatalogFetcher,
  type FontEntry,
} from '../adapters/react-shadcn/templates/google-fonts-catalog.ts';

const XSSI_PREFIX = ")]}'\n";

function buildResponseText(families: Array<{ family: string; weights?: number[] }>) {
  const list = families.map(({ family, weights }) => ({
    family,
    category: 'sans-serif',
    fonts: weights ? Object.fromEntries(weights.map((w) => [String(w), {}])) : { '400': {}, '700': {} },
  }));
  return XSSI_PREFIX + JSON.stringify({ familyMetadataList: list });
}

function makeOkResponse(text: string): Response {
  return new Response(text, { status: 200, headers: { 'content-type': 'application/json' } });
}

type FetchSpy = {
  fn: typeof fetch;
  callCount: () => number;
};

function spyFetch(impl: () => Promise<Response>): FetchSpy {
  let calls = 0;
  const fn: typeof fetch = async () => {
    calls += 1;
    return impl();
  };
  return { fn, callCount: () => calls };
}

test('fetch: first call invokes upstream and returns parsed list', async () => {
  const spy = spyFetch(async () => makeOkResponse(buildResponseText([{ family: 'Inter' }, { family: 'Roboto' }])));
  let nowValue = 1000;
  const get = createGoogleFontsCatalogFetcher({ now: () => nowValue, fetchImpl: spy.fn });
  const out = await get();
  assert.equal(spy.callCount(), 1);
  assert.equal(out.length, 2);
  assert.equal(out[0].family, 'Inter');
});

test('fetch: second call within TTL returns cached without re-fetching', async () => {
  const spy = spyFetch(async () => makeOkResponse(buildResponseText([{ family: 'Inter' }])));
  let nowValue = 0;
  const get = createGoogleFontsCatalogFetcher({ now: () => nowValue, fetchImpl: spy.fn, ttlMs: 1000 });
  await get();
  nowValue = 500;
  const second = await get();
  assert.equal(spy.callCount(), 1);
  assert.equal(second.length, 1);
});

test('fetch: call past TTL re-fetches', async () => {
  const spy = spyFetch(async () => makeOkResponse(buildResponseText([{ family: 'Inter' }])));
  let nowValue = 0;
  const get = createGoogleFontsCatalogFetcher({ now: () => nowValue, fetchImpl: spy.fn, ttlMs: 1000 });
  await get();
  nowValue = 1500;
  await get();
  assert.equal(spy.callCount(), 2);
});

test('fetch: concurrent calls during in-flight fetch share one promise (single-flight)', async () => {
  let resolveFetch: ((response: Response) => void) | null = null;
  const fetchImpl: typeof fetch = () => new Promise<Response>((resolve) => { resolveFetch = resolve; });
  let calls = 0;
  const wrapped: typeof fetch = (...args) => { calls += 1; return fetchImpl(...args); };
  const get = createGoogleFontsCatalogFetcher({ fetchImpl: wrapped });

  const a = get();
  const b = get();
  const c = get();
  assert.equal(calls, 1, 'only one upstream fetch should be in flight');
  resolveFetch!(makeOkResponse(buildResponseText([{ family: 'Inter' }])));
  const [ra, rb, rc] = await Promise.all([a, b, c]);
  assert.equal(ra, rb);
  assert.equal(rb, rc);
  assert.equal(calls, 1);
});

test('fetch: failure with stale cache returns stale and does not throw', async () => {
  let mode: 'ok' | 'fail' = 'ok';
  const spy = spyFetch(async () => {
    if (mode === 'ok') return makeOkResponse(buildResponseText([{ family: 'Inter' }]));
    throw new Error('network down');
  });
  let nowValue = 0;
  const get = createGoogleFontsCatalogFetcher({ now: () => nowValue, fetchImpl: spy.fn, ttlMs: 1000 });
  const first = await get();
  assert.equal(first.length, 1);

  mode = 'fail';
  nowValue = 5000;
  const second = await get();
  assert.deepEqual(second, first, 'stale cache should be returned on failure');
});

test('fetch: failure with no cache throws', async () => {
  const spy = spyFetch(async () => { throw new Error('network down'); });
  const get = createGoogleFontsCatalogFetcher({ fetchImpl: spy.fn });
  await assert.rejects(get(), /network down/);
});

test('fetch: non-200 response is treated as failure', async () => {
  const spy = spyFetch(async () => new Response('Service unavailable', { status: 503 }));
  const get = createGoogleFontsCatalogFetcher({ fetchImpl: spy.fn });
  await assert.rejects(get(), /HTTP 503/);
});

test('fetch: malformed JSON is treated as failure', async () => {
  const spy = spyFetch(async () => makeOkResponse('not actually json {{{'));
  const get = createGoogleFontsCatalogFetcher({ fetchImpl: spy.fn });
  await assert.rejects(get());
});

test('fetch: empty catalog response is treated as failure (so cache stays empty)', async () => {
  const spy = spyFetch(async () => makeOkResponse(XSSI_PREFIX + JSON.stringify({ familyMetadataList: [] })));
  const get = createGoogleFontsCatalogFetcher({ fetchImpl: spy.fn });
  await assert.rejects(get(), /Empty catalog/);
});

test('fetch: TTL expiry with successful refresh updates cache', async () => {
  let firstFetch = true;
  const spy = spyFetch(async () => {
    const fams: Array<{ family: string; weights?: number[] }> = firstFetch
      ? [{ family: 'Inter' }]
      : [{ family: 'Roboto' }, { family: 'Geist' }];
    firstFetch = false;
    return makeOkResponse(buildResponseText(fams));
  });
  let nowValue = 0;
  const get = createGoogleFontsCatalogFetcher({ now: () => nowValue, fetchImpl: spy.fn, ttlMs: 1000 });
  const first = await get();
  assert.equal(first.length, 1);
  nowValue = 1500;
  const second = await get();
  assert.equal(second.length, 2);
  assert.equal(second[0].family, 'Roboto');
});
