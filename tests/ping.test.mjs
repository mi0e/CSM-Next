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
