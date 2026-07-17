import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mergeProbeHistory, normalizeProbeHistory, summarizeProbeHistory
} from '../src/assets/js/shared/probe-history.js'

const now = 1_700_000_000_000
const minute = 60_000

test('probe history keeps only valid reported latency and loss metrics', () => {
  const rows = normalizeProbeHistory({ rows: [{
    timestamp: now - minute,
    ping_ct: '42', ping_cu: '', ping_cm: -1,
    loss_ct: '2.5', loss_cu: 0, loss_cm: 120
  }] })

  assert.deepEqual(rows, [{
    timestamp: now - minute,
    ping_ct: 42,
    loss_ct: 2.5,
    loss_cu: 0
  }])
})

test('probe history summarizes the last hour into chronological real buckets', () => {
  const rows = [
    { timestamp: now - 55 * minute, ping_ct: 40, ping_cu: 60, loss_ct: 0, loss_cu: 10 },
    { timestamp: now - 40 * minute, ping_ct: 80, ping_cu: 100, loss_ct: 20, loss_cu: 10 },
    { timestamp: now - 20 * minute, ping_ct: 120, ping_cu: 140, loss_ct: 0, loss_cu: 0 },
    { timestamp: now - 5 * minute, ping_ct: 160, ping_cu: 180, loss_ct: 50, loss_cu: 0 }
  ]
  const summary = summarizeProbeHistory(rows, { now, bucketCount: 4 })

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
  ], { now })

  assert.deepEqual(rows, [
    { timestamp: now - 10 * minute, ping_ct: 24, loss_ct: 0, loss_cu: 2 },
    { timestamp: now - minute, ping_ct: 30 }
  ])
})
