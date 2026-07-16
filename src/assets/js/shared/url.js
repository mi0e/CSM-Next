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
