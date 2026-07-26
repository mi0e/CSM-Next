const DEFAULT_SITE_TITLE = 'CF-Server-Monitor'

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

let initialTitle = null

/**
 * The <title> present when the app booted — written by the upstream Worker
 * (theme-store mode) or the build script (standalone mode). Cached on first
 * call because views rewrite document.title afterwards.
 */
export function injectedSiteTitle() {
  if (initialTitle === null) {
    initialTitle = typeof document !== 'undefined' ? text(document.title) : ''
  }
  return initialTitle
}

function upstreamTitle(source) {
  if (typeof source === 'string') return text(source)
  return text(source?.site_title ?? source?.siteTitle)
}

/**
 * Prefer the title stored by CF-Server-Monitor. Theme configuration is only a
 * fallback so changing site_title in the original admin remains authoritative.
 */
export function resolveSiteTitle(config = {}, ...upstreamSources) {
  for (const source of upstreamSources.flat()) {
    const title = upstreamTitle(source)
    if (title) return title
  }
  return text(config?.title) || DEFAULT_SITE_TITLE
}

