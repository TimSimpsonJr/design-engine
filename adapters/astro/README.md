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

`writeCapable: true` — runtime token edits write back via dev-gated Astro integration. See `/design-settings-page` command.

## Attribution

Inspired by [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT). Astro-specific templates are original work; design rules adapted from styleseed.
