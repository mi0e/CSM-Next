import { normalizeBase } from './url.js'

/**
 * Upstream theme-store convention: the admin panel is always served by the
 * upstream built-in frontend at `/admin#admin`; third-party themes must only
 * link there and never implement their own admin views.
 */
export function originalAdminUrl(base, fallbackUrl = location.href) {
  const normalized = normalizeBase(base || new URL(fallbackUrl).origin)
  const url = new URL(normalized)
  url.pathname = '/admin'
  url.search = ''
  url.hash = 'admin'
  return url.href
}

export function resolveAdminUrl(config = {}, options = {}) {
  return originalAdminUrl(options.siteBase, options.pageUrl || location.href)
}
