import { escapeHtml } from '../shared/dom.js'
import {
  state, elements, $, t, truthy, showToast, showSettingsError
} from './context.js'
import { adminApi } from './api.js'

export function fillSettingsForm(settings) {
  state.settings = settings
  $('set_site_title').value = settings.site_title || ''
  $('set_custom_bg').value = settings.custom_bg || ''
  $('set_custom_head').value = settings.custom_head || ''
  $('set_custom_script').value = settings.custom_script || ''
  $('set_csp_static').value = settings.csp_static || ''
  $('set_csp_api').value = settings.csp_api || ''
  $('set_is_public').checked = truthy(settings.is_public)
  $('set_show_price').checked = truthy(settings.show_price)
  $('set_show_expire').checked = truthy(settings.show_expire)
  $('set_show_tf').checked = truthy(settings.show_tf)
  $('set_show_time').checked = truthy(settings.show_time)
  $('set_show_long_history').checked = truthy(settings.show_long_history)
  $('set_tg_notify').value = settings.tg_notify || 'false'
  $('set_expire_reminder').value = settings.expire_reminder || 'false'
  $('set_tg_bot_token').value = settings.tg_bot_token || ''
  $('set_tg_chat_id').value = settings.tg_chat_id || ''
  $('set_turnstile_enabled').checked = truthy(settings.turnstile_enabled)
  $('set_turnstile_login_enabled').checked = truthy(settings.turnstile_login_enabled)
  $('set_turnstile_site_key').value = settings.turnstile_site_key || ''
  $('set_turnstile_secret_key').value = settings.turnstile_secret_key || ''
  $('set_jwt_secret').value = ''
  $('set_cloudflare_account_id').value = settings.cloudflare_account_id || ''
  $('set_cloudflare_token').value = settings.cloudflare_token || ''
  $('set_username').value = settings.username || ''
  $('set_password').value = ''
  $('set_confirm_password').value = ''
  $('set_custom_ct').value = settings.custom_ct || ''
  $('set_custom_cu').value = settings.custom_cu || ''
  $('set_custom_cm').value = settings.custom_cm || ''
  $('set_custom_bd').value = settings.custom_bd || ''
  state.changePassword = false
  elements.passwordChangeFields.hidden = true
  elements.togglePasswordChange.textContent = t('changePassword')
}

export async function loadSettings() {
  try {
    const data = await adminApi({ action: 'get_settings' })
    state.apiSecret = data.api_secret || ''
    fillSettingsForm(data.settings || {})
  } catch (error) {
    showToast(error.message || t('loadFailed'))
  }
}

export function collectSettingsPayload() {
  const jwtSecret = $('set_jwt_secret').value
  if (jwtSecret && jwtSecret.length < 32) throw new Error(t('jwtSecretMinLength'))
  if (jwtSecret && /\s/.test(jwtSecret)) throw new Error(t('jwtSecretNoWhitespace'))
  const username = $('set_username').value.trim()
  if (!username) throw new Error(t('usernameRequired'))

  const turnstileEnabled = $('set_turnstile_enabled').checked
  const turnstileLoginEnabled = $('set_turnstile_login_enabled').checked
  if (turnstileEnabled || turnstileLoginEnabled) {
    if (!$('set_turnstile_site_key').value.trim() || !$('set_turnstile_secret_key').value.trim()) {
      throw new Error(t('turnstileRequired'))
    }
  }

  const tgNotify = $('set_tg_notify').value
  const expireReminder = $('set_expire_reminder').value
  if ((tgNotify === 'true' || expireReminder === 'true') && !$('set_tg_bot_token').value.trim()) {
    throw new Error(t('tgTokenRequired'))
  }

  if (state.changePassword) {
    const password = $('set_password').value
    const confirm = $('set_confirm_password').value
    if (password || confirm) {
      if (password !== confirm) throw new Error(t('passwordMismatch'))
    }
  }

  const settings = {
    site_title: $('set_site_title').value,
    custom_bg: $('set_custom_bg').value,
    custom_head: $('set_custom_head').value,
    custom_script: $('set_custom_script').value,
    csp_static: $('set_csp_static').value,
    csp_api: $('set_csp_api').value,
    is_public: $('set_is_public').checked ? 'true' : 'false',
    show_price: $('set_show_price').checked ? 'true' : 'false',
    show_expire: $('set_show_expire').checked ? 'true' : 'false',
    show_tf: $('set_show_tf').checked ? 'true' : 'false',
    show_time: $('set_show_time').checked ? 'true' : 'false',
    show_long_history: $('set_show_long_history').checked ? 'true' : 'false',
    tg_notify: tgNotify,
    expire_reminder: expireReminder,
    tg_bot_token: $('set_tg_bot_token').value,
    tg_chat_id: $('set_tg_chat_id').value,
    turnstile_enabled: turnstileEnabled ? 'true' : 'false',
    turnstile_login_enabled: turnstileLoginEnabled ? 'true' : 'false',
    turnstile_site_key: $('set_turnstile_site_key').value,
    turnstile_secret_key: $('set_turnstile_secret_key').value,
    cloudflare_account_id: $('set_cloudflare_account_id').value,
    cloudflare_token: $('set_cloudflare_token').value,
    username,
    custom_ct: $('set_custom_ct').value,
    custom_cu: $('set_custom_cu').value,
    custom_cm: $('set_custom_cm').value,
    custom_bd: $('set_custom_bd').value
  }
  if (jwtSecret) settings.jwt_secret = jwtSecret
  if (state.changePassword && $('set_password').value) settings.password = $('set_password').value
  return settings
}

