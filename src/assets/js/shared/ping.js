/**
 * Pure ping-node field helpers (no DOM / no settings store).
 */

// Latency color thresholds, aligned with upstream PING constants.
export const PING_GOOD_THRESHOLD = 100
export const PING_WARNING_THRESHOLD = 200

/**
 * Upstream marks probe lines disabled in site settings with false/'false';
 * disabled lines must be hidden entirely instead of shown as timeouts.
 */
export function isPingDisabled(value) {
  return value === false || value === 'false'
}

/** A usable latency sample: enabled, present, and a positive integer. */
export function isPingValid(value) {
  if (isPingDisabled(value)) return false
  if (value === null || value === undefined || value === '' || value === '0') return false
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) && number > 0
}

/** Severity class for a latency value: '' good, 'warn', or 'bad' (also timeouts). */
export function pingLevel(value) {
  if (!isPingValid(value)) return 'bad'
  const number = Number.parseInt(value, 10)
  if (number < PING_GOOD_THRESHOLD) return ''
  return number < PING_WARNING_THRESHOLD ? 'warn' : 'bad'
}

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
