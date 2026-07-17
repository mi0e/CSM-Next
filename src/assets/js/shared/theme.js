import { applyBackgroundImage } from './url.js'
import {
  normalizeThemeSettings, validateThemeSettings
} from './theme-settings.js'

export async function loadThemeSettings(fallback = {}, endpoint = './api/theme-settings') {
  try {
    const response = await fetch(endpoint, { cache: 'no-store' })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.settings) throw new Error(data?.error || `HTTP ${response.status}`)
    return {
      ...normalizeThemeSettings(data.settings, fallback),
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
      storage: data.storage || 'kv'
    }
  } catch {
    return { ...normalizeThemeSettings({}, fallback), updatedAt: '', storage: 'fallback' }
  }
}

export async function saveThemeSettings(settings, { token, siteIndex = 0, endpoint = './api/theme-settings' } = {}) {
  const value = validateThemeSettings(settings)
  const url = new URL(endpoint, location.href)
  url.searchParams.set('site', String(siteIndex))
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value),
    cache: 'no-store'
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.settings) {
    const error = new Error(data?.error || `HTTP ${response.status}`)
    error.status = response.status
    error.code = data?.code || ''
    throw error
  }
  return {
    ...normalizeThemeSettings(data.settings),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    storage: data.storage || 'kv'
  }
}

export async function uploadThemeBackground(file, { token, siteIndex = 0, endpoint = './api/theme-background' } = {}) {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
  if (!file || !allowed.has(file.type)) {
    const error = new Error('Unsupported image type')
    error.code = 'invalid_background_file'
    throw error
  }
  if (!file.size || file.size > 2 * 1024 * 1024) {
    const error = new Error('Background image is too large')
    error.code = 'background_file_too_large'
    throw error
  }

  const url = new URL(endpoint, location.href)
  url.searchParams.set('site', String(siteIndex))
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': file.type
    },
    body: file,
    cache: 'no-store'
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.url) {
    const error = new Error(data?.error || `HTTP ${response.status}`)
    error.status = response.status
    error.code = data?.code || ''
    throw error
  }
  return data.url
}

export function applyThemeAppearance(settings, {
  root = typeof document !== 'undefined' ? document.documentElement : null,
  body = typeof document !== 'undefined' ? document.body : null,
  customStyle = typeof document !== 'undefined' ? document.querySelector('#themeCustomStyle') : null
} = {}) {
  const value = normalizeThemeSettings(settings)
  applyBackgroundImage(value.backgroundImage, body)
  const opacity = Math.round(value.panelOpacity * 100)
  root?.style?.setProperty?.('--panel-opacity', `${opacity}%`)
  root?.style?.setProperty?.('--topbar-opacity', `${Math.round(opacity * 0.92)}%`)
  root?.style?.setProperty?.('--background-overlay', `${Math.round(opacity * 0.84)}%`)
  if (customStyle) customStyle.textContent = value.customCss
  return value
}
