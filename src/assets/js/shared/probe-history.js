export const PROBE_LINES = Object.freeze([
  Object.freeze({ id: 'CT', ping: 'ping_ct', loss: 'loss_ct' }),
  Object.freeze({ id: 'CU', ping: 'ping_cu', loss: 'loss_cu' }),
  Object.freeze({ id: 'CM', ping: 'ping_cm', loss: 'loss_cm' }),
  Object.freeze({ id: 'BD', ping: 'ping_bd', loss: 'loss_bd' })
])

export const PROBE_HISTORY_HOURS = 1
export const PROBE_HISTORY_BUCKETS = 24

function timestamp(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return number < 10_000_000_000 ? number * 1000 : number
}

function metric(value, type) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return null
  if (type === 'loss' && number > 100) return null
  return number
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function rowsFrom(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.rows)) return value.rows
  return []
}

export function normalizeProbeHistory(value) {
  return rowsFrom(value).flatMap(row => {
    const time = timestamp(row?.timestamp ?? row?.ts ?? row?.report_timestamp ?? row?.last_updated)
    if (!time) return []
    const normalized = { timestamp: time }
    for (const line of PROBE_LINES) {
      const ping = metric(row?.[line.ping], 'latency')
      const loss = metric(row?.[line.loss], 'loss')
      if (ping !== null) normalized[line.ping] = ping
      if (loss !== null) normalized[line.loss] = loss
    }
    return [normalized]
  }).sort((left, right) => left.timestamp - right.timestamp)
}

export function mergeProbeHistory(existing, incoming, {
  now = Date.now(),
  hours = PROBE_HISTORY_HOURS,
  maxRows = 1000
} = {}) {
  const cutoff = now - hours * 60 * 60 * 1000
  const rows = new Map()
  for (const row of [...normalizeProbeHistory(existing), ...normalizeProbeHistory(incoming)]) {
    if (row.timestamp < cutoff || row.timestamp > now + 60_000) continue
    rows.set(row.timestamp, { ...(rows.get(row.timestamp) || {}), ...row })
  }
  return [...rows.values()]
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-maxRows)
}

function emptyBucket(start, end) {
  return {
    start,
    end,
    value: null,
    sampleCount: 0,
    probes: Object.fromEntries(PROBE_LINES.map(line => [line.id, null]))
  }
}

function finishBucket(bucket) {
  const probes = {}
  for (const line of PROBE_LINES) probes[line.id] = average(bucket.probeValues[line.id])
  return {
    start: bucket.start,
    end: bucket.end,
    value: average(bucket.values),
    sampleCount: bucket.values.length,
    probes
  }
}

export function summarizeProbeHistory(value, {
  now = Date.now(),
  hours = PROBE_HISTORY_HOURS,
  bucketCount = PROBE_HISTORY_BUCKETS
} = {}) {
  const count = Math.max(1, Math.floor(bucketCount))
  const duration = Math.max(1, Number(hours)) * 60 * 60 * 1000
  const start = now - duration
  const width = duration / count
  const rows = normalizeProbeHistory(value).filter(row => row.timestamp >= start && row.timestamp <= now + 1000)
  const types = ['latency', 'loss']
  const result = { rowCount: rows.length, start, end: now }

  for (const type of types) {
    const buckets = Array.from({ length: count }, (_, index) => ({
      start: start + index * width,
      end: start + (index + 1) * width,
      values: [],
      probeValues: Object.fromEntries(PROBE_LINES.map(line => [line.id, []]))
    }))
    const values = []
    for (const row of rows) {
      const bucketIndex = Math.min(count - 1, Math.max(0, Math.floor((row.timestamp - start) / width)))
      for (const line of PROBE_LINES) {
        const number = metric(row[type === 'latency' ? line.ping : line.loss], type)
        if (number === null) continue
        values.push(number)
        buckets[bucketIndex].values.push(number)
        buckets[bucketIndex].probeValues[line.id].push(number)
      }
    }
    result[type] = {
      average: average(values),
      sampleCount: values.length,
      buckets: buckets.map(bucket => bucket.values.length ? finishBucket(bucket) : emptyBucket(bucket.start, bucket.end))
    }
  }

  return result
}

export const PING_SPARKLINE_MIN_SPAN_MS = 5 * 60 * 1000

/**
 * Build normalized polyline points for a session latency trend fed purely by
 * live WebSocket samples (no history requests). Each row contributes the
 * average of its valid line latencies. Returns null with fewer than 2 points.
 */
export function pingSparkline(rows, { now = Date.now(), width = 100, height = 28, pad = 2 } = {}) {
  const series = normalizeProbeHistory(rows).flatMap(row => {
    const values = PROBE_LINES.map(line => row[line.ping])
      .filter(value => Number.isFinite(value) && value > 0)
    return values.length ? [{ t: row.timestamp, v: average(values) }] : []
  })
  if (series.length < 2) return null
  const span = Math.max(now - series[0].t, PING_SPARKLINE_MIN_SPAN_MS)
  const start = now - span
  const values = series.map(point => point.v)
  const top = Math.max(...values) * 1.15 || 1
  const innerHeight = height - pad * 2
  const points = series.map(point => {
    const x = Math.min(width, Math.max(0, ((point.t - start) / span) * width))
    const y = pad + innerHeight - (point.v / top) * innerHeight
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return {
    points,
    min: Math.min(...values),
    max: Math.max(...values),
    latest: series[series.length - 1].v,
    count: series.length,
    spanMs: span
  }
}
