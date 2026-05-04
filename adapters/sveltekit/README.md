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

`writeCapable: true` — runtime token edits write back via dev-gated `+server.ts` endpoint. See `/design-settings-page` command.

## Attribution

Inspired by [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT). Svelte-specific templates are original work; design rules adapted from styleseed.
