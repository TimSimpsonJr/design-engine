# plain-css adapter

Vanilla HTML + CSS adapter for the design-engine plugin. No build step, no framework, no Tailwind. Drop-in for static sites, prototypes, or any project that just wants the design tokens.

## What's included

- `theme/theme.css` — semantic tokens as CSS custom properties (colors, fonts, spacing, radii, shadows, motion). Light + dark via `.dark` class.
- `templates/page.html` — HTML page scaffold with inline classes that map to the CSS variables. SaaS recipe shape.

## How it works

1. `/design-init` writes `theme/theme.css` to your project's `styles/` directory
2. Link it from your HTML: `<link rel="stylesheet" href="./styles/theme.css">`
3. `/design-page` outputs a `page.html` you can open directly in a browser

## Limitations

- No runtime settings page (no dev server to write back to disk). `/design-settings-page` produces a copyable CSS snippet instead.
- No component library — patterns are inline HTML+CSS examples.
- Dark mode requires manually toggling `.dark` on a parent element.

## Attribution

CSS values from [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT); HTML scaffold is original work.
