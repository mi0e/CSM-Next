import assert from 'node:assert/strict'
class FakeClassList {
  values = new Set()
  add(...names) { names.forEach(name => this.values.add(name)) }
  remove(...names) { names.forEach(name => this.values.delete(name)) }
  contains(name) { return this.values.has(name) }
  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : force
    if (enabled) this.values.add(name)
    else this.values.delete(name)
    return enabled
  }
}

class FakeElement {
  constructor() {
    this.classList = new FakeClassList(); this.dataset = {}; this.style = {}; this.hidden = false
    this.textContent = ''; this.innerHTML = ''; this.value = ''; this.href = ''; this.children = new Map(); this.listeners = new Map()
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, [])
    this.listeners.get(type).push(callback)
  }
  dispatch(type, event = {}) { for (const callback of this.listeners.get(type) || []) callback({ target: this, ...event }) }
  setAttribute(name, value) { this[name] = String(value) }
  querySelector(selector) {
    if (!this.children.has(selector)) this.children.set(selector, new FakeElement())
    return this.children.get(selector)
  }
  querySelectorAll() { return [] }
  getBoundingClientRect() { return { left: 0, top: 0, width: 340, height: 165 } }
  replaceChildren() { this.innerHTML = '' }
}

const nodes = new Map()
const nodeFor = selector => {
  if (!nodes.has(selector)) nodes.set(selector, new FakeElement())
  return nodes.get(selector)
}

globalThis.document = {
  documentElement: new FakeElement(), body: new FakeElement(), head: new FakeElement(), title: '',
  querySelector: nodeFor, querySelectorAll: () => [], createElement: () => new FakeElement(), addEventListener: () => {}
}
globalThis.window = globalThis
globalThis.window.addEventListener = () => {}
globalThis.requestAnimationFrame = callback => callback()
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'zh-CN' } })
Object.defineProperty(globalThis, 'location', {
  configurable: true,
  value: {
    origin: 'http://127.0.0.1:4173', href: 'http://127.0.0.1:4173/#/server/node-1',
    search: '', hash: '#/server/node-1', reload: () => {}
  }
})

const makeStorage = () => {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }
}
globalThis.localStorage = makeStorage()
globalThis.sessionStorage = makeStorage()

globalThis.document.removeEventListener = () => {}
globalThis.window.removeEventListener = () => {}
FakeElement.prototype.focus = () => {}
nodeFor('#loginModal').hidden = true
const range = new FakeElement()
document.querySelectorAll = selector => selector === '.range-switch' ? [range] : []
nodeFor('meta[name="apiBase"]').getAttribute = () => 'https://api.example'
const sockets = []
globalThis.WebSocket = class {
  listeners = new Map()
  constructor(url) { this.url = url; sockets.push(this) }
  addEventListener(key, fn) { this.listeners.set(key, fn) }
  send() {}
  close() {}
  emit(key, data) { this.listeners.get(key)?.(data) }
}
globalThis.setInterval = () => 1
globalThis.clearInterval = () => {}
const requests = []
let deniedHours = 48
const now = Date.now()
const server = { id: 'node-1', name: 'Test node', cpu: 12, ram_used: 100, ram_total: 1024,
  disk_used: 100, disk_total: 1000, last_updated: now, ping_ct: 30, ping_cu: false, ping_cm: false,
  ping_bd: false, loss_ct: null, ping_node_1: null, loss_node_1: null, node_1_name: '<Edge>' }
globalThis.fetch = async input => {
  const url = new URL(input)
  requests.push(url)
  let data = {}, status = 200
  if (url.pathname === '/api/config') data = { custom_ct_name: 'Custom CT' }
  else if (url.pathname === '/api/server') data = server
  else if (url.pathname === '/api/history/all') {
    if (Number(url.searchParams.get('hours')) === deniedHours) { status = 401; data = { error: 'unauthorized' } }
    else data = [{ ...server, timestamp: now - 60000 }, { timestamp: now, ping_ct: null, loss_ct: null }]
  }
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}
const { mount } = await import('../src/assets/js/detail.js')
const view = await mount({ id: 'node-1', siteIndex: 0 })
const settle = () => new Promise(resolve => setTimeout(resolve, 20))
const select = async hours => {
  range.dispatch('click', { target: { closest: () => ({ dataset: { hours }, classList: new FakeClassList() }) } })
  await settle()
}
await select(6)
await select(24)
assert.ok(requests.some(url => url.searchParams.get('hours') === '6'))
assert.ok(requests.some(url => url.searchParams.get('hours') === '24'))
assert.equal(nodeFor('#loginModal').hidden, true)
assert.ok(nodeFor('#pingLegend').innerHTML.includes('Custom CT'))
assert.ok(nodeFor('#pingLegend').innerHTML.includes('&lt;Edge&gt;'))
assert.equal(nodeFor('#pingLegend').innerHTML.includes('0.0%'), false)
assert.equal((nodeFor('#pingLegend').innerHTML.match(/ping-legend-item/g) || []).length, 2)
await select(48)
assert.equal(nodeFor('#loginModal').hidden, false)
nodeFor('#loginCancel').dispatch('click')
deniedHours = 6
await select(6)
assert.equal(nodeFor('#loginModal').hidden, false, 'older backends can still require login for six hours')
nodeFor('#loginCancel').dispatch('click')
const diskBefore = nodeFor('#diskChart').innerHTML
sockets[0].emit('message', { data: JSON.stringify({ type: 'batchUpdate', updates: [{ serverId: 'node-1', samples: [
  { ts: now + 1000, data: { cpu: 25, ram_used: 120, ram_total: 1024 } }
] }] }) })
await new Promise(resolve => setTimeout(resolve, 140))
assert.equal(nodeFor('#diskChart').innerHTML, diskBefore, 'CPU-only samples must not redraw disk history')
assert.equal(nodeFor('#cpuCurrent').textContent, '25.00%')
view.destroy()
console.log('Upstream detail contracts passed: anonymous history, legacy 401, optional probes, sparse live samples.')
