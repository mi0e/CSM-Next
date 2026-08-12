import assert from 'node:assert/strict'
import test from 'node:test'

import {
  aggregateServerCountries,
  buildGlobeMarkers,
  greatCirclePoints,
  mountServerGlobe,
  normalizeCountryCode,
  projectGlobePoint,
  restoreCobeCanvas,
  serverIsOnline
} from '../src/assets/js/shared/globe.js'

test('country normalization accepts ISO2-style values and degrades unknown input', () => {
  assert.equal(normalizeCountryCode(' jp '), 'JP')
  assert.equal(normalizeCountryCode('KZ'), 'KZ')
  assert.equal(normalizeCountryCode('ZZ'), 'XX')
  assert.equal(normalizeCountryCode('Hong Kong'), 'XX')
  assert.equal(normalizeCountryCode(null), 'XX')
})

test('server aggregation counts countries, online nodes, stable hub, and unplaced nodes', () => {
  const now = 2_000_000_000_000
  const result = aggregateServerCountries([
    { region: 'JP', report_timestamp: now },
    { region: 'jp', report_timestamp: now - 60_000 },
    { region: 'US', report_timestamp: now - 600_000 },
    { region: 'invalid', report_timestamp: now }
  ], now)

  assert.deepEqual(result.countries.map(item => [item.code, item.count, item.online]), [
    ['JP', 2, 2], ['US', 1, 0], ['XX', 1, 1]
  ])
  assert.equal(result.hub.code, 'JP')
  assert.equal(result.unplacedCount, 1)
  assert.deepEqual(result.hub.position, [36.2, 138.3])
})

test('current ISO2 countries including KZ, BD, CY, and MD have representative positions', () => {
  const result = aggregateServerCountries(['KZ', 'BD', 'CY', 'MD'].map(region => ({ region, report_timestamp: 2_000_000_000_000 })), 2_000_000_000_000)
  assert.deepEqual(result.placed.map(entry => entry.code).sort(), ['BD', 'CY', 'KZ', 'MD'])
  assert.equal(result.unplacedCount, 0)
  assert.ok(result.placed.every(entry => entry.position?.length === 2))
})

test('online threshold is strict at the five-minute boundary', () => {
  const now = 2_000_000_000_000
  assert.equal(serverIsOnline({ report_timestamp: now - 299_999 }, now), true)
  assert.equal(serverIsOnline({ report_timestamp: now - 300_000 }, now), false)
  assert.equal(serverIsOnline({ last_updated: (now - 299_999) / 1000 }, now), true)
})

test('mixed countries render online green then smaller offline red at one position', () => {
  const aggregate = {
    placed: [{ code: 'JP', count: 3, online: 2, position: [36.2, 138.3] }]
  }
  const markers = buildGlobeMarkers(aggregate, 'all', 'light')
  assert.deepEqual(markers.map(marker => marker.id), ['jp-online', 'jp-offline'])
  assert.deepEqual(markers[0].location, markers[1].location)
  assert.ok(markers[1].size < markers[0].size)
  assert.ok(Math.abs(markers[1].size / markers[0].size - 0.48) < 1e-9)
  assert.ok(markers[0].color[1] > markers[0].color[0])
  assert.ok(markers[1].color[0] > markers[1].color[1])
})

test('fully offline countries render one normal red marker and theme colors change', () => {
  const aggregate = {
    placed: [{ code: 'US', count: 4, online: 0, position: [39.8, -98.6] }]
  }
  const light = buildGlobeMarkers(aggregate, 'all', 'light')
  const dark = buildGlobeMarkers(aggregate, 'all', 'dark')
  const expectedSize = Math.min(0.11, 0.025 + Math.sqrt(4) * 0.012)
  assert.equal(light.length, 1)
  assert.equal(light[0].id, 'us-offline')
  assert.equal(light[0].size, expectedSize)
  assert.notDeepEqual(light[0].color, dark[0].color)
  assert.deepEqual(light[0].location, dark[0].location)
})

