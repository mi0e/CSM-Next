const legacyRoutes = new Map([
  ['/detail', '/detail.html'],
  ['/admin', '/admin.html'],
  ['/admin/', '/admin.html'],
  ['/pages', '/'],
  ['/pages/', '/'],
  ['/pages/index.html', '/'],
  ['/pages/detail', '/detail.html'],
  ['/pages/detail.html', '/detail.html'],
  ['/pages/admin', '/admin.html'],
  ['/pages/admin/', '/admin.html'],
  ['/pages/admin.html', '/admin.html']
])

const adminPaths = new Set([
  '/admin',
  '/admin/',
  '/admin.html',
  '/pages/admin',
  '/pages/admin/',
  '/pages/admin.html'
])

function apiBases(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map(item => item.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

function enabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function customAdminEnabled(env) {
  return enabled(env.CSM_CUSTOM_ADMIN_ENABLED)
}

function selectedApiBase(request, env) {
  const bases = apiBases(env.CSM_API_BASE)
  const rawIndex = Number.parseInt(new URL(request.url).searchParams.get('site') || '0', 10)
  const index = Number.isFinite(rawIndex) ? Math.max(0, Math.min(bases.length - 1, rawIndex)) : 0
  return bases[index] || bases[0] || ''
}

function originalAdminUrl(request, env) {
  const base = selectedApiBase(request, env)
  if (!base) return new URL('/', request.url).href
  const url = new URL(base)
  url.pathname = '/'
  url.search = ''
  url.hash = '/admin'
  return url.href
}

function publicConfig(env) {
  const refresh = Number.parseInt(env.CSM_REFRESH_INTERVAL, 10)
  return {
    apiBase: apiBases(env.CSM_API_BASE),
    title: env.CSM_SITE_TITLE || 'CF-Server-Monitor',
    backgroundImage: env.CSM_BACKGROUND_IMAGE || '',
    refreshInterval: Number.isFinite(refresh) && refresh >= 5000 ? refresh : 60000,
    customAdminEnabled: customAdminEnabled(env)
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

    const preview = new URL(request.url).searchParams.get('preview') === '1'
    if (adminPaths.has(pathname) && !preview && !customAdminEnabled(env)) {
      return Response.redirect(originalAdminUrl(request, env), 302)
    }

    const redirect = legacyRoutes.get(pathname)
    if (redirect) return redirectRequest(request, redirect)

    if (pathname === '/') return env.ASSETS.fetch(assetRequest(request, '/index.html'))

    return env.ASSETS.fetch(request)
  }
}
