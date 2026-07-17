import { normalizeBase } from './url.js'

export function enabled(value) {
  return value === true || ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

export function isCustomAdminEnabled(config = {}) {
  return enabled(config.customAdminEnabled)
}

export function originalAdminUrl(base, fallbackUrl = location.href) {
  const normalized = normalizeBase(base || new URL(fallbackUrl).origin)
  const url = new URL(normalized)
  url.pathname = '/'
  url.search = ''
  url.hash = '/admin'
  return url.href
}

function configuredAdminUrl(config, siteIndex, pageUrl) {
  const configured = Array.isArray(config?.adminUrl) ? config.adminUrl[siteIndex] : config?.adminUrl
  if (!configured) return ''
  try {
    const url = new URL(String(configured), pageUrl)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

export function themeAdminUrl(pageUrl, siteIndex = 0, preview = false) {
  const url = new URL('./admin.html', pageUrl)
  if (preview) url.searchParams.set('preview', '1')
  if (Number.isFinite(siteIndex) && siteIndex >= 0) url.searchParams.set('site', String(siteIndex))
  return url.href
}

export function resolveAdminUrl(config = {}, options = {}) {
  const pageUrl = options.pageUrl || location.href
  const siteIndex = Number.isFinite(options.siteIndex) ? options.siteIndex : 0
  if (options.preview || isCustomAdminEnabled(config)) {
    return themeAdminUrl(pageUrl, siteIndex, Boolean(options.preview))
  }
  return configuredAdminUrl(config, siteIndex, pageUrl)
    || originalAdminUrl(options.siteBase, pageUrl)
}
