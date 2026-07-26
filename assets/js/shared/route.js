/**
 * Hash router helpers following the upstream theme-store convention:
 * dashboard at `#/`, server detail at `#/server/:id`.
 * Extra view params (site index) travel in the hash query so switching
 * servers never triggers a full page navigation.
 */

export function parseRoute(hash = typeof location !== 'undefined' ? location.hash : '') {
  const raw = String(hash || '').replace(/^#/, '')
  const [path, query = ''] = raw.split('?')
  const segments = path.split('/').filter(Boolean)
  if (segments[0] === 'server' && segments[1]) {
    const params = new URLSearchParams(query)
    let id = segments[1]
    try { id = decodeURIComponent(id) } catch { /* keep raw id */ }
    const siteIndex = Number.parseInt(params.get('site') || '0', 10)
    return {
      name: 'server',
      id,
      siteIndex: Number.isFinite(siteIndex) && siteIndex > 0 ? siteIndex : 0
    }
  }
  return { name: 'dashboard' }
}

export function serverRouteHash(id, siteIndex = 0) {
  const site = Number.isFinite(Number(siteIndex)) && Number(siteIndex) > 0 ? `?site=${Number(siteIndex)}` : ''
  return `#/server/${encodeURIComponent(String(id ?? ''))}${site}`
}

export function dashboardRouteHash() {
  return '#/'
}
