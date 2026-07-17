import {
  normalizeThemeSettings, validateThemeSettings
} from '../src/assets/js/shared/theme-settings.js'

const THEME_SETTINGS_KEY = 'theme-settings:v1'
const THEME_BACKGROUND_KEY = 'theme-assets/background'
const MAX_BACKGROUND_BYTES = 2 * 1024 * 1024

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

function jsonResponse(request, value, status = 200, extraHeaders = {}) {
  const body = request.method === 'HEAD' ? null : `${JSON.stringify(value, null, 2)}\n`
  return new Response(body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  })
}

function themeFallback(env) {
  return normalizeThemeSettings({}, {
    backgroundImage: env.CSM_BACKGROUND_IMAGE || '',
    panelOpacity: 1
  })
}

async function readThemeSettings(env) {
  const fallback = themeFallback(env)
  if (!env.THEME_SETTINGS?.get) return { settings: fallback, updatedAt: '', storage: 'defaults' }
  try {
    const stored = await env.THEME_SETTINGS.get(THEME_SETTINGS_KEY, 'json')
    if (!stored) return { settings: fallback, updatedAt: '', storage: 'kv' }
    return {
      settings: normalizeThemeSettings(stored, fallback),
      updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : '',
      storage: 'kv'
    }
  } catch (error) {
    console.error('[theme-settings] KV read failed', error)
    return { settings: fallback, updatedAt: '', storage: 'unavailable' }
  }
}

function bearerToken(request) {
  const match = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

async function readRequestBuffer(request, maxBytes) {
  const declaredLength = Number.parseInt(request.headers.get('Content-Length') || '0', 10)
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    const error = new Error('Request body is too large')
    error.code = 'body_too_large'
    throw error
  }
  if (!request.body) return new ArrayBuffer(0)
  const reader = request.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      const error = new Error('Request body is too large')
      error.code = 'body_too_large'
      throw error
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes.buffer
}

async function verifyThemeSettingsAuth(request, env) {
  const token = bearerToken(request)
  const base = selectedApiBase(request, env)
  if (!token || !base) return false
  try {
    const response = await fetch(`${base}/admin/api`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: '__csm_theme_verify__' })
    })
    // Current upstream authenticates before rejecting unknown actions.
    if (response.status !== 400) return false
    const result = await response.json().catch(() => null)
    return result?.error === 'unknownAction' || result?.message === 'unknownAction'
  } catch (error) {
    console.error('[theme-settings] upstream auth verification failed', error)
    return false
  }
}

async function handleThemeSettings(request, env) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    const value = await readThemeSettings(env)
    return jsonResponse(request, { success: true, ...value })
  }
  if (request.method !== 'PUT') {
    return jsonResponse(request, { success: false, error: 'Method Not Allowed' }, 405, { allow: 'GET, HEAD, PUT' })
  }
  if (!env.THEME_SETTINGS?.put) {
    return jsonResponse(request, { success: false, error: 'Theme settings storage is unavailable' }, 503)
  }
  if (!await verifyThemeSettingsAuth(request, env)) {
    return jsonResponse(request, { success: false, error: 'Unauthorized' }, 401)
  }

  let input
  try {
    const body = await readRequestBuffer(request, 25000)
    input = JSON.parse(new TextDecoder().decode(body))
  } catch (error) {
    if (error?.code === 'body_too_large') {
      return jsonResponse(request, { success: false, error: error.message }, 413)
    }
    return jsonResponse(request, { success: false, error: 'Invalid JSON' }, 400)
  }

  try {
    const current = (await readThemeSettings(env)).settings
    const settings = validateThemeSettings({ ...current, ...input })
    const updatedAt = new Date().toISOString()
    await env.THEME_SETTINGS.put(THEME_SETTINGS_KEY, JSON.stringify({ ...settings, updatedAt }))
    return jsonResponse(request, { success: true, settings, updatedAt, storage: 'kv' })
  } catch (error) {
    if (error?.code) {
      return jsonResponse(request, { success: false, error: error.message, code: error.code }, 400)
    }
    console.error('[theme-settings] KV write failed', error)
    return jsonResponse(request, { success: false, error: 'Unable to save theme settings' }, 500)
  }
}

function bytesEqual(bytes, offset, expected) {
  return expected.every((value, index) => bytes[offset + index] === value)
}

