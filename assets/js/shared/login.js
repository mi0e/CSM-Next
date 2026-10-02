import { setJwt } from './auth.js'
import { joinUrl } from './url.js'
import { fetchJson } from './http.js'

export function loginTurnstileRequired(config = {}) {
  const enabled = value => value === true || value === 1 || value === '1' || String(value || '').toLowerCase() === 'true'
  return enabled(config.turnstile_login_enabled) || enabled(config.turnstile_enabled)
}

let scriptPromise

export async function loadTurnstileScript({ timeoutMs = 15000 } = {}) {
  if (window.turnstile) return
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-csm-next-turnstile]')
    const script = existing || document.createElement('script')
    const finish = error => {
      clearTimeout(timer)
      script.removeEventListener?.('load', loaded)
      script.removeEventListener?.('error', failed)
      if (error) { script.remove?.(); reject(error) }
      else resolve()
    }
    const failed = () => finish(new Error('Turnstile failed to load. Please retry.'))
    const loaded = () => window.turnstile ? finish() : failed()
    const timer = setTimeout(() => finish(new Error('Turnstile timed out. Please retry.')), timeoutMs)
    script.addEventListener('load', loaded, { once: true })
    script.addEventListener('error', failed, { once: true })
    if (!existing) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.csmNextTurnstile = 'true'
      document.head.append(script)
    }
  }).finally(() => { scriptPromise = null })
  return scriptPromise
}

export function removeLoginTurnstile(widgetId, container) {
  if (widgetId != null && window.turnstile?.remove) {
    try { window.turnstile.remove(widgetId) } catch { /* noop */ }
  }
  container?.replaceChildren()
}

export async function renderLoginTurnstile({ config = {}, container, theme = 'light', onExpire } = {}) {
  if (!container || !loginTurnstileRequired(config) || !config.turnstile_site_key) {
    if (container) container.hidden = true
    return null
  }
  container.hidden = false
  await loadTurnstileScript()
  let widgetId = null
  widgetId = window.turnstile.render(container, {
    sitekey: config.turnstile_site_key,
    theme,
    'expired-callback': () => {
      if (typeof onExpire === 'function') onExpire(widgetId)
      else if (widgetId != null) window.turnstile?.reset?.(widgetId)
    }
  })
  return widgetId
}

export function getLoginTurnstileToken(config = {}, widgetId = null) {
  if (!loginTurnstileRequired(config)) return ''
  if (widgetId == null || !window.turnstile?.getResponse) return ''
  return window.turnstile.getResponse(widgetId) || ''
}

export async function loginWithCredentials({ base, username, password, turnstileToken = '' }) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (turnstileToken) headers.set('X-Turnstile-Token', turnstileToken)
  const { response, data } = await fetchJson(joinUrl(base, '/admin/api'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'login', username, password }),
    cache: 'no-store'
  })
  const token = data?.token || data?.data?.token
  if (!response.ok || !token) {
    const error = new Error(data?.error || `HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  setJwt(token, base)
  return token
}
