/**
 * Shared fetch helpers for theme pages (no secrets, no business auth rules).
 */

/** Parse JSON body; null on failure. */
export async function readJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Fetch URL and parse JSON.
 * @returns {{ response: Response, data: any }}
 */
export async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store', ...options })
  const data = await readJsonSafe(response)
  return { response, data }
}

/**
 * Flatten common API envelopes: { data: { ... } } → merged top-level fields.
 */
export function unwrap(data) {
  if (!data || typeof data !== 'object') return data
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return { ...data, ...data.data }
  }
  return data
}
