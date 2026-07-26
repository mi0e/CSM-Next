import { parseRoute, serverRouteHash } from './shared/route.js'

/**
 * Single-entry hash router. Each view lives in a <template> so only one
 * view's DOM (and ids) exists at a time; navigation destroys the old view
 * and mounts a fresh one, matching the previous multi-page behaviour.
 */

const root = document.querySelector('#appRoot')
const templates = {
  dashboard: document.querySelector('#viewDashboard'),
  server: document.querySelector('#viewServerDetail')
}
const loaders = {
  dashboard: () => import('./dashboard.js'),
  server: () => import('./detail.js')
}

// Legacy multi-page URLs (/detail.html?id=x&site=y) fall into the hash router
// when the host serves index.html for every path (upstream theme mode).
function redirectLegacyDetailUrl() {
  const url = new URL(location.href)
  if (!/\/detail(?:\.html)?$/i.test(url.pathname)) return false
  const id = url.searchParams.get('id') || ''
  const siteIndex = Number.parseInt(url.searchParams.get('site') || '0', 10) || 0
  const target = new URL('./', url)
  if (url.searchParams.get('preview') === '1') target.searchParams.set('preview', '1')
  target.hash = id ? serverRouteHash(id, siteIndex) : '#/'
  location.replace(target.href)
  return true
}

let current = null
let generation = 0

async function render() {
  const gen = ++generation
  if (current?.destroy) {
    try { current.destroy() } catch { /* keep navigating */ }
  }
  current = null

  const route = parseRoute()
  const template = templates[route.name] || templates.dashboard
  root.replaceChildren(template.content.cloneNode(true))

  try {
    const module = await (loaders[route.name] || loaders.dashboard)()
    const handle = await module.mount(route)
    if (gen !== generation) {
      // A newer navigation superseded this mount; drop its side effects.
      try { handle?.destroy?.() } catch { /* noop */ }
      return
    }
    current = handle || null
  } catch (error) {
    if (gen === generation) console.error('[theme] view mount failed', error)
  }
}

if (!redirectLegacyDetailUrl()) {
  window.addEventListener('hashchange', render)
  render()
}
