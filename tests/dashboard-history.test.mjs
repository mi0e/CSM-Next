class FakeClassList {
  values = new Set()
  add(...names) { names.forEach(name => this.values.add(name)) }
  remove(...names) { names.forEach(name => this.values.delete(name)) }
  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : force
    if (enabled) this.values.add(name)
    else this.values.delete(name)
    return enabled
  }
}

class FakeElement {
  constructor() {
    this.classList = new FakeClassList()
    this.dataset = {}
    this.style = { setProperty(name, value) { this[name] = String(value) } }
    this.hidden = false
    this.textContent = ''
    this.innerHTML = ''
    this.value = ''
    this.children = new Map()
    this.listeners = new Map()
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, [])
    this.listeners.get(type).push(callback)
  }
  setAttribute(name, value) { this[name] = String(value) }
  querySelector(selector) {
    if (!this.children.has(selector)) this.children.set(selector, new FakeElement())
    return this.children.get(selector)
  }
  replaceChildren() { this.innerHTML = '' }
  focus() {}
}

const nodes = new Map()
const nodeFor = selector => {
  if (!nodes.has(selector)) nodes.set(selector, new FakeElement())
  return nodes.get(selector)
}

const card = new FakeElement()
card.dataset.serverKey = '0:node-1'
globalThis.document = {
  documentElement: new FakeElement(),
  body: new FakeElement(),
  head: new FakeElement(),
  title: '',
  querySelector: nodeFor,
  querySelectorAll: selector => {
    if (selector === '.server-card[data-server-key]' && nodeFor('#cardGroups').innerHTML.includes('data-server-key="0:node-1"')) return [card]
    return []
  },
  createElement: () => new FakeElement(),
  addEventListener: () => {}
}

globalThis.window = globalThis
globalThis.window.addEventListener = () => {}
globalThis.requestAnimationFrame = callback => callback()
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'zh-CN' } })
Object.defineProperty(globalThis, 'location', {
  configurable: true,
  value: { origin: 'https://theme.example', href: 'https://theme.example/', search: '' }
})

function storage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  }
}
globalThis.localStorage = storage()
globalThis.sessionStorage = storage()
globalThis.setInterval = () => 1
globalThis.clearInterval = () => {}

// config.json is deprecated; API bases come from the meta tag convention.
nodeFor('meta[name="apiBase"]').getAttribute = name => (name === 'content' ? 'https://upstream.example' : null)

globalThis.IntersectionObserver = class {
  constructor(callback) { this.callback = callback }
  observe(target) { this.callback([{ isIntersecting: true, target }]) }
  unobserve() {}
  disconnect() {}
}

const sockets = []
globalThis.WebSocket = class {
  constructor(url) {
    this.url = String(url)
    this.listeners = new Map()
    sockets.push(this)
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, [])
    this.listeners.get(type).push(callback)
  }
  emit(type, event = {}) {
    for (const callback of this.listeners.get(type) || []) callback(event)
  }
  send() {}
  close() {}
}

const now = Date.now()
let historyFetches = 0
const json = value => new Response(JSON.stringify(value), {
  headers: { 'Content-Type': 'application/json' }
})
globalThis.fetch = async input => {
  const url = String(input)
  if (url === 'https://upstream.example/api/config') return json({ turnstile_enabled: false, site_title: 'History Test' })
  if (url === 'https://upstream.example/api/servers') return json({
    servers: [{
      id: 'node-1', name: 'Node One', region: 'HK', server_group: 'Default', os: 'Debian', arch: 'amd64',
      cpu: 1, ram_total: 1024, ram_used: 128, disk_total: 10240, disk_used: 1024,
      ping_ct: 45, ping_cu: 155, ping_cm: 65, ping_bd: 'false',
      loss_ct: 0, loss_cu: 0, loss_cm: 0, loss_bd: 0,
      last_updated: now, report_timestamp: now
    }],
    sysConfig: {}
  })
  if (url === 'https://upstream.example/api/history/all?id=node-1&hours=1') {
    historyFetches += 1
    return json({ rows: [
      { timestamp: now - 50 * 60_000, ping_ct: 40, ping_cu: 50, ping_cm: 60, ping_bd: 70, loss_ct: 0, loss_cu: 0, loss_cm: 5, loss_bd: 0 },
      { timestamp: now - 25 * 60_000, ping_ct: 80, ping_cu: 90, ping_cm: 100, ping_bd: 110, loss_ct: 10, loss_cu: 0, loss_cm: 0, loss_bd: 0 },
      { timestamp: now - 5 * 60_000, ping_ct: 120, ping_cu: 130, ping_cm: 140, ping_bd: 150, loss_ct: 0, loss_cu: 20, loss_cm: 0, loss_bd: 0 }
    ] })
  }
  throw new Error(`Unexpected fetch: ${url}`)
}

const realSetTimeout = globalThis.setTimeout
const { mount } = await import(`${new URL('../src/assets/js/dashboard.js', import.meta.url).href}?history=${Date.now()}`)
await mount({ name: 'dashboard' })
await new Promise(resolve => realSetTimeout(resolve, 240))

const cards = nodeFor('#cardGroups').innerHTML
if (historyFetches !== 0) throw new Error(`Probe block must not request history, received ${historyFetches} calls`)
if (!cards.includes('>CT<') || !cards.includes('45 ms')) throw new Error('Live probe values did not render')
if (!cards.includes('ping-value warn') || !cards.includes('155 ms')) throw new Error('Warn-level latency color did not render')
if (cards.includes('>BD<')) throw new Error('Disabled probe line must be hidden')
if (!cards.includes('实时采样')) throw new Error('Pre-trend label did not render')
if (cards.includes('ping-sparkline')) throw new Error('Sparkline must wait for at least two session samples')

const socket = sockets.find(item => item.url.includes('/api/ws'))
if (!socket) throw new Error('Dashboard did not open a WebSocket')
socket.emit('open')
socket.emit('message', {
  data: JSON.stringify({
    type: 'batchUpdate',
    ts: now,
    updates: [{
      serverId: 'node-1',
      samples: [
        { ts: now - 120_000, data: { ping_ct: 60, ping_cu: 70, ping_cm: 80, cpu: 2 } },
        { ts: now - 1_000, data: { ping_ct: 90, ping_cu: 100, ping_cm: 110, cpu: 3 } }
      ]
    }]
  })
})
await new Promise(resolve => realSetTimeout(resolve, 160))

const updated = nodeFor('#cardGroups').innerHTML
if (historyFetches !== 0) throw new Error(`WebSocket samples must not trigger history requests, received ${historyFetches}`)
if (!updated.includes('90 ms')) throw new Error('WebSocket sample did not refresh live probe values')
if (!updated.includes('ping-sparkline') || !updated.includes('<polyline points=')) {
  throw new Error('Session sparkline did not render from WebSocket samples')
}
if (!updated.includes('实时趋势')) throw new Error('Trend label did not render')

console.log('Dashboard probe smoke test passed: request-free live values plus a WebSocket-fed session trend.')
