import assert from 'node:assert/strict'
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
