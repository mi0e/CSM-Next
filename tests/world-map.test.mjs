import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMapSummary, hoverPlacement, regionStatus, resolveMapRegion } from '../src/assets/js/shared/world-map.js'
import worldMap from '../src/assets/data/world-map.js'

test('regions resolve like komari mapRegions (Intl English names + overrides)', () => {
  assert.deepEqual(resolveMapRegion('us'), { key: 'US', label: 'United States', mapName: 'United States of America', flagCode: 'US' })
  assert.equal(resolveMapRegion('HK').mapName, 'Hong Kong')
  assert.equal(resolveMapRegion('MO').label, 'Macau')
  assert.equal(resolveMapRegion('MO').mapName, 'Macao')
  assert.equal(resolveMapRegion('TR').mapName, 'Turkey')
  assert.equal(resolveMapRegion('JP').mapName, 'Japan')
  for (const unknown of ['', 'XX', 'UN', 'USA', null]) assert.equal(resolveMapRegion(unknown), null)
})

test('override and common regions exist in the generated map; tiny ones get markers', () => {
  const byName = new Map(worldMap.countries.map(item => [item[0], item]))
  for (const code of ['US', 'HK', 'MO', 'TR', 'JP', 'DE', 'SG', 'GB', 'CN']) {
    assert.ok(byName.has(resolveMapRegion(code).mapName), code)
  }
  assert.equal(byName.get('Hong Kong').length, 4)
  assert.equal(byName.get('Singapore').length, 4)
  assert.equal(byName.get('United States of America').length, 2)
  assert.deepEqual([worldMap.width, worldMap.height], [1000, 560])
})

test('region status: all online, mixed partial, all offline; unknown regions are unmapped', () => {
  assert.equal(regionStatus(2, 0), 'online')
  assert.equal(regionStatus(1, 1), 'partial')
  assert.equal(regionStatus(0, 3), 'offline')
  const servers = [
    { name: 'a', region: 'HK', up: true },
    { name: 'b', region: 'hk', up: false },
    { name: 'c', region: 'US', up: true },
    { name: 'd', region: 'US', up: true },
    { name: 'e', region: 'JP', up: false },
    { name: 'f', region: 'XX', up: true }
  ]
  const summary = buildMapSummary(servers, server => server.up)
  assert.deepEqual(summary.regions.map(region => [region.key, region.total, region.status]), [
    ['US', 2, 'online'], ['HK', 2, 'partial'], ['JP', 1, 'offline']
  ])
  assert.deepEqual([summary.total, summary.online, summary.offline], [6, 4, 2])
  assert.deepEqual(summary.unmapped.map(server => server.name), ['f'])
})

test('hover card flips to the side with room', () => {
  const bounds = { width: 1000, height: 500 }
  const card = { width: 320, height: 124 }
  assert.deepEqual(hoverPlacement(100, 100, bounds, card), { horizontal: 'right', vertical: 'below' })
  assert.deepEqual(hoverPlacement(900, 450, bounds, card), { horizontal: 'left', vertical: 'above' })
})
