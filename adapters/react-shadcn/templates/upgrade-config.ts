/**
 * Backward-compat upgrade path helpers for design-engine config.
 *
 * Detects pre-schemaVersion-2 configs and migrates them forward.
 * Consumed by /design-init upgrade orchestrator (Task 5.5b).
 */

export function detectOldFormat(config: any): boolean {
  return !config.schemaVersion || config.schemaVersion < 2;
}

export function upgradeConfig(old: any, additions: { themeFile: string }): any {
  return { ...old, schemaVersion: 2, themeFile: additions.themeFile };
}
