# sveltekit adapter

SvelteKit 2 + Svelte 5 + Tailwind v4 adapter for the design-engine plugin.

Extends `tailwind-v4` for CSS layer. Adds `.svelte` component templates targeting Svelte 5 runes (`$props()`, `$state()`, etc.).

## Target stack

- SvelteKit 2+
- Svelte 5 (runes mode)
- Tailwind v4 (via `@tailwindcss/vite`)

## Templates

- `templates/+page.svelte` — SvelteKit page scaffold
- `templates/component.svelte` — primitive component scaffold

## Settings page

`writeCapable: "direct"` — runtime token edits write back live to `src/lib/styles/theme.css` via a dev-gated `+server.ts` endpoint at `/__design/api/tokens`. The page itself lives at `/__design`. See `/design-settings-page` command.

Templates:

- `templates/settings-page.svelte` — Svelte 5 runes UI (light/dark editor, font picker with Google Fonts catalog autocomplete, demo, status indicator, 250 ms autosave debounce).
- `templates/api-tokens-server.ts` — installed at `src/routes/__design/api/tokens/+server.ts`. Gated by `dev` from `$app/environment` — returns 404 in production.
- `templates/theme-io.ts` — installed at `src/lib/server/design-engine/theme-io.ts`. Surgical CSS scanner + atomic file write (Windows-safe). Server-only by virtue of the `$lib/server/` path.

## Attribution

Inspired by [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT). Svelte-specific templates are original work; design rules adapted from styleseed.
