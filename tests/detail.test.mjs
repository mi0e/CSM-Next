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
    origin: 'http://127.0.0.1:4173', href: 'http://127.0.0.1:4173/?preview=1#/server/preview-2',
    search: '?preview=1', hash: '#/server/preview-2', reload: () => {}
  }
})

const makeStorage = () => {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }
}
globalThis.localStorage = makeStorage()
globalThis.sessionStorage = makeStorage()
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ apiBase: [], title: 'Smoke Detail', backgroundImage: '' }) })

const realSetTimeout = globalThis.setTimeout
globalThis.setInterval = () => 1
globalThis.clearInterval = () => {}

const { mount } = await import(`${new URL('../src/assets/js/detail.js', import.meta.url).href}?smoke=${Date.now()}`)
await mount({ name: 'server', id: 'preview-2', siteIndex: 0 })
await new Promise(resolve => realSetTimeout(resolve, 80))

if (nodeFor('#detailContent').hidden) throw new Error('Detail content did not become visible')
if (nodeFor('#nodeName').textContent !== 'yt-Hong Kong') throw new Error('Server identity did not render')
const specs = nodeFor('#specGrid').innerHTML
if (!specs.includes('AMD EPYC 7542')) throw new Error('Specification cards did not render')
if (specs.includes('虚拟化') || specs.includes('GPU') || specs.includes('内核')) throw new Error('Removed specification fields were rendered')
if (!nodeFor('#cpuChart').innerHTML.includes('chart-svg')) throw new Error('Load chart SVG did not render')
if (!nodeFor('#pingChart').innerHTML.includes('chart-line')) throw new Error('Ping chart SVG did not render')
if ((nodeFor('#pingLegend').innerHTML.match(/ping-legend-item/g) || []).length !== 4) throw new Error('Ping legend did not render four probes')

const cpuChart = nodeFor('#cpuChart')
cpuChart.onpointermove({ clientX: 170, clientY: 80 })
const tooltip = cpuChart.querySelector('.chart-tooltip')
if (tooltip.hidden || !tooltip.innerHTML.includes('CPU')) throw new Error('Chart hover tooltip did not render')
if (cpuChart.querySelector('.chart-hover-line').hidden) throw new Error('Chart hover crosshair did not render')

console.log('Detail smoke test passed: specs, charts and hover tooltips rendered.')
