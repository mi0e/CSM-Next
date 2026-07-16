/**
 * Pure ping-node field helpers (no DOM / no settings store).
 */

/** Node-level field for edit/save. Empty means inherit global settings. */
export function nodePingField(value) {
  return String(value ?? '').trim()
}

/**
 * Effective host for install/display:
 * node override first, then global settings value.
 */
export function effectivePingNode(serverValue, settingsValue = '') {
  return String(serverValue || settingsValue || '').trim()
}
