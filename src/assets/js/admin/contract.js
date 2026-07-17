function text(value) {
  return String(value ?? '')
}

function numberOr(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function checked(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

// Keep this payload in sync with CF-Server-Monitor's handleAdminAPI "edit" branch.
// Unsupported properties are deliberately ignored so the UI never implies that
// fields which the upstream handler discards were persisted.
export function createServerEditPayload(values = {}) {
  return {
    action: 'edit',
    id: text(values.id),
    name: text(values.name).trim(),
    server_group: text(values.server_group).trim() || 'Default',
    price: text(values.price),
    expire_date: text(values.expire_date),
    bandwidth: text(values.bandwidth),
    traffic_limit: text(values.traffic_limit),
    traffic_calc_type: text(values.traffic_calc_type) || 'total',
    reset_day: numberOr(values.reset_day, 1),
    report_interval: numberOr(values.report_interval, 60),
    ping_mode: text(values.ping_mode) || 'http',
    is_hidden: checked(values.is_hidden) ? '1' : '0'
  }
}
