import { getJwt, setJwt } from '../shared/auth.js'
import { fetchJson, unwrap } from '../shared/http.js'
import { joinUrl } from '../shared/url.js'
import {
  state, elements, t, currentBase, truthy, showToast, showLoginError, setAuthedView,
  updateBrandTitle
} from './context.js'

export const hooks = { enterApp: null }
export { fetchJson, unwrap }

export async function adminApi(payload, { auth = true } = {}) {
  if (state.preview) return previewAdminApi(payload)
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (auth) {
    const token = getJwt(currentBase())
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  if (payload.action === 'login') {
    const turnstile = getLoginTurnstileToken()
    if (turnstile) headers.set('X-Turnstile-Token', turnstile)
  }
  const { response, data } = await fetchJson(joinUrl(currentBase(), '/admin/api'), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })
  const body = unwrap(data)
  if (response.status === 401) {
    setJwt('', currentBase())
    setAuthedView(false)
    throw new Error(body?.error || t('unauthorized'))
  }
  if (!response.ok || body?.error) {
    throw new Error(body?.error || body?.message || t('operationFailed'))
  }
  return body
}

export async function postSystem(path) {
  if (state.preview) return { success: true, message: 'ok' }
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const token = getJwt(currentBase())
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const { response, data } = await fetchJson(joinUrl(currentBase(), path), {
    method: 'POST',
    headers,
    body: '{}'
  })
  const body = unwrap(data)
  if (response.status === 401) {
    setJwt('', currentBase())
    setAuthedView(false)
    throw new Error(t('unauthorized'))
  }
  if (!response.ok || body?.error) throw new Error(body?.error || body?.message || t('operationFailed'))
  return body
}

export function previewAdminApi(payload) {
  if (payload.action === 'login') {
    return { success: true, token: 'preview-token', message: 'loginSuccessful' }
  }
  if (payload.action === 'list') {
    return {
      success: true,
      servers: state.servers.length ? state.servers : previewServers(),
      stats: { total: 2, online: 1, offline: 1 }
    }
  }
  if (payload.action === 'get_settings') {
    return {
      success: true,
      api_secret: 'preview-secret',
      settings: {
        site_title: state.config.title || 'CF-Server-Monitor',
        custom_bg: '', custom_head: '', custom_script: '',
        is_public: 'true', show_price: 'true', show_expire: 'true', show_tf: 'true', show_time: 'true',
        show_long_history: 'false', tg_notify: 'false', expire_reminder: 'false',
        tg_bot_token: '', tg_chat_id: '', turnstile_enabled: 'false', turnstile_login_enabled: 'false',
        turnstile_site_key: '', turnstile_secret_key: '', username: 'admin',
        cloudflare_account_id: '', cloudflare_token: '',
        custom_ct: '', custom_cu: '', custom_cm: '', custom_bd: '', csp_static: '', csp_api: ''
      }
    }
  }
  if (payload.action === 'add') {
    const server = {
      id: crypto.randomUUID(), name: payload.name, server_group: payload.server_group || 'Default',
      tags: '', note: '', price: '', expire_date: '', traffic_limit: '', is_online: false, region: 'HK'
    }
    state.servers = [...state.servers, server]
    return { success: true, id: server.id, message: 'serverAdded' }
  }
  if (payload.action === 'edit') {
    state.servers = state.servers.map(item => item.id === payload.id ? { ...item, ...payload, is_hidden: payload.is_hidden } : item)
    return { success: true, message: 'serverUpdated' }
  }
  if (payload.action === 'delete') {
    state.servers = state.servers.filter(item => item.id !== payload.id)
    return { success: true, message: 'serverDeleted' }
  }
  if (payload.action === 'batch_delete') {
    const ids = new Set(payload.ids || [])
    state.servers = state.servers.filter(item => !ids.has(item.id))
    return { success: true, message: 'batchDeleted' }
  }
  if (payload.action === 'save_order') {
    const order = payload.orders || []
    state.servers = order.map(id => state.servers.find(item => item.id === id)).filter(Boolean)
    return { success: true, message: 'sortOrderSaved' }
  }
  if (payload.action === 'save_settings' || payload.action === 'send_test_notification') {
    return { success: true, message: 'ok' }
  }
  if (payload.action === 'd1_usage') {
    return {
      success: true,
      usage: {
        today: { rowsRead: 12000, rowsWritten: 800, workersRequests: 1500 },
        last24Hours: { rowsRead: 24000, rowsWritten: 1600, workersRequests: 3000 }
      }
    }
  }
  return { success: true }
}

