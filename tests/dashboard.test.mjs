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
  dispatch(type, event = {}) {
    for (const callback of this.listeners.get(type) || []) callback({ target: this, ...event })
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

globalThis.document = {
  documentElement: new FakeElement(),
  body: new FakeElement(),
  head: new FakeElement(),
  title: '',
  querySelector: nodeFor,
  querySelectorAll: () => [],
  createElement: () => new FakeElement(),
  addEventListener: () => {}
}

globalThis.window = globalThis
globalThis.window.addEventListener = () => {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'zh-CN' } })
Object.defineProperty(globalThis, 'location', {
  configurable: true,
  value: { origin: 'http://127.0.0.1:4173', href: 'http://127.0.0.1:4173/?preview=1', search: '?preview=1' }
})

const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
}

globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ apiBase: [], title: 'Smoke Test', backgroundImage: '', refreshInterval: 60000 })
})

const realSetTimeout = globalThis.setTimeout
globalThis.setInterval = () => 1
globalThis.clearInterval = () => {}

await import(`${new URL('../src/assets/js/dashboard.js', import.meta.url).href}?smoke=${Date.now()}`)
await new Promise(resolvePromise => realSetTimeout(resolvePromise, 40))

const cards = nodeFor('#cardGroups').innerHTML
const total = nodeFor('#totalCount').textContent
const online = nodeFor('#onlineCount').textContent

if (!cards.includes('server-card') || !cards.includes('Tokyo-Edge')) {
  throw new Error('Preview cards did not render')
}
if (!cards.includes('lipis/flag-icons@7.3.2/flags/4x3/jp.svg')) {
  throw new Error('Flag image URL did not render')
}
if (!cards.includes('gauge-progress') || cards.includes('conic-gradient')) {
  throw new Error('SVG gauge did not render')
}
if (String(total) !== '8' || String(online) !== '7') {
  throw new Error(`Unexpected preview stats: total=${total}, online=${online}`)
}

const search = nodeFor('#searchInput')
search.value = 'Hong Kong'
search.dispatch('input')
if (!nodeFor('#cardGroups').innerHTML.includes('yt-Hong Kong') || nodeFor('#cardGroups').innerHTML.includes('Tokyo-Edge')) {
  throw new Error('Search filtering did not update cards')
}

search.value = ''
search.dispatch('input')
nodeFor('#themeButton').dispatch('click')
if (document.documentElement.dataset.theme !== 'dark') throw new Error('Theme toggle failed')

nodeFor('#themeSettingsButton').dispatch('click')
if (!nodeFor('#themeDrawer').classList.values.has('is-open')) throw new Error('Theme settings drawer did not open')
nodeFor('#themePanelOpacity').value = '0.6'
nodeFor('#themePanelOpacity').dispatch('input')
if (nodeFor('#themeOpacityOutput').textContent !== '60%') throw new Error('Theme opacity output did not update')
nodeFor('#themeCustomCss').value = '.brand-title { letter-spacing: .08em; }'
nodeFor('#themeSettingsForm').dispatch('submit')
await new Promise(resolvePromise => realSetTimeout(resolvePromise, 20))
if (document.documentElement.style['--panel-opacity'] !== '60%') throw new Error('Theme opacity was not applied')
if (!nodeFor('#themeCustomStyle').textContent.includes('letter-spacing')) throw new Error('Custom CSS was not applied safely')

nodeFor('.view-switch').dispatch('click', { target: { closest: () => ({ dataset: { view: 'table' } }) } })
if (nodeFor('#tableView').hidden || !nodeFor('#gridView').hidden) throw new Error('Table view toggle failed')

nodeFor('#cardGroups').dispatch('click', { target: { closest: () => ({ dataset: { serverKey: '0:preview-1' } }) } })
if (!location.href.includes('detail.html') || !location.href.includes('id=preview-1')) throw new Error('Card did not route to themed detail page')

console.log('Smoke test passed: render, theme drawer, controls and themed detail routing are working.')
