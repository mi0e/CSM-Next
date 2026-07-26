import assert from 'node:assert/strict'
import test from 'node:test'

import { dashboardRouteHash, parseRoute, serverRouteHash } from '../src/assets/js/shared/route.js'

test('parseRoute maps upstream hash conventions to views', () => {
  assert.deepEqual(parseRoute(''), { name: 'dashboard' })
  assert.deepEqual(parseRoute('#'), { name: 'dashboard' })
  assert.deepEqual(parseRoute('#/'), { name: 'dashboard' })
  assert.deepEqual(parseRoute('#/unknown/path'), { name: 'dashboard' })
  assert.deepEqual(parseRoute('#/server/abc-123'), { name: 'server', id: 'abc-123', siteIndex: 0 })
  assert.deepEqual(parseRoute('#/server/abc?site=2'), { name: 'server', id: 'abc', siteIndex: 2 })
  assert.deepEqual(parseRoute('#/server/abc?site=-3'), { name: 'server', id: 'abc', siteIndex: 0 })
  assert.deepEqual(parseRoute('#/server/abc?site=junk'), { name: 'server', id: 'abc', siteIndex: 0 })
})

test('server ids round-trip through encoding', () => {
  const id = 'node 01/加:点'
  const hash = serverRouteHash(id, 3)
  assert.equal(hash, `#/server/${encodeURIComponent(id)}?site=3`)
  assert.deepEqual(parseRoute(hash), { name: 'server', id, siteIndex: 3 })
})

test('site index zero is omitted from hashes', () => {
  assert.equal(serverRouteHash('abc', 0), '#/server/abc')
  assert.equal(serverRouteHash('abc'), '#/server/abc')
  assert.equal(dashboardRouteHash(), '#/')
})
