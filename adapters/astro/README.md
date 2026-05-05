# astro adapter

Astro 5 + Tailwind v4 adapter for the design-engine plugin.

Extends `tailwind-v4` for theme.css/base.css/fonts.css/index.css. Adds `.astro` component templates for `/design-page`, `/design-component`, and `/design-pattern`.

## Target stack

- Astro 5+
- Tailwind v4 (via `@tailwindcss/vite`)
- Optional: TypeScript

## Templates

- `templates/page.astro` — SaaS dashboard scaffold (substitute via `/design-page`)
- `templates/component.astro` — primitive component scaffold (substitute via `/design-component` or `/design-pattern`)

## Settings page

`writeCapable: "direct"` — runtime token edits write back live to `src/styles/theme.css` via a dev-only Astro integration that hooks `astro:server:setup` to register Vite middleware at `/__design/api/tokens`. The page itself lives at `/__design/`. See `/design-settings-page` command.

Templates:

- `templates/settings-page.astro` — legacy snippet-mode template (kept for reference; direct mode uses files below)
- `templates/astro-integration-design-engine.ts` — installed at `src/design-engine/`. Registers the dev middleware via `astro:server:setup` (only fires during `astro dev`, not `astro build`).
- `templates/__design-page.html` — installed at `src/design-engine/`. HTML shell for the settings page; loaded by the integration via `fs.readFile`.
- `templates/__design-page.ts` — installed at `src/design-engine/`. Compiled to `__design-page.js` via esbuild at scaffold time. Vanilla TypeScript with safe DOM construction (no `innerHTML`); light/dark editor, demo showcase, autosave, Google Fonts catalog.
- `templates/theme-io.ts` — installed at `src/design-engine/`. Surgical CSS scanner + atomic file write (Windows-safe).

## Attribution

Inspired by [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT). Astro-specific templates are original work; design rules adapted from styleseed.
