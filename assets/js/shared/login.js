import { setJwt } from './auth.js'
import { joinUrl } from './url.js'

export function loginTurnstileRequired(config = {}) {
  const enabled = value => value === true || value === 1 || value === '1' || String(value || '').toLowerCase() === 'true'
  return enabled(config.turnstile_login_enabled) || enabled(config.turnstile_enabled)
}

export async function loadTurnstileScript() {
  if (window.turnstile) return
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-csm-next-turnstile]')
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.csmNextTurnstile = 'true'
    script.addEventListener('load', resolve, { once: true })
    script.addEventListener('error', reject, { once: true })
    document.head.append(script)
  })
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
  const response = await fetch(joinUrl(base, '/admin/api'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'login', username, password }),
    cache: 'no-store'
  })
  const data = await response.json().catch(() => null)
  const token = data?.token || data?.data?.token
  if (!response.ok || !token) {
    const error = new Error(data?.error || `HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  setJwt(token, base)
  return token
}
