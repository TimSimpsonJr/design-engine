/**
 * Backward-compat upgrade path helpers for design-engine config.
 *
 * Detects pre-schemaVersion-2 configs and migrates them forward.
 * Consumed by /design-init upgrade orchestrator (Task 5.5b).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDesignMd } from './design-md-parse.ts';
import { readTokensFromCss } from './theme-io.ts';
import type { Tokens, TokenGroup } from './theme-io.ts';

export function detectOldFormat(config: any): boolean {
  return !config.schemaVersion || config.schemaVersion < 2;
}

export function upgradeConfig(old: any, additions: { themeFile: string }): any {
  return { ...old, schemaVersion: 2, themeFile: additions.themeFile };
}

// ── Register template ──────────────────────────────────────────────

const REGISTER_TEMPLATE = `# Visual Register

## 1. Color Stance
<!-- TODO: describe temperature, saturation behavior, accent rules, neutral character -->

## 2. Spatial Logic
<!-- TODO: describe density, breathing room, asymmetry tendencies, grid relationship -->

## 3. Type Behavior
<!-- TODO: describe weight contrast, scale jumps, tracking habits, italic/serif role -->

## 4. Composition Moves
<!-- TODO: describe focal restraint, repetition tolerance, hierarchy mechanisms, ornament posture -->

## 5. Material Posture
<!-- TODO: describe flatness vs. depth, texture, gloss/matte, photographic vs. illustrative -->
`;

// ── Theme file auto-detection ──────────────────────────────────────

const COMMON_THEME_PATHS = [
  'src/app/globals.css',
  'src/styles/globals.css',
  'src/index.css',
  'app/globals.css',
];

function detectThemeFile(projectRoot: string): string | null {
  // Check components.json for tailwind.css path
  const componentsJsonPath = path.join(projectRoot, 'components.json');
  if (fs.existsSync(componentsJsonPath)) {
    try {
      const componentsJson = JSON.parse(fs.readFileSync(componentsJsonPath, 'utf8'));
      const tailwindCss = componentsJson?.tailwind?.css;
      if (tailwindCss && fs.existsSync(path.join(projectRoot, tailwindCss))) {
        return tailwindCss;
      }
    } catch {
      // ignore parse errors
    }
  }

  // Fall back to common locations
  for (const relPath of COMMON_THEME_PATHS) {
    if (fs.existsSync(path.join(projectRoot, relPath))) {
      return relPath;
    }
  }

  return null;
}

// ── Plugin root resolution ─────────────────────────────────────────

function resolvePluginRoot(explicit?: string): string {
  if (explicit) return explicit;
  // Walk up from this file's directory to find the repo root
  // (the dir containing data/design-systems/)
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  let dir = thisDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'data', 'design-systems'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return thisDir;
}

// ── Token merge ────────────────────────────────────────────────────

function mergeTokens(
  derived: Tokens,
  existing: Tokens,
): { merged: Tokens; warnings: string[] } {
  const warnings: string[] = [];
  // Deep-clone derived as the base
  const merged: Tokens = JSON.parse(JSON.stringify(derived));

  for (const group of Object.keys(existing)) {
    const existingGroup = existing[group] as TokenGroup;
    if (!merged[group]) {
      // Group only in existing CSS -- carry it over
      merged[group] = JSON.parse(JSON.stringify(existingGroup));
      continue;
    }

    const mergedGroup = merged[group] as TokenGroup;
    for (const key of Object.keys(existingGroup)) {
      if (key === '$type') continue;
      const existingVal = existingGroup[key];
      if (!existingVal || typeof existingVal !== 'object' || !('$value' in existingVal)) continue;

      const derivedVal = mergedGroup[key];
      if (derivedVal && typeof derivedVal === 'object' && '$value' in derivedVal) {
        // Both have this token -- check for divergence
        if (derivedVal.$value !== existingVal.$value) {
          warnings.push(
            `${group}.${key}: user-customized value "${existingVal.$value}" diverges from bundled skin value "${derivedVal.$value}"`
          );
          // Prefer existing (user-customized) value
          (mergedGroup as any)[key] = { $value: existingVal.$value };
        }
        // If values match, keep derived (already in merged)
      } else {
        // Token only in existing CSS (user-added) -- carry it over
        (mergedGroup as any)[key] = { $value: existingVal.$value };
      }
    }
  }

  return { merged, warnings };
}

// ── Main upgrade function ──────────────────────────────────────────

export interface UpgradeOptions {
  pluginRoot?: string;
}

export interface UpgradeResult {
  warnings: string[];
}

export async function runDesignInitUpgrade(
  projectRoot: string,
  options?: UpgradeOptions,
): Promise<UpgradeResult> {
  const pluginRoot = resolvePluginRoot(options?.pluginRoot);
  const warnings: string[] = [];

  // 1. Read config
  const configPath = path.join(projectRoot, '.design-rules', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!detectOldFormat(config)) {
    return { warnings: ['Config already at schemaVersion 2 or later; skipping upgrade.'] };
  }

  // 2. Get skin name
  const skin = config.skin || 'stripe';

  // 3. Read bundled DESIGN.md for the skin
  const designMdSrc = path.join(pluginRoot, 'data', 'design-systems', skin, 'DESIGN.md');
  if (!fs.existsSync(designMdSrc)) {
    throw new Error(`Bundled DESIGN.md not found for skin "${skin}" at ${designMdSrc}`);
  }
  const designMdContent = fs.readFileSync(designMdSrc, 'utf8');

  // 4. Stamp DESIGN.md into project root
  fs.writeFileSync(path.join(projectRoot, 'DESIGN.md'), designMdContent, 'utf8');

  // 5. Parse DESIGN.md -> derived tokens
  const derivedTokens = parseDesignMd(designMdContent);

  // 6. Auto-detect theme file
  const themeFile = detectThemeFile(projectRoot);
  if (!themeFile) {
    throw new Error('Could not auto-detect theme CSS file in project.');
  }

  // 7. Read existing CSS -> existing tokens
  const themeFilePath = path.join(projectRoot, themeFile);
  const existingCss = fs.readFileSync(themeFilePath, 'utf8');
  const existingTokens = readTokensFromCss(existingCss);

  // 8. Merge: prefer existing (user-customized) values where both exist
  const mergeResult = mergeTokens(derivedTokens, existingTokens);
  warnings.push(...mergeResult.warnings);

  // 9. Write tokens.json
  fs.writeFileSync(
    path.join(projectRoot, 'tokens.json'),
    JSON.stringify(mergeResult.merged, null, 2) + '\n',
    'utf8',
  );

  // 10. Stamp register.md
  fs.writeFileSync(path.join(projectRoot, 'register.md'), REGISTER_TEMPLATE, 'utf8');

  // 11. Upgrade config and write back
  const upgradedConfig = upgradeConfig(config, { themeFile });
  fs.writeFileSync(configPath, JSON.stringify(upgradedConfig, null, 2) + '\n', 'utf8');

  return { warnings };
}