export async function saveSettings(event) {
  event.preventDefault()
  showSettingsError('')
  try {
    const settings = collectSettingsPayload()
    elements.saveSettingsButton.disabled = true
    elements.saveSettingsButton.textContent = t('saving')
    await adminApi({ action: 'save_settings', settings })
    showToast(t('settingsSaved'))
    await loadSettings()
  } catch (error) {
    showSettingsError(error.message || t('operationFailed'))
  } finally {
    elements.saveSettingsButton.disabled = false
    elements.saveSettingsButton.textContent = t('saveConfig')
  }
}

export async function sendTestNotification() {
  try {
    await adminApi({
      action: 'send_test_notification',
      tg_bot_token: $('set_tg_bot_token').value,
      tg_chat_id: $('set_tg_chat_id').value
    })
    showToast(t('operationSuccess'))
  } catch (error) {
    showToast(error.message || t('operationFailed'))
  }
}

export function usagePercent(value, limit) {
  if (!limit) return 0
  return Math.min(100, Math.round((Number(value) || 0) / limit * 100))
}

export function renderD1Usage(usage) {
  const blocks = [
    { key: 'today', label: t('today'), data: usage.today, readLimit: 5_000_000, writeLimit: 100_000, reqLimit: 100_000 },
    { key: 'last24Hours', label: t('last24h'), data: usage.last24Hours, readLimit: 5_000_000, writeLimit: 100_000, reqLimit: 100_000 }
  ]
  elements.d1UsageBox.hidden = false
  elements.d1UsageBox.innerHTML = blocks.map(block => {
    const data = block.data || {}
    const rows = [
      [t('d1RowsRead'), data.rowsRead, block.readLimit],
      [t('d1RowsWritten'), data.rowsWritten, block.writeLimit],
      [t('workersRequests'), data.workersRequests, block.reqLimit]
    ]
    return `<div>
      <strong>${escapeHtml(block.label)}</strong>
      ${rows.map(([label, value, limit]) => `
        <div class="quota-item">
          <div class="quota-head"><span>${escapeHtml(label)}: ${Number(value || 0).toLocaleString()} / ${limit.toLocaleString()}</span><span>${usagePercent(value, limit)}%</span></div>
          <div class="quota-bar"><div class="quota-fill" style="width:${usagePercent(value, limit)}%"></div></div>
        </div>
      `).join('')}
    </div>`
  }).join('')
}

export async function queryD1Usage() {
  try {
    elements.queryD1Button.disabled = true
    const data = await adminApi({
      action: 'd1_usage',
      cloudflare_token: $('set_cloudflare_token').value,
      cloudflare_account_id: $('set_cloudflare_account_id').value
    })
    renderD1Usage(data.usage || {})
    showToast(t('operationSuccess'))
  } catch (error) {
    showToast(error.message || t('operationFailed'))
  } finally {
    elements.queryD1Button.disabled = false
  }
}
