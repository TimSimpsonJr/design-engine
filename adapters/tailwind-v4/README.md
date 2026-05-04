# tailwind-v4 adapter

Base CSS layer for any Tailwind v4 project. Provides:

- `theme.css` — semantic tokens as CSS custom properties (colors, spacing, radii, shadows, motion). Defaults to the toss palette; overwritten by `/design-skin <name>`.
- `base.css` — element resets, accessibility helpers (touch targets, focus rings, safe-area padding), and `prefers-reduced-motion` overrides.
- `fonts.css` — font import boilerplate (Inter by default).
- `index.css` — entry point that imports the others in correct order.

This adapter is the foundation for `react-shadcn`, `astro`, and `sveltekit` adapters via `extends`. Use directly only if your project is plain Tailwind v4 without a specific framework integration.

CSS files originally from [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT) — see `/LICENSE` and `/NOTICE` for full attribution.
