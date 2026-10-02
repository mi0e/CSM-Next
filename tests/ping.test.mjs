import assert from 'node:assert/strict'
import { probeLines, probeMetric } from '../src/assets/js/shared/ping.js'
import test from 'node:test'

const { nodePingField, effectivePingNode } = await import('../src/assets/js/shared/ping.js')

test('nodePingField trims and keeps empty as inherit signal', () => {
  assert.equal(nodePingField('  gd-ct.example  '), 'gd-ct.example')
  assert.equal(nodePingField(''), '')
  assert.equal(nodePingField(null), '')
  assert.equal(nodePingField(undefined), '')
})

test('effectivePingNode prefers node value then settings', () => {
  assert.equal(effectivePingNode('node-ct', 'global-ct'), 'node-ct')
  assert.equal(effectivePingNode('', 'global-ct'), 'global-ct')
  assert.equal(effectivePingNode(null, 'global-ct'), 'global-ct')
  assert.equal(effectivePingNode('', ''), '')
})

const { isPingDisabled, isPingValid, pingLevel } = await import('../src/assets/js/shared/ping.js')

test('isPingDisabled matches upstream false markers only', () => {
  assert.equal(isPingDisabled(false), true)
  assert.equal(isPingDisabled('false'), true)
  assert.equal(isPingDisabled(null), false)
  assert.equal(isPingDisabled(0), false)
  assert.equal(isPingDisabled(''), false)
  assert.equal(isPingDisabled(42), false)
})

test('isPingValid rejects disabled, empty, zero and negative values', () => {
  assert.equal(isPingValid(42), true)
  assert.equal(isPingValid('42'), true)
  assert.equal(isPingValid(false), false)
  assert.equal(isPingValid('false'), false)
  assert.equal(isPingValid(null), false)
  assert.equal(isPingValid(undefined), false)
  assert.equal(isPingValid(''), false)
  assert.equal(isPingValid('0'), false)
  assert.equal(isPingValid(0), false)
  assert.equal(isPingValid(-1), false)
})

test('pingLevel follows upstream 100/200 thresholds and flags timeouts', () => {
  assert.equal(pingLevel(45), '')
  assert.equal(pingLevel(99), '')
  assert.equal(pingLevel(100), 'warn')
  assert.equal(pingLevel(199), 'warn')
  assert.equal(pingLevel(200), 'bad')
  assert.equal(pingLevel(null), 'bad')
  assert.equal(pingLevel('0'), 'bad')
})
test('optional probe lines follow per-node names, site labels and disabled values', () => {
  const lines = probeLines({ ping_ct: 10, ping_cu: false, ping_cm: 'false', ping_bd: 0,
    ping_node_1: null, node_1_name: 'Edge <1>', ping_node_2: false }, { custom_ct_name: 'Shanghai' })
  assert.deepEqual(lines.map(line => line.label), ['Shanghai', 'BD', 'Edge <1>'])
  assert.equal(probeLines({}).length, 4)
})

test('missing probe values never become zero latency or zero loss', () => {
  for (const value of [null, undefined, '', ' ', false, 'false', NaN, 'invalid']) {
    assert.equal(probeMetric(value), null)
    assert.equal(probeMetric(value, 'loss'), null)
  }
  assert.equal(probeMetric(0), null)
  assert.equal(probeMetric('0', 'loss'), 0)
  assert.equal(probeMetric(100, 'loss'), 100)
  assert.equal(probeMetric(101, 'loss'), null)
})