function validImageBytes(buffer, contentType) {
  const bytes = new Uint8Array(buffer)
  if (contentType === 'image/jpeg') return bytes.length >= 3 && bytesEqual(bytes, 0, [0xff, 0xd8, 0xff])
  if (contentType === 'image/png') return bytes.length >= 8 && bytesEqual(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (contentType === 'image/gif') {
    return bytes.length >= 6 && (bytesEqual(bytes, 0, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || bytesEqual(bytes, 0, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))
  }
  if (contentType === 'image/webp') {
    return bytes.length >= 12 && bytesEqual(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && bytesEqual(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  }
  if (contentType === 'image/avif') {
    return bytes.length >= 12 && bytesEqual(bytes, 4, [0x66, 0x74, 0x79, 0x70])
      && (bytesEqual(bytes, 8, [0x61, 0x76, 0x69, 0x66]) || bytesEqual(bytes, 8, [0x61, 0x76, 0x69, 0x73]))
  }
  return false
}

async function handleThemeBackground(request, env) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    if (!env.THEME_SETTINGS?.getWithMetadata) return new Response('Not Found', { status: 404 })
    const object = await env.THEME_SETTINGS.getWithMetadata(THEME_BACKGROUND_KEY, 'arrayBuffer')
    if (!object?.value) return new Response('Not Found', { status: 404 })
    return new Response(request.method === 'HEAD' ? null : object.value, {
      headers: {
        'Content-Type': object.metadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  }

  if (request.method !== 'PUT' && request.method !== 'DELETE') {
    return jsonResponse(request, { success: false, error: 'Method Not Allowed' }, 405, { allow: 'GET, HEAD, PUT, DELETE' })
  }
  if (!env.THEME_SETTINGS?.put || !env.THEME_SETTINGS?.delete) {
    return jsonResponse(request, { success: false, error: 'Theme asset storage is unavailable' }, 503)
  }
  if (!await verifyThemeSettingsAuth(request, env)) {
    return jsonResponse(request, { success: false, error: 'Unauthorized' }, 401)
  }

  if (request.method === 'DELETE') {
    await env.THEME_SETTINGS.delete(THEME_BACKGROUND_KEY)
    return jsonResponse(request, { success: true })
  }

  const contentType = (request.headers.get('Content-Type') || '').split(';', 1)[0].trim().toLowerCase()
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(contentType)) {
    return jsonResponse(request, { success: false, error: 'Unsupported image type', code: 'invalid_background_file' }, 415)
  }
  let buffer
  try {
    buffer = await readRequestBuffer(request, MAX_BACKGROUND_BYTES)
  } catch (error) {
    if (error?.code !== 'body_too_large') throw error
    return jsonResponse(request, { success: false, error: 'Background image is too large', code: 'background_file_too_large' }, 413)
  }
  if (!buffer.byteLength) {
    return jsonResponse(request, { success: false, error: 'Background image is too large', code: 'background_file_too_large' }, 413)
  }
  if (!validImageBytes(buffer, contentType)) {
    return jsonResponse(request, { success: false, error: 'File content does not match its image type', code: 'invalid_background_file' }, 400)
  }

  await env.THEME_SETTINGS.put(THEME_BACKGROUND_KEY, buffer, {
    metadata: { contentType }
  })
  const url = new URL('/api/theme-background', request.url)
  url.searchParams.set('v', String(Date.now()))
  return jsonResponse(request, { success: true, url: url.href })
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

function contentSecurityPolicy(env) {
  const connect = new Set(["'self'", 'https://challenges.cloudflare.com'])
  for (const base of apiBases(env.CSM_API_BASE)) {
    try {
      const url = new URL(base)
      connect.add(url.origin)
      const socket = new URL(url.origin)
      socket.protocol = socket.protocol === 'https:' ? 'wss:' : 'ws:'
      connect.add(socket.origin)
    } catch { /* invalid API bases are handled by the frontend */ }
  }
  return [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${[...connect].join(' ')}`,
    'frame-src https://challenges.cloudflare.com',
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; ')
}

function withDocumentSecurity(response, env) {
  const headers = new Headers(response.headers)
  headers.set('Content-Security-Policy', contentSecurityPolicy(env))
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

async function documentAsset(env, request, pathname) {
  return withDocumentSecurity(await env.ASSETS.fetch(assetRequest(request, pathname)), env)
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/theme-settings') return handleThemeSettings(request, env)
    if (pathname === '/api/theme-background') return handleThemeBackground(request, env)

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } })
    }

    if (pathname === '/config.json') return jsonResponse(request, publicConfig(env))

    const preview = new URL(request.url).searchParams.get('preview') === '1'
    if (adminPaths.has(pathname) && !preview && !customAdminEnabled(env)) {
      return Response.redirect(originalAdminUrl(request, env), 302)
    }

    const redirect = legacyRoutes.get(pathname)
    if (redirect) return redirectRequest(request, redirect)

    if (pathname === '/') return documentAsset(env, request, '/index.html')

    if (pathname === '/index.html' || pathname === '/detail.html' || pathname === '/admin.html') {
      return withDocumentSecurity(await env.ASSETS.fetch(request), env)
    }

    return env.ASSETS.fetch(request)
  }
}
