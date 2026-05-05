# Design — Live Google Fonts catalog (issue #11)

**Status:** approved by codex (round 1, 2026-05-05).
**Implements:** [issue #11](https://github.com/TimSimpsonJr/design-engine/issues/11) — live Google Fonts catalog autocomplete in the runtime settings page.

## The actual problem

Issue #11 was filed describing the symptom — the autocomplete shows only 14 fonts — and assumed the live-catalog feature hadn't been built. Reading the code on `main` revealed it _has_ been built across all three direct-mode adapters (react-shadcn, astro, sveltekit). It fetches `https://fonts.google.com/metadata/fonts` from the browser, strips the XSSI prefix, normalizes the response to `FontEntry[]`, caches in `sessionStorage`, falls back to `OFFLINE_FONTS` (14 fonts) on failure.

It never works in any normal user environment. The metadata endpoint serves no `Access-Control-Allow-Origin` header and carries `Cross-Origin-Resource-Policy: same-site`. Browser CORS blocks the response, the client's `catch` block silently degrades to `OFFLINE_FONTS`, and users only ever see 14 fonts — exactly the symptom in the issue.

So this is not a feature build. It's a CORS bug fix that requires moving the catalog boundary from browser to dev server.

## Decisions (codex sign-off)

### Decision 1 — sourcing approach: server-side proxy.

The dev-only HTTP layer in each direct-mode adapter (Vite plugin, Astro integration, SvelteKit `+server.ts`) already owns `/__design/*`. Add a sibling `GET /__design/api/google-fonts` that fetches the metadata endpoint server-to-server (no CORS) and returns a normalized JSON array.

Rejected alternatives:
- **Bundled snapshot under `data/google-fonts.json`.** ~200KB+ added to every plugin install for a feature most users may never open; per-release refresh cadence is real maintenance burden; "where's the new font?" support drift.
- **Hybrid (snapshot + proxy refresh button).** Extra UI surface for no real user need yet.

### Decision 2 — proxy contract: normalize on the server.

The proxy returns clean `FontEntry[]`, not Google's raw payload. The XSSI-prefix stripping and `mapMetadataEntry` shape-conversion logic moves out of three client templates into one server-side helper.

```ts
type FontEntry = {
  family: string;
  category: string;
  weights?: number[];     // for static-axis families
  axisRange?: string;     // "100..900" for variable-axis families
};
```

Trade-off accepted: Google's response shape change becomes a server-side concern, not a client one. The shape rarely changes, and centralizing the parser means one place to fix.

### Decision 3 — caching: in-memory, 24h TTL, single-flight, serve-stale-on-failure.

Module-scope cache in the helper. Behavior:

- First request → fetch upstream, store with timestamp, return.
- Subsequent request within 24h → return cached.
- Subsequent request past 24h → re-fetch.
  - On success → update cache, return new.
  - On failure with stale cache present → return stale, keep serving stale until next successful refresh.
  - On failure with no cache → propagate error (client falls back to `OFFLINE_FONTS`).
- Concurrent requests during a fetch in flight → all await the same promise (single-flight dedupe).

No on-disk cache. Dev servers restart often; in-memory is sufficient and avoids `.design-rules/cache/` IO error handling.

The browser's existing `sessionStorage` cache stays — it de-duplicates within a single tab session, which is the most common user case. Bump the cache key from `de-google-fonts-catalog-v1` to `v2` to invalidate stale entries from the old absolute-URL fetch path.

### Decision 4 — failure-mode UX: visible inline hint when catalog falls back.

When the client is on `OFFLINE_FONTS` because the proxy fetch failed, render an inline hint above the suggestions list:

> _Couldn't load the full Google Fonts catalog. Showing common fonts only._

Only render when `catalogState === 'failed'`. No retry button — most failures here are policy/network/environmental (proxy down, fetch from Google failed, parse failed). Retry mostly produces noise. The hint is enough signal that the user can investigate or restart the dev server if they care.

## Affected files

### New

- `adapters/react-shadcn/templates/google-fonts-catalog.ts` — server-side helper (`fetchGoogleFontsCatalog()`, `parseGoogleFontsResponse()`, in-memory cache).
- `adapters/astro/templates/google-fonts-catalog.ts` — byte-identical copy.
- `adapters/sveltekit/templates/google-fonts-catalog.ts` — byte-identical copy.
- `tests/google-fonts-catalog.parse.test.ts` — XSSI prefix stripping, BOM, empty payload, weight extraction, variable axis, category normalization.
- `tests/google-fonts-catalog.fetch.test.ts` — TTL behavior, single-flight dedupe, serve-stale-on-failure, propagate-error-on-no-cache (uses a swappable fetch impl injected via constructor or factory to avoid hitting Google in tests).

Tests import from `../adapters/react-shadcn/templates/google-fonts-catalog.ts` (canonical source — same pattern as the existing `theme-io.*.test.ts` files). The astro and sveltekit copies must remain byte-identical; verify with `diff -q` before commit.

Tests use `createGoogleFontsCatalogFetcher({ now, fetchImpl })` to get an isolated fetcher per test case — no shared module state, no test-only reset hook needed.

### Modified

- `adapters/react-shadcn/templates/vite-plugin-design-engine.ts` — register `GET /__design/api/google-fonts` route.
- `adapters/astro/templates/astro-integration-design-engine.ts` — same.
- `adapters/sveltekit/templates/api-tokens-server.ts` — unchanged (route is for `/__design/api/tokens` only). Add a new `adapters/sveltekit/templates/api-google-fonts-server.ts` that becomes `src/routes/__design/api/google-fonts/+server.ts` in the user project. **This split is required by SvelteKit's file-based routing**, not a stylistic choice — one `+server.ts` file owns one route path. Co-locating the GET handler in the existing tokens `+server.ts` is not possible.
- `adapters/react-shadcn/templates/__design-page.ts` — change fetch URL to `/__design/api/google-fonts`; drop `stripJsonPrefix` and `mapMetadataEntry`; bump cache key to `v2`; render fallback hint when `catalogState === 'failed'`.
- `adapters/astro/templates/__design-page.ts` — byte-identical changes (same file content per existing `diff -q` invariant).
- `adapters/sveltekit/templates/settings-page.svelte` — equivalent changes in Svelte 5 idioms.
- `commands/design-settings-page.md` — Step 7.5/7.6/7.7 each gain one extra "copy `google-fonts-catalog.ts`" item; sveltekit Step 7.7 also copies the new `+server.ts`.
- `commands/design-init.md` — extend the migrate-flow artifact lookup table to include the new helper paths and the SvelteKit `api/google-fonts/+server.ts` route, so `/design-init --migrate` cleans them up correctly when switching adapters. Without this, set-difference cleanup misses the new files.
- `MANIFEST.md` — list the new helper file under each adapter; update Key Relationships to mention the proxy route.

### Not modified

- `data/font-sources.json` — independent. The `/design-skin` `@import` rewrite is unrelated to autocomplete sourcing.
- `tailwind-v4` adapter — base, no settings page.
- `plain-css` adapter — `writeCapable: "snippet"`, no dev server, no autocomplete.
- `obsidian-css` adapter — uses Obsidian PluginSettingTab API (not browser-side), out of scope here.

## Implementation contract for `google-fonts-catalog.ts`

```ts
// Pure parser — no side effects. Exported for tests.
export function parseGoogleFontsResponse(raw: string): FontEntry[];

// Factory that returns an isolated fetcher instance. Used by tests to get
// clean cache state per test case without a reset hook on shared module state.
export function createGoogleFontsCatalogFetcher(opts?: {
  now?: () => number;
  fetchImpl?: typeof fetch;
  ttlMs?: number;
}): () => Promise<FontEntry[]>;

// Default singleton — what the adapter route handlers import.
export const fetchGoogleFontsCatalog: () => Promise<FontEntry[]>;
```

`fetchGoogleFontsCatalog` is `createGoogleFontsCatalogFetcher()` with defaults. The factory pattern keeps generated user projects on a singleton (correct cache behavior across requests in one dev-server lifetime) while letting tests construct fresh isolated fetchers without touching module state.

Each fetcher instance:
- Returns cached value within TTL (default 24h).
- Single-flight dedupes concurrent calls (one in-flight promise; new callers `await` it).
- On TTL expiry, re-fetches.
- On fetch failure with stale cache present, returns stale.
- On fetch failure with no cache, throws.

The route handler in each adapter calls `fetchGoogleFontsCatalog()`, JSON-stringifies the result, and returns it. On thrown error, returns `503` with a JSON body of the shape `{ "ok": false, "error": "catalog_unavailable", "message": "Failed to load Google Fonts catalog" }` — explicit and parseable, in the same style as the existing tokens API error responses. The client treats any non-200 as `catalogState='failed'` and renders the inline hint.

## Test plan

`google-fonts-catalog.parse.test.ts` — pure unit tests of the parser:
1. Strips `)]}'` XSSI prefix followed by newline.
2. Strips BOM.
3. Tolerates leading whitespace before `(`/`[`/`{`.
4. Returns `[]` on empty `familyMetadataList`.
5. Variable-axis font (has `axes: [{tag: 'wght', min, max}]`) → returns `axisRange: "min..max"`, no `weights`.
6. Static-axis font (has `fonts: { '400': ..., '700': ... }`) → returns sorted `weights`.
7. Single-weight `{ '400': ... }` → returns no `weights` field.
8. Filters non-numeric/out-of-range weight keys.
9. Normalizes `category` (lowercase, underscore→dash).
10. Filters entries with no `family` string.

`google-fonts-catalog.fetch.test.ts` — uses injected `fetchImpl` and `now`:
1. First call fetches; stores; returns parsed list.
2. Second call within TTL returns cached without re-fetching.
3. Second call past TTL re-fetches; returns new list.
4. Concurrent calls during a fetch share one promise (single-flight).
5. Fetch failure with stale cache → returns stale, doesn't throw.
6. Fetch failure with no cache → throws.
7. Fetch returns non-200 → treated as failure (same as throw).
8. Fetch returns malformed JSON → treated as failure.

## Failure modes mapped end-to-end

| What fails | Server behavior | Client behavior |
|------------|-----------------|-----------------|
| Google upstream 5xx, network error | Return stale if any, else 503 | Stale: works as if 200. No stale: `catalogState='failed'`, render hint, use OFFLINE_FONTS. |
| Google response has new prefix the parser doesn't recognize | Parse fails → return stale if any, else 503 | Same as above. |
| Dev server proxy not registered (older settings-page generation) | 404 on `/__design/api/google-fonts` | `catalogState='failed'`, render hint, use OFFLINE_FONTS. (User runs `/design-settings-page` to refresh templates.) |
| Production build (no dev server) | Endpoint never registered or returns 404 | Same as above. (Settings page itself doesn't ship in production for direct-mode adapters anyway.) |
| First-time visit, browser offline | 503 from proxy (server can't reach Google) | `catalogState='failed'`, render hint, use OFFLINE_FONTS. |

## Out of scope for this PR

- On-disk cache survival across dev-server restarts.
- "Refresh catalog now" UI affordance.
- API-key-based Google Fonts Developer API path (filed for future if metadata endpoint shape becomes unstable).
- obsidian-css adapter changes.

## Cross-model review log

**Round 1 (codex, 2026-05-05).** I sent the four decisions above plus my leans (A, normalize, in-memory 24h, visible hint). Codex agreed on all four and added two refinements that I folded into the final design:
1. **Single-flight dedupe + serve-stale-on-failure.** Better than the implicit "drop to 14 fonts on first bad fetch" of my initial framing. Prevents flicker between full catalog and 14-font fallback after one bad request.
2. **Tests for the parser and orchestrator.** Hard quality bar to enforce; matched existing `theme-io.*.test.ts` pattern.

Also surfaced a missing decision I hadn't named explicitly: **defining the contract as a versioned internal format and bumping the `sessionStorage` key when the shape changes.** Folded in as the cache-key bump from `v1` to `v2`.

**Round 2 (codex, 2026-05-05).** Reviewed the design doc itself. Two blockers caught:
1. **Migrate-flow artifact table not updated.** The new helper and SvelteKit route weren't in `commands/design-init.md`'s `artifactSetFor(adapter)` table, so `/design-init --migrate` would have left them behind on adapter switches. Doc now lists `commands/design-init.md` as affected and enumerates the four new entries.
2. **Internal inconsistency in the helper contract.** The test plan said "swappable fetch impl injected via constructor or factory" but the implementation contract showed a module-scope singleton. Reconciled: factory returns isolated fetcher instances (`createGoogleFontsCatalogFetcher`), and the runtime singleton is `createGoogleFontsCatalogFetcher()` with defaults. Tests construct fresh fetchers per case; user projects use the singleton.

Also clarified that the SvelteKit template split is **required by file-based routing**, not a stylistic choice.