export function previewServers() {
  return [
    {
      id: '11111111-1111-1111-1111-111111111111', name: 'Azure-香港-1', server_group: '亚太',
      tags: 'Azure,HK', note: 'demo', price: '¥99/年', expire_date: '2026-12-31',
      traffic_limit: '1000', is_online: true, region: 'HK', collect_interval: 0, report_interval: 60, ping_mode: 'http', reset_day: 1
    },
    {
      id: '22222222-2222-2222-2222-222222222222', name: 'AWS-东京', server_group: '亚太',
      tags: 'AWS', note: '', price: '免费/年', expire_date: '', traffic_limit: '', is_online: false, region: 'JP',
      collect_interval: 0, report_interval: 60, ping_mode: 'tcp', reset_day: 1
    }
  ]
}

export function loginTurnstileRequired() {
  return truthy(state.apiConfig?.turnstile_login_enabled) || truthy(state.apiConfig?.turnstile_enabled)
}

export function getLoginTurnstileToken() {
  if (!loginTurnstileRequired()) return ''
  return window.turnstile?.getResponse?.(state.turnstileWidgetId) || ''
}

export async function ensureLoginTurnstile() {
  elements.loginTurnstile?.replaceChildren()
  state.turnstileWidgetId = null
  if (!loginTurnstileRequired()) {
    if (elements.loginTurnstile) elements.loginTurnstile.hidden = true
    return
  }
  const siteKey = state.apiConfig?.turnstile_site_key
  if (!siteKey || !elements.loginTurnstile) {
    if (elements.loginTurnstile) elements.loginTurnstile.hidden = true
    return
  }
  elements.loginTurnstile.hidden = false
  await loadTurnstileScript()
  state.turnstileWidgetId = window.turnstile.render(elements.loginTurnstile, { sitekey: siteKey })
}

export function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.dataset.turnstile = '1'
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export async function loadApiConfig() {
  if (state.preview) {
    state.apiConfig = { turnstile_login_enabled: false, version: 'preview' }
    updateBrandTitle()
    return
  }
  try {
    const { response, data } = await fetchJson(joinUrl(currentBase(), '/api/config'))
    if (response.ok) state.apiConfig = unwrap(data) || data || {}
  } catch {
    state.apiConfig = {}
  }
  updateBrandTitle()
}

export async function submitLogin(event) {
  event?.preventDefault?.()
  if (state.loginBusy) return
  const username = elements.loginUsername.value.trim()
  const password = elements.loginPassword.value
  if (!username || !password) {
    showLoginError(t('loginMissing'))
    return
  }
  if (loginTurnstileRequired() && !getLoginTurnstileToken()) {
    showLoginError(t('loginTurnstile'))
    return
  }
  state.loginBusy = true
  elements.loginSubmit.disabled = true
  showLoginError('')
  try {
    const data = await adminApi({ action: 'login', username, password }, { auth: false })
    const token = data?.token
    if (!token) throw new Error(t('loginFailed'))
    setJwt(token, currentBase())
    showToast(t('loginSuccess'))
    if (typeof hooks.enterApp === 'function') await hooks.enterApp()
  } catch (error) {
    if (state.turnstileWidgetId != null && window.turnstile?.reset) window.turnstile.reset(state.turnstileWidgetId)
    showLoginError(error.message || t('loginFailed'))
  } finally {
    state.loginBusy = false
    elements.loginSubmit.disabled = false
  }
}
