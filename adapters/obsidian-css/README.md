# obsidian-css adapter

Obsidian plugin adapter for the design-engine plugin. Targets Obsidian's vanilla CSS theme system; no Tailwind.

## What's included

- `theme/styles.css` — translates styleseed semantic tokens to Obsidian theme variables (`--background-primary`, `--text-normal`, etc.). Plugin UI inherits the user's Obsidian theme while applying design-engine spacing/typography/component rules.
- `templates/settings-tab.ts` — Obsidian PluginSettingTab template for the runtime settings UI

## How it works

- Plugin authors copy `theme/styles.css` to their plugin folder root (Obsidian loads it automatically)
- Apply layout via classes: `.design-engine-card`, `.design-engine-section`, `.design-engine-touchable`
- Use Obsidian's CSS variables (referenced via `--de-*` tokens) so theme changes propagate
- For runtime token tweaks, register the settings tab template

## Limitations

- Obsidian doesn't have routes — `/design-page` is not applicable for this adapter
- The settings tab is the equivalent of `/design-settings-page` in web adapters
- Component patterns (HeroCard, ChartCard, etc.) need to be hand-built from divs since Obsidian doesn't ship a component library

## Attribution

Token mapping inspired by [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT); Obsidian-specific translation is original work.
