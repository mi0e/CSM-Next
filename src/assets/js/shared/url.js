/** Normalize an API base to an absolute origin/path without trailing slash. */
export function normalizeBase(value) {
  if (!value) return location.origin
  try {
    return new URL(String(value), location.href).href.replace(/\/$/, '')
  } catch {
    return String(value).replace(/\/$/, '')
  }
}

/** Join base URL and path without double slashes. */
export function joinUrl(base, path) {
  return `${String(base).replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`
}

/**
 * Allow only https background image URLs for CSS url("...").
 * Rejects javascript:, data:, http:, and malformed values.
 * Returns '' when invalid so callers can skip applying a background.
 */
export function sanitizeBackgroundImage(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  // Absolute https only — reject relative paths and other schemes.
  if (!/^https:\/\//i.test(raw)) return ''
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !url.hostname) return ''
    // Escape characters that break out of CSS url("...")
    return url.href.replaceAll('\\', '%5C').replaceAll('"', '%22').replaceAll("'", '%27').replaceAll(')', '%29')
  } catch {
    return ''
  }
}

/** Apply a sanitized background image to document.body, or clear it when invalid. */
export function applyBackgroundImage(value, target = typeof document !== 'undefined' ? document.body : null) {
  if (!target) return ''
  const safe = sanitizeBackgroundImage(value)
  if (safe) {
    target.style.backgroundImage = `url("${safe}")`
    target.classList.add('has-background')
  } else {
    target.style.backgroundImage = ''
    target.classList.remove('has-background')
  }
  return safe
}
