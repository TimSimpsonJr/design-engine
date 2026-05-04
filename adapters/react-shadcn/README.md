# react-shadcn adapter

Full React + Tailwind v4 + shadcn-style component library, ported from [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT). This is the canonical reference adapter for design-engine — the closest port to styleseed's original implementation.

## What's included

- **32 UI primitives** in `components/ui/` (Button, Card, Dialog, Input, Avatar, etc.) — shadcn-style, built on Radix UI + class-variance-authority
- **16 composed patterns** in `components/patterns/` (HeroCard, SectionCard, ChartCard, ListItem, BriefingCarousel, RankedList, etc.) — mobile dashboard building blocks
- **Vite + React 18 scaffold** in `scaffold/` (optional starter project — use `--scaffold` flag with `/design-init`)
- **Templates** in `templates/` for `/design-page`, `/design-pattern`, `/design-component` to scaffold new files

## Extends

This adapter extends `tailwind-v4` for theme.css/base.css/fonts.css/index.css. The base CSS layer applies; this adapter adds the component library on top.

## Tech stack

- React 18 + TypeScript
- Vite 6 + @tailwindcss/vite
- Tailwind CSS v4 (CSS-first)
- Radix UI primitives
- class-variance-authority + clsx + tailwind-merge
- Lucide React icons

## Attribution

Components ported verbatim from styleseed's `engine/components/` directory under MIT. Each file retains its original copyright with a porting note. Vite scaffold framework boilerplate is unchanged. See `/LICENSE` and `/NOTICE` for full attribution.
