const legacyRoutes = new Map([
  ['/detail', '/detail.html'],
  ['/pages', '/'],
  ['/pages/', '/'],
  ['/pages/index.html', '/'],
  ['/pages/detail', '/detail.html'],
  ['/pages/detail.html', '/detail.html']
])

function apiBases(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map(item => item.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

function publicConfig(env) {
  const refresh = Number.parseInt(env.CSM_REFRESH_INTERVAL, 10)
  return {
    apiBase: apiBases(env.CSM_API_BASE),
    title: env.CSM_SITE_TITLE || 'CF-Server-Monitor',
    backgroundImage: env.CSM_BACKGROUND_IMAGE || '',
    refreshInterval: Number.isFinite(refresh) && refresh >= 5000 ? refresh : 60000
  }
}

function jsonResponse(request, value) {
  const body = request.method === 'HEAD' ? null : `${JSON.stringify(value, null, 2)}\n`
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}

function assetRequest(request, pathname) {
  const url = new URL(request.url)
  url.pathname = pathname
  url.search = ''
  return new Request(url, request)
}

function redirectRequest(request, pathname) {
  const url = new URL(request.url)
  url.pathname = pathname
  return Response.redirect(url, 308)
}

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } })
    }

    const { pathname } = new URL(request.url)
    if (pathname === '/config.json') return jsonResponse(request, publicConfig(env))

    const redirect = legacyRoutes.get(pathname)
    if (redirect) return redirectRequest(request, redirect)

    if (pathname === '/') return env.ASSETS.fetch(assetRequest(request, '/index.html'))

    return env.ASSETS.fetch(request)
  }
}
