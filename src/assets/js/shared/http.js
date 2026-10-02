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
  const { timeoutMs = 15000, signal, ...init } = options
  const controller = new AbortController()
  let timer
  let rejectAbort
  const aborted = new Promise((_, reject) => { rejectAbort = reject })
  const abort = reason => {
    controller.abort(reason)
    rejectAbort(reason)
  }
  const onAbort = () => abort(signal.reason || new DOMException('Aborted', 'AbortError'))
  if (signal?.aborted) onAbort()
  else signal?.addEventListener('abort', onAbort, { once: true })
  if (timeoutMs > 0) timer = setTimeout(() => abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs)
  try {
    return await Promise.race([aborted, (async () => {
      const response = await fetch(url, { cache: 'no-store', ...init, signal: controller.signal })
      const data = await readJsonSafe(response)
      return { response, data }
    })()])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
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