test('orthographic projection distinguishes front and back hemispheres', () => {
  const front = projectGlobePoint(0, 0, { longitude: 0, latitude: 0 })
  const back = projectGlobePoint(0, 180, { longitude: 0, latitude: 0 })
  const east = projectGlobePoint(0, 90, { longitude: 0, latitude: 0 })
  assert.equal(front.visible, true)
  assert.equal(back.visible, false)
  assert.ok(Math.abs(front.x) < 1e-10)
  assert.ok(Math.abs(east.x - 1) < 1e-10)
})

test('great-circle interpolation preserves endpoints on the unit sphere', () => {
  const points = greatCirclePoints([36.2, 138.3], [39.8, -98.6], 12)
  assert.equal(points.length, 13)
  assert.ok(Math.abs(points[0][0] - 36.2) < 1e-9)
  assert.ok(Math.abs(points[0][1] - 138.3) < 1e-9)
  assert.ok(Math.abs(points.at(-1)[0] - 39.8) < 1e-9)
  assert.ok(Math.abs(points.at(-1)[1] - -98.6) < 1e-9)
  assert.ok(points.every(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude)))
})

test('globe fallback reports data, localizes, disables interaction, and stops after destroy', () => {
  const nodes = new Map()
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: '', hidden: false, disabled: false, setAttribute(name, value) { this[name] = value } })
    return nodes.get(selector)
  }
  const root = { querySelector: node }
  const canvas = node('canvas')
  const globe = mountServerGlobe({ root, canvas })
  const now = 2_000_000_000_000
  globe.update({ servers: [{ region: 'JP', report_timestamp: now }, { region: 'US', report_timestamp: now - 300_000 }], language: 'en', now })
  assert.match(node('[data-globe-status]').textContent, /Interactive globe unavailable · 2 countries · 1\/2 online/)
  assert.match(node('[data-globe-help]').textContent, /not server cities/)
  assert.equal(canvas.hidden, true)
  assert.equal(canvas['aria-hidden'], 'true')
  assert.equal(node('.globe-controls').hidden, true)
  assert.equal(node('[data-globe-action="zoom-in"]').disabled, true)

  globe.update({ language: 'zh' })
  assert.match(node('[data-globe-status]').textContent, /交互式地球仪不可用 · 2 个国家\/地区 · 1\/2 在线/)
  globe.destroy()
  const status = node('[data-globe-status]').textContent
  globe.update({ servers: [] })
  assert.equal(node('[data-globe-status]').textContent, status)
})

test('COBE canvas cleanup restores order, removes wrapper, and is idempotent', () => {
  class Node {
    constructor(name) { this.name = name; this.parentNode = null; this.childNodes = [] }
    get children() { return this.childNodes }
    get firstChild() { return this.childNodes[0] || null }
    contains(node) { return this.childNodes.includes(node) }
    detach(node) {
      if (!node?.parentNode) return
      const siblings = node.parentNode.childNodes
      const index = siblings.indexOf(node)
      if (index >= 0) siblings.splice(index, 1)
      node.parentNode = null
    }
    append(node) { this.detach(node); this.childNodes.push(node); node.parentNode = this }
    appendChild(node) { this.append(node) }
    insertBefore(node, before) {
      this.detach(node)
      const index = this.childNodes.indexOf(before)
      this.childNodes.splice(index < 0 ? this.childNodes.length : index, 0, node)
      node.parentNode = this
    }
    remove() { this.parentNode?.detach(this) }
  }
  const parent = new Node('panel')
  const canvas = new Node('canvas')
  const help = new Node('help')
  parent.append(canvas)
  parent.append(help)
  const originalNextSibling = help
  const wrapper = new Node('cobe-wrapper')
  const anchor = new Node('cobe-anchor')
  parent.insertBefore(wrapper, canvas)
  wrapper.append(canvas)
  wrapper.append(anchor)

  restoreCobeCanvas(canvas, parent, originalNextSibling)
  assert.deepEqual(parent.childNodes.map(node => node.name), ['canvas', 'help'])
  assert.equal(wrapper.parentNode, null)
  assert.equal(anchor.parentNode, wrapper)
  assert.ok(!parent.contains(anchor))
  assert.equal(canvas.parentNode, parent)

  restoreCobeCanvas(canvas, parent, originalNextSibling)
  assert.deepEqual(parent.childNodes.map(node => node.name), ['canvas', 'help'])
})
