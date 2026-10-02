/**
 * Pure ping-node field helpers (no DOM / no settings store).
 */

// Latency color thresholds, aligned with upstream PING constants.
export const PING_GOOD_THRESHOLD = 100
export const PING_WARNING_THRESHOLD = 200

export const PROBE_LINES = Object.freeze([
  ...['ct', 'cu', 'cm', 'bd'].map(key => Object.freeze({
    id: key.toUpperCase(), key, ping: `ping_${key}`, loss: `loss_${key}`, name: `custom_${key}_name`
  })),
  ...[1, 2, 3, 4].map(index => Object.freeze({
    id: `NODE_${index}`, key: `node_${index}`, ping: `ping_node_${index}`, loss: `loss_node_${index}`,
    name: `node_${index}_name`, extra: true
  }))
])

export function probeLines(server = {}, config = {}, language = 'en') {
  return PROBE_LINES.filter(line => !isPingDisabled(server[line.ping]) &&
    (!line.extra || Object.hasOwn(server, line.ping))).map(line => ({
    ...line,
    label: String(server[line.name] || config[line.name] ||
      (line.extra ? `${language === 'zh' ? '节点' : 'Node '}${line.key.slice(-1)}` : line.id))
  }))
}

export function probeMetric(value, type = 'ping') {
  if (value == null || typeof value === 'boolean' || String(value).trim() === '' || isPingDisabled(value)) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || (type === 'ping' ? parsed <= 0 : parsed < 0 || parsed > 100)) return null
  return parsed
}

/**
 * Upstream marks probe lines disabled in site settings with false/'false';
 * disabled lines must be hidden entirely instead of shown as timeouts.
 */
export function isPingDisabled(value) {
  return value === false || value === 'false'
}

/** A usable latency sample: enabled, present, and a positive integer. */
export function isPingValid(value) {
  return probeMetric(value) !== null
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
