import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mergeProbeHistory, normalizeProbeHistory, normalizeProbeWindow, summarizeProbeHistory
} from '../src/assets/js/shared/probe-history.js'

const now = 1_700_000_000_000
const minute = 60_000

test('probe history keeps only valid reported latency and loss metrics', () => {
  const rows = normalizeProbeHistory({ rows: [{
    timestamp: now - minute,
    ping_ct: '42', ping_cu: '', ping_cm: -1,
    loss_ct: '2.5', loss_cu: 0, loss_cm: 120, loss_bd: false
  }] })

  assert.deepEqual(rows, [{
    timestamp: now - minute,
    ping_ct: 42,
    loss_ct: 2.5,
    loss_cu: 0
  }])
})

test('probe history converts the compact upstream ping and loss windows', () => {
  assert.deepEqual(normalizeProbeWindow({
    ping: [
      { ts: now - 2 * minute, ct: 42, cu: '55', cm: null, bd: false },
      { ts: now - minute, ct: 48, cm: 61 }
    ],
    loss: [
      { ts: now - 2 * minute, ct: 0, cu: 2, cm: 100, bd: false },
      { ts: now - minute, ct: 1, cm: 3 }
    ]
  }), [
    { timestamp: now - 2 * minute, ping_ct: 42, loss_ct: 0, ping_cu: 55, loss_cu: 2, loss_cm: 100 },
    { timestamp: now - minute, ping_ct: 48, loss_ct: 1, ping_cm: 61, loss_cm: 3 }
  ])
})

test('probe history accepts the common data-array response envelope', () => {
  assert.deepEqual(normalizeProbeHistory({
    data: [{ timestamp: now - minute, ping_ct: 42 }]
  }), [{ timestamp: now - minute, ping_ct: 42 }])
})

test('probe history summarizes the last hour into chronological real buckets', () => {
  const rows = [
    { timestamp: now - 55 * minute, ping_ct: 40, ping_cu: 60, loss_ct: 0, loss_cu: 10 },
    { timestamp: now - 40 * minute, ping_ct: 80, ping_cu: 100, loss_ct: 20, loss_cu: 10 },
    { timestamp: now - 20 * minute, ping_ct: 120, ping_cu: 140, loss_ct: 0, loss_cu: 0 },
    { timestamp: now - 5 * minute, ping_ct: 160, ping_cu: 180, loss_ct: 50, loss_cu: 0 }
  ]
  const summary = summarizeProbeHistory(rows, { now, hours: 1, bucketCount: 4 })

  assert.equal(summary.rowCount, 4)
  assert.equal(summary.latency.average, 110)
  assert.equal(summary.loss.average, 11.25)
  assert.deepEqual(summary.latency.buckets.map(bucket => bucket.value), [50, 90, 130, 170])
  assert.deepEqual(summary.loss.buckets.map(bucket => bucket.value), [5, 15, 0, 25])
  assert.equal(summary.loss.buckets[0].probes.CT, 0)
  assert.equal(summary.loss.buckets[0].probes.CU, 10)
})

test('probe history merge deduplicates timestamps and drops samples outside the window', () => {
  const rows = mergeProbeHistory([
    { timestamp: now - 70 * minute, ping_ct: 1 },
    { timestamp: now - 10 * minute, ping_ct: 20, loss_ct: 0 }
  ], [
    { timestamp: now - 10 * minute, ping_ct: 24, loss_cu: 2 },
    { timestamp: now - minute, ping_ct: 30 }
  ], { now, hours: 1 })

  assert.deepEqual(rows, [
    { timestamp: now - 10 * minute, ping_ct: 24, loss_ct: 0, loss_cu: 2 },
    { timestamp: now - minute, ping_ct: 30 }
  ])
})

test('probe history compacts rapid live samples without shrinking the 24-hour window', () => {
  const rows = mergeProbeHistory([
    { timestamp: now - 23 * 60 * minute, ping_ct: 40 }
  ], [
    { timestamp: now - 15_000, ping_ct: 80 },
    { timestamp: now - 5_000, ping_ct: 90, ping_cu: 100 }
  ], { now, hours: 24, bucketMs: minute })

  assert.deepEqual(rows, [
    { timestamp: now - 23 * 60 * minute, ping_ct: 40 },
    { timestamp: now - 5_000, ping_ct: 90, ping_cu: 100 }
  ])
})

test('probe history builds a complete 24-slot daily timeline', () => {
  const rows = Array.from({ length: 24 }, (_, index) => ({
    timestamp: now - (23.5 - index) * 60 * minute,
    ping_ct: 40 + index
  }))
  const summary = summarizeProbeHistory(rows, { now, hours: 24, bucketCount: 24 })

  assert.equal(summary.rowCount, 24)
  assert.equal(summary.latency.buckets.length, 24)
  assert.ok(summary.latency.buckets.every(bucket => bucket.sampleCount === 1))
})

const { pingSparkline } = await import('../src/assets/js/shared/probe-history.js')

test('pingSparkline needs at least two usable samples', () => {
  const now = 1_700_000_600_000
  assert.equal(pingSparkline([], { now }), null)
  assert.equal(pingSparkline([{ timestamp: now - 1000, ping_ct: 40 }], { now }), null)
  // Rows without any positive latency are skipped entirely.
  assert.equal(pingSparkline([
    { timestamp: now - 2000, loss_ct: 5 },
    { timestamp: now - 1000, loss_ct: 6 }
  ], { now }), null)
})

test('pingSparkline averages lines per row and normalizes to the view box', () => {
  const now = 1_700_000_600_000
  const spark = pingSparkline([
    { timestamp: now - 4 * 60 * 1000, ping_ct: 40, ping_cu: 60 },
    { timestamp: now - 2 * 60 * 1000, ping_ct: 100 },
    { timestamp: now, ping_ct: 80, ping_bd: 120 }
  ], { now, width: 100, height: 28, pad: 2 })
  assert.ok(spark)
  assert.equal(spark.count, 3)
  assert.equal(spark.min, 50)
  assert.equal(spark.max, 100)
  assert.equal(spark.latest, 100)
  const points = spark.points.split(' ').map(pair => pair.split(',').map(Number))
  assert.equal(points.length, 3)
  // Session shorter than the 5-minute floor: first point sits inside the window.
  assert.ok(points[0][0] > 0 && points[0][0] < points[1][0] && points[1][0] < points[2][0])
  assert.equal(points[2][0], 100)
  points.forEach(([x, y]) => {
    assert.ok(x >= 0 && x <= 100)
    assert.ok(y >= 2 && y <= 26)
  })
  // Higher latency maps to a smaller y (drawn nearer the top).
  assert.ok(points[1][1] < points[0][1])
})

test('pingSparkline window grows with the session span', () => {
  const now = 1_700_000_600_000
  const spark = pingSparkline([
    { timestamp: now - 40 * 60 * 1000, ping_ct: 50 },
    { timestamp: now, ping_ct: 70 }
  ], { now })
  assert.equal(spark.spanMs, 40 * 60 * 1000)
  const first = spark.points.split(' ')[0].split(',').map(Number)
  assert.equal(first[0], 0)
})
