import { getJwt, setJwt, isLoggedIn } from './shared/auth.js'
import { originalAdminUrl, resolveAdminUrl } from './shared/admin.js'
import { escapeHtml } from './shared/dom.js'
import { fetchJson } from './shared/http.js'
import {
  getLoginTurnstileToken, loginTurnstileRequired, loginWithCredentials,
  removeLoginTurnstile, renderLoginTurnstile
} from './shared/login.js'
import { applyThemeAppearance, loadThemeSettings } from './shared/theme.js'
import { normalizeThemeSettings } from './shared/theme-settings.js'
import { resolveSiteTitle } from './shared/title.js'
import { joinUrl, metaApiBases, normalizeBase } from './shared/url.js'

const ONLINE_THRESHOLD = 5 * 60 * 1000
const MB = 1024 * 1024

const translations = {
  zh: {
    dashboard: '仪表盘', refresh: '刷新数据', theme: '切换明暗主题', language: 'Switch to English', admin: '管理后台',
    loading: '正在载入节点详情', loadFailed: '无法载入节点详情', retry: '重试', back: '返回仪表盘',
    online: '在线', offline: '离线', cpu: 'CPU', architecture: '架构', os: '操作系统',
    netSpeed: '网络速度', traffic: '流量', ram: '内存', swap: '交换空间', disk: '磁盘', uptime: '运行时间', lastUpdate: '最后更新',
    connections: '连接数', processes: '进程', cores: '{count} 核', unavailable: '—', download: '下行', upload: '上行',
    historyEmpty: '当前时间范围没有历史数据',
    loginRequired: '超过 1 小时的历史数据需要登录。主题与原后台域名不同，登录状态不会自动共享，请在当前站点登录一次。',
    loginTitle: '登录后查看长历史',
    loginMessage: 'JWT 保存在浏览器当前域名下。原管理端登录不会自动穿透到本主题，请在此输入账号密码。',
    username: '用户名', password: '密码', login: '登录', cancel: '取消', openAdmin: '打开原站后台',
    loginSuccess: '登录成功，正在载入历史数据', loginFailed: '登录失败，请检查账号密码',
    loginMissing: '请输入用户名和密码', loginTurnstile: '请先完成安全验证',
    historyFailed: '历史数据载入失败', databaseUpgrade: '后端数据库需要升级，请在上游管理后台完成升级后重试', current: '当前', telecom: '电信 TCP', unicom: '联通 TCP', mobile: '移动 TCP', backup: '备用线路',
    loss: '丢包', volatility: '波动', refreshed: '详情已刷新', invalidId: '缺少服务器 ID',
    justNow: '刚刚', ago: '{value}前', dayShort: '天', hourShort: '时', minuteShort: '分', secondShort: '秒'
  },
  en: {
    dashboard: 'Dashboard', refresh: 'Refresh data', theme: 'Toggle color theme', language: '切换到中文', admin: 'Admin',
    loading: 'Loading server detail', loadFailed: 'Unable to load server detail', retry: 'Retry', back: 'Back to dashboard',
    online: 'Online', offline: 'Offline', cpu: 'CPU', architecture: 'Architecture', os: 'OS',
    netSpeed: 'Net Spd', traffic: 'Traffic', ram: 'RAM', swap: 'Swap', disk: 'Disk', uptime: 'Uptime', lastUpdate: 'Last Update',
    connections: 'Connections', processes: 'Processes', cores: '{count} Cores', unavailable: '—', download: 'Download', upload: 'Upload',
    historyEmpty: 'No historical data in this range',
    loginRequired: 'History beyond one hour requires login. Because this theme uses a different domain, the original Admin session is not shared—sign in here once.',
    loginTitle: 'Sign in for long history',
    loginMessage: 'JWT tokens are scoped to the current browser origin. Logging into the original Admin panel does not transfer credentials here.',
    username: 'Username', password: 'Password', login: 'Sign in', cancel: 'Cancel', openAdmin: 'Open original admin',
    loginSuccess: 'Signed in. Loading history…', loginFailed: 'Sign-in failed. Check username and password.',
    loginMissing: 'Enter username and password', loginTurnstile: 'Complete the security check first',
    historyFailed: 'Failed to load history', databaseUpgrade: 'The backend database needs an upgrade. Finish it in the upstream admin panel, then retry.', current: 'Current', telecom: 'Telecom TCP', unicom: 'Unicom TCP', mobile: 'Mobile TCP', backup: 'Backup',
    loss: 'Loss', volatility: 'Vol', refreshed: 'Detail refreshed', invalidId: 'Missing server ID',
    justNow: 'just now', ago: '{value} ago', dayShort: 'd', hourShort: 'h', minuteShort: 'm', secondShort: 's'
  }
}

const colors = {
  red: '#ff8d8d', redFill: '#ffb7b7', green: '#2f7d3a', cyan: '#6bc7c5', blue: '#7d82d6', orange: '#ff9f43', magenta: '#ff2b91'
}

const params = new URLSearchParams(location.search)
const state = {
  config: {}, sites: [], site: null, server: null, history: [], hours: 1, apiConfig: {},
  themeSettings: normalizeThemeSettings(), themeSettingsLoaded: false,
  id: params.get('id') || '', siteIndex: Number(params.get('site') || 0), preview: params.get('preview') === '1',
  language: localStorage.getItem('csm-next-language') || (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'),
  theme: localStorage.getItem('csm-next-theme') || 'light', tab: 'load', socket: null, socketManual: false,
  socketRetry: null, renderTimer: null, refreshTimer: null, clockTimer: null,
  pendingHistoryHours: null, loginBusy: false, turnstileWidgetId: null
}

const elements = {
  brandTitle: document.querySelector('#brandTitle'), adminLink: document.querySelector('#adminLink'),
  refreshButton: document.querySelector('#refreshButton'), themeButton: document.querySelector('#themeButton'), languageButton: document.querySelector('#languageButton'),
  retryButton: document.querySelector('#retryButton'), loading: document.querySelector('#detailLoading'), error: document.querySelector('#detailError'),
  errorMessage: document.querySelector('#detailErrorMessage'), content: document.querySelector('#detailContent'), nodeFlag: document.querySelector('#nodeFlag'),
  nodeName: document.querySelector('#nodeName'), nodeId: document.querySelector('#nodeId'), nodeStatus: document.querySelector('#nodeStatus'),
  specGrid: document.querySelector('#specGrid'), loadPanel: document.querySelector('#loadPanel'), pingPanel: document.querySelector('#pingPanel'),
  historyNotice: document.querySelector('#historyNotice'), pingLegend: document.querySelector('#pingLegend'), versionText: document.querySelector('#versionText'),
  cpuCurrent: document.querySelector('#cpuCurrent'), ramCurrent: document.querySelector('#ramCurrent'), diskCurrent: document.querySelector('#diskCurrent'),
  netCurrent: document.querySelector('#netCurrent'), connectionsCurrent: document.querySelector('#connectionsCurrent'), processesCurrent: document.querySelector('#processesCurrent'),
  cpuChart: document.querySelector('#cpuChart'), ramChart: document.querySelector('#ramChart'), diskChart: document.querySelector('#diskChart'),
  netChart: document.querySelector('#netChart'), connectionsChart: document.querySelector('#connectionsChart'), processesChart: document.querySelector('#processesChart'),
  pingChart: document.querySelector('#pingChart'), toast: document.querySelector('#toast'), themeColor: document.querySelector('meta[name="theme-color"]'),
  loginModal: document.querySelector('#loginModal'), loginForm: document.querySelector('#loginForm'),
  loginUsername: document.querySelector('#loginUsername'), loginPassword: document.querySelector('#loginPassword'),
  loginError: document.querySelector('#loginError'), loginMessage: document.querySelector('#loginMessage'),
  loginSubmit: document.querySelector('#loginSubmit'), loginCancel: document.querySelector('#loginCancel'),
  loginTurnstile: document.querySelector('#loginTurnstile'), loginAdminLink: document.querySelector('#loginAdminLink')
}

function t(key, values = {}) {
  let text = translations[state.language]?.[key] ?? translations.en[key] ?? key
  for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value))
  return text
}

function number(value, fallback = 0) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, number(value)))
}

function timestamp(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed < 10_000_000_000 ? parsed * 1000 : parsed
}

function formatBytes(value, digits = 2) {
  const bytes = number(value)
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const scaled = bytes / (1024 ** index)
  const precision = scaled >= 100 ? 0 : scaled >= 10 ? Math.min(1, digits) : digits
  return `${Number(scaled.toFixed(precision))} ${units[index]}`
}

function formatMb(value) {
  return formatBytes(number(value) * MB)
}

function formatCompact(value) {
  const amount = number(value)
  if (amount >= 1_000_000) return `${Number((amount / 1_000_000).toFixed(1))}M`
  if (amount >= 1_000) return `${Number((amount / 1_000).toFixed(1))}K`
  return `${Number(amount.toFixed(amount < 10 ? 1 : 0))}`
}

function formatDate(value) {
  const time = timestamp(value)
  if (!time) return '—'
  return new Date(time).toLocaleString(state.language === 'zh' ? 'zh-CN' : 'en-GB', { hour12: false })
}

function formatClock(value) {
  const time = timestamp(value)
  if (!time) return '—'
  return new Date(time).toLocaleTimeString(state.language === 'zh' ? 'zh-CN' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatTooltipTime(value) {
  const time = timestamp(value)
  if (!time) return '—'
  return new Date(time).toLocaleTimeString(state.language === 'zh' ? 'zh-CN' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function formatUptime(server) {
  const boot = timestamp(server?.boot_time)
  if (!boot || boot > Date.now()) return '—'
  let seconds = Math.floor((Date.now() - boot) / 1000)
  const days = Math.floor(seconds / 86400); seconds %= 86400
  const hours = Math.floor(seconds / 3600); seconds %= 3600
  const minutes = Math.floor(seconds / 60); seconds %= 60
  const parts = []
  if (days) parts.push(`${days}${t('dayShort')}`)
  if (hours || days) parts.push(`${hours}${t('hourShort')}`)
  parts.push(`${minutes}${t('minuteShort')}`)
  parts.push(`${seconds}${t('secondShort')}`)
  return parts.join(' ')
}

function isOnline(server) {
  const updated = timestamp(server?.report_timestamp ?? server?.last_updated)
  return Boolean(updated && Date.now() - updated < ONLINE_THRESHOLD)
}

function flagMarkup(region, compact = false) {
  const code = String(region || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX') return '<span class="flag-code">--</span>'
  const lower = code.toLowerCase()
  return `<img class="region-flag" src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.3.2/flags/4x3/${lower}.svg" alt="" referrerpolicy="no-referrer"><span class="flag-code" hidden>${escapeHtml(code)}</span>`
}

function storageKey(base) {
  return `csm-next-turnstile:${base}`
}

function currentBase() {
  return state.site?.base || location.origin
}

async function loadConfig() {
  let config = {}
  try {
    const response = await fetch('./config.json', { cache: 'no-store' })
    if (!response.ok) throw new Error(`config.json: ${response.status}`)
    config = await response.json() || {}
  } catch { /* fall through to meta/same-origin defaults */ }
  const configured = (Array.isArray(config.apiBase) ? config.apiBase : config.apiBase ? [config.apiBase] : []).filter(Boolean)
  return {
    title: 'CF-Server-Monitor',
    backgroundImage: '',
    customAdminEnabled: false,
    ...config,
    apiBase: configured.length ? configured : metaApiBases()
  }
}

async function requestJson(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const base = currentBase()
  const jwt = getJwt(base)
  const credential = sessionStorage.getItem(storageKey(base))
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`)
  if (credential) headers.set('X-Turnstile-Verified', credential)
  const { response, data } = await fetchJson(joinUrl(base, path), { ...options, headers })
  const verified = response.headers.get('X-Turnstile-Verified') || data?.turnstile_verified
  if (verified) sessionStorage.setItem(storageKey(base), verified)
  if (!response.ok) {
    if (response.status === 401 && jwt) setJwt('', base)
    const error = new Error(data?.error || `HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  return data
}

function destroyLoginTurnstile() {
  removeLoginTurnstile(state.turnstileWidgetId, elements.loginTurnstile)
  state.turnstileWidgetId = null
}

async function ensureLoginTurnstile() {
  destroyLoginTurnstile()
  state.turnstileWidgetId = await renderLoginTurnstile({
    config: state.apiConfig,
    container: elements.loginTurnstile,
    theme: state.theme
  })
}

function showLoginError(message = '') {
  if (!elements.loginError) return
  elements.loginError.textContent = message
  elements.loginError.hidden = !message
}

function openLoginModal(hours = state.pendingHistoryHours) {
  state.pendingHistoryHours = hours
  if (elements.loginAdminLink) {
    elements.loginAdminLink.href = originalAdminUrl(currentBase(), location.href)
  }
  if (elements.loginMessage) elements.loginMessage.textContent = t('loginMessage')
  showLoginError('')
  if (elements.loginModal) elements.loginModal.hidden = false
  ensureLoginTurnstile().catch(() => showLoginError(t('loginTurnstile')))
  requestAnimationFrame(() => elements.loginUsername?.focus())
}

function closeLoginModal({ clearPending = false } = {}) {
  if (elements.loginModal) elements.loginModal.hidden = true
  destroyLoginTurnstile()
  showLoginError('')
  if (elements.loginPassword) elements.loginPassword.value = ''
  if (clearPending) state.pendingHistoryHours = null
  state.loginBusy = false
  if (elements.loginSubmit) elements.loginSubmit.disabled = false
}

async function submitLogin(event) {
  event?.preventDefault?.()
  if (state.loginBusy || state.preview) return
  const username = elements.loginUsername?.value?.trim() || ''
  const password = elements.loginPassword?.value || ''
  if (!username || !password) {
    showLoginError(t('loginMissing'))
    return
  }
  if (loginTurnstileRequired(state.apiConfig)) {
    const token = getLoginTurnstileToken(state.apiConfig, state.turnstileWidgetId)
    if (!token) {
      showLoginError(t('loginTurnstile'))
      return
    }
  }

  state.loginBusy = true
  if (elements.loginSubmit) elements.loginSubmit.disabled = true
  showLoginError('')
  try {
    const turnstileToken = getLoginTurnstileToken(state.apiConfig, state.turnstileWidgetId)
    await loginWithCredentials({ base: currentBase(), username, password, turnstileToken })
    const pendingHours = state.pendingHistoryHours ?? state.hours
    closeLoginModal({ clearPending: true })
    showToast(t('loginSuccess'))
    await loadHistory(pendingHours)
  } catch (error) {
    showLoginError(error.message || t('loginFailed'))
  } finally {
    state.loginBusy = false
    if (elements.loginSubmit) elements.loginSubmit.disabled = false
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme
  elements.themeColor?.setAttribute('content', state.theme === 'dark' ? '#101216' : '#f8f9fb')
}

function applyTranslations() {
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en'
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n) })
  document.querySelectorAll('[data-i18n-title]').forEach(node => {
    const label = t(node.dataset.i18nTitle); node.title = label; node.setAttribute('aria-label', label)
  })
}

function applyConfig() {
  const title = resolveSiteTitle(state.config, state.apiConfig)
  elements.brandTitle.textContent = title
  document.title = state.server ? `${state.server.name} · ${title}` : title
  const adminHref = resolveAdminUrl(state.config, {
    siteBase: currentBase(),
    siteIndex: state.siteIndex,
    pageUrl: location.href,
    preview: state.preview
  })
  elements.adminLink.href = adminHref
  const external = new URL(adminHref, location.href).origin !== location.origin
  elements.adminLink.target = external ? '_blank' : ''
  elements.adminLink.rel = external ? 'noopener noreferrer' : ''
  if (elements.loginAdminLink) elements.loginAdminLink.href = originalAdminUrl(currentBase(), location.href)
  if (state.preview) document.querySelectorAll('a[href="./"]').forEach(link => { link.href = './?preview=1' })
  const appearance = state.themeSettingsLoaded
    ? state.themeSettings
    : normalizeThemeSettings({}, { backgroundImage: state.config.backgroundImage, panelOpacity: 1 })
  state.themeSettings = applyThemeAppearance(appearance)
}

function showToast(message) {
  elements.toast.textContent = message
  elements.toast.classList.add('show')
  clearTimeout(showToast.timer)
  showToast.timer = setTimeout(() => elements.toast.classList.remove('show'), 2200)
}

function previewServer() {
  const now = Date.now()
  return {
    id: state.id || 'preview-2', name: 'yt-Hong Kong', region: 'HK', server_group: 'Asia', cpu: 4.1,
    cpu_info: 'AMD EPYC 7542 32-Core Processor', cpu_cores: 1, arch: 'amd64', os: 'Debian GNU/Linux 12 (bookworm)',
    ram_total: 960.7, ram_used: 238.9, swap_total: 1024, swap_used: 0.84,
    disk_total: 9974, disk_used: 4719, net_in_speed: 57139, net_out_speed: 48630,
    net_rx_monthly: 109.88 * 1024 ** 3, net_tx_monthly: 88.92 * 1024 ** 3,
    processes: 72, tcp_conn: 146, udp_conn: 12, ping_ct: 172, ping_cu: 149, ping_cm: 37, ping_bd: 96,
    loss_ct: 25, loss_cu: 0, loss_cm: 0, loss_bd: 0, boot_time: now - 7.53 * 86400000,
    last_updated: now - 14000, report_timestamp: now - 14000, ip_v4: '1', ip_v6: '1'
  }
}

function previewHistory(server) {
  const now = Date.now()
  return Array.from({ length: 60 }, (_, index) => {
    const wave = Math.sin(index / 5); const spike = index % 19 === 0 ? 18 : 0
    return {
      timestamp: now - (59 - index) * 60000, cpu: Math.max(0, 3 + wave * 2 + spike),
      ram_total: server.ram_total, ram_used: 238 + wave * 7, swap_total: server.swap_total, swap_used: 0.8,
      disk_total: server.disk_total, disk_used: 4710 + index * 0.14, net_in_speed: 4500 + Math.abs(Math.sin(index / 3)) * 80000 + (index % 17 === 0 ? 900000 : 0),
      net_out_speed: 3500 + Math.abs(Math.cos(index / 4)) * 60000, tcp_conn: 120 + wave * 22, udp_conn: 5 + (index > 25 ? 7 : 0),
      processes: 72 + Math.sin(index / 4) * 6 + (index % 23 === 0 ? 25 : 0),
      ping_ct: 160 + Math.sin(index / 4) * 14 + (index % 20 === 0 ? 80 : 0), ping_cu: 150 + Math.sin(index / 6) * 13,
      ping_cm: 38 + Math.sin(index / 5) * 8, ping_bd: 92 + Math.cos(index / 7) * 12,
      loss_ct: index % 21 === 0 ? 25 : 0, loss_cu: 0, loss_cm: 0, loss_bd: 0
    }
  })
}

function specCard(label, value, note = '', classes = '') {
  return `<article class="spec-card ${classes}"><span>${escapeHtml(label)}</span><strong>${value}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ''}</article>`
}

function renderIdentity() {
  const server = state.server; const online = isOnline(server)
  elements.nodeFlag.innerHTML = flagMarkup(server.region)
  elements.nodeName.textContent = server.name || server.id
  elements.nodeId.textContent = server.id
  elements.nodeStatus.textContent = online ? t('online') : t('offline')
  elements.nodeStatus.classList.toggle('offline', !online)
  document.title = `${server.name || server.id} · ${resolveSiteTitle(state.config, state.apiConfig)}`
}

function renderSpecs() {
  const server = state.server
  const network = `<span class="spec-lines"><span class="up">↑ ${formatBytes(server.net_out_speed)}/s</span><span class="down">↓ ${formatBytes(server.net_in_speed)}/s</span></span>`
  const traffic = `<span class="spec-lines"><span>↑ ${formatBytes(server.net_tx_monthly)}</span><span>↓ ${formatBytes(server.net_rx_monthly)}</span></span>`
  elements.specGrid.innerHTML = [
    specCard(t('cpu'), escapeHtml(server.cpu_info || '—'), t('cores', { count: number(server.cpu_cores) || '—' }), 'span-2'),
    specCard(t('architecture'), escapeHtml(server.arch || '—')),
    specCard(t('os'), escapeHtml(server.os || '—'), '', 'span-2'),
    specCard(t('netSpeed'), network),
    specCard(t('traffic'), traffic),
    specCard(t('ram'), escapeHtml(formatMb(server.ram_total))),
    specCard(t('swap'), escapeHtml(formatMb(server.swap_total))),
    specCard(t('disk'), escapeHtml(formatMb(server.disk_total))),
    specCard(t('uptime'), escapeHtml(formatUptime(server))),
    specCard(t('lastUpdate'), escapeHtml(formatDate(server.last_updated)))
  ].join('')
}

function historyRows() {
  return (Array.isArray(state.history) ? state.history : []).filter(row => timestamp(row?.timestamp) > 0)
}

function pathFor(rows, getter, xFor, yFor) {
  let path = ''; let active = false
  rows.forEach((row, index) => {
    const value = Number(getter(row))
    if (!Number.isFinite(value)) { active = false; return }
    const command = active ? 'L' : 'M'
    path += `${command}${xFor(row, index).toFixed(2)},${yFor(value).toFixed(2)} `
    active = true
  })
  return path.trim()
}

function bindChartHover(target, context) {
  const { rows, series, width, height, margin, plotHeight, firstTime, span, xFor, yFor, options } = context
  const crosshair = target.querySelector('.chart-hover-line')
  const points = target.querySelector('.chart-hover-points')
  const tooltip = target.querySelector('.chart-tooltip')

  const hide = () => {
    crosshair.hidden = true
    crosshair.setAttribute('hidden', '')
    points.innerHTML = ''
    tooltip.hidden = true
  }

  target.onpointerleave = hide
  target.onpointermove = event => {
    const rect = target.getBoundingClientRect()
    if (!rect.width || !rows.length) return
    const localX = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
    const svgX = localX / rect.width * width
    const ratio = Math.max(0, Math.min(1, (svgX - margin.left) / Math.max(1, width - margin.left - margin.right)))
    const wantedTime = firstTime + ratio * span

    let low = 0; let high = rows.length - 1
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (timestamp(rows[middle].timestamp) < wantedTime) low = middle + 1
      else high = middle
    }
    const candidates = [rows[low], rows[Math.max(0, low - 1)]].filter(Boolean)
    const row = candidates.reduce((best, candidate) => Math.abs(timestamp(candidate.timestamp) - wantedTime) < Math.abs(timestamp(best.timestamp) - wantedTime) ? candidate : best)
    const x = xFor(row)
    const entries = series.map(item => {
      const value = Number(item.get(row))
      if (!Number.isFinite(value)) return null
      return {
        label: item.label || '', color: item.color || colors.red, value,
        text: (item.formatValue || options.formatTooltip || formatCompact)(value), y: yFor(value)
      }
    }).filter(Boolean)
    if (!entries.length) { hide(); return }

    crosshair.setAttribute('x1', x); crosshair.setAttribute('x2', x)
    crosshair.setAttribute('y1', margin.top); crosshair.setAttribute('y2', margin.top + plotHeight)
    crosshair.hidden = false
    crosshair.removeAttribute?.('hidden')
    points.innerHTML = entries.map(entry => `<circle class="chart-hover-point" cx="${x}" cy="${entry.y}" r="3.3" fill="${entry.color}"></circle>`).join('')
    tooltip.innerHTML = `<strong>${formatTooltipTime(row.timestamp)}</strong>${entries.map(entry => `<div><i style="background:${entry.color}"></i><span>${escapeHtml(entry.label)}</span><b>${escapeHtml(entry.text)}</b></div>`).join('')}`
    tooltip.hidden = false
    tooltip.classList.toggle('flip', localX > rect.width * 0.62)
    tooltip.style.left = `${localX}px`
    const averageY = entries.reduce((sum, entry) => sum + entry.y, 0) / entries.length
    const pixelY = averageY / height * rect.height
    tooltip.style.top = `${Math.max(42, Math.min(rect.height - 42, pixelY))}px`
  }
}

function renderLineChart(target, rows, series, options = {}) {
  if (!rows.length) {
    target.innerHTML = `<div class="chart-empty">${escapeHtml(t('historyEmpty'))}</div>`
    return
  }
  const width = Math.max(280, Math.round(target.getBoundingClientRect?.().width || 320))
  const height = options.height || 165
  const margin = { left: 34, right: 8, top: 8, bottom: 22 }
  const plotWidth = width - margin.left - margin.right; const plotHeight = height - margin.top - margin.bottom
  const allValues = []
  series.forEach(item => rows.forEach(row => {
    const value = Number(item.get(row)); if (Number.isFinite(value)) allValues.push(value)
  }))
  if (!allValues.length) {
    target.innerHTML = `<div class="chart-empty">${escapeHtml(t('historyEmpty'))}</div>`
    return
  }
  let min = options.min ?? (options.includeZero ? 0 : Math.min(...allValues))
  let max = options.max ?? Math.max(...allValues)
  if (options.pad && options.min === undefined) {
    const spread = Math.max(1, max - min); min = Math.max(0, min - spread * 0.18); max += spread * 0.18
  }
  if (max <= min) max = min + 1
  const times = rows.map(row => timestamp(row.timestamp))
  const firstTime = Math.min(...times); const lastTime = Math.max(...times); const span = Math.max(1, lastTime - firstTime)
  const xFor = row => margin.left + ((timestamp(row.timestamp) - firstTime) / span) * plotWidth
  const yFor = value => margin.top + (1 - (value - min) / (max - min)) * plotHeight
  const formatY = options.formatY || (value => formatCompact(value))
  const grid = [0, 0.5, 1].map(ratio => {
    const y = margin.top + plotHeight * ratio; const value = max - (max - min) * ratio
    return `<line class="chart-grid-line" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line><text class="chart-axis-label" x="0" y="${y + 3}">${escapeHtml(formatY(value))}</text>`
  }).join('')
  const paths = series.map((item, index) => {
    const path = pathFor(rows, item.get, xFor, yFor)
    if (!path) return ''
    const color = item.color || colors.red
    const area = item.area ? `<path class="chart-area" d="${path} L${xFor(rows[rows.length - 1])},${margin.top + plotHeight} L${xFor(rows[0])},${margin.top + plotHeight} Z" fill="${color}"></path>` : ''
    return `${area}<path class="chart-line" d="${path}" stroke="${color}" data-series="${index}"></path>`
  }).join('')
  target.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${grid}${paths}<line class="chart-hover-line" hidden></line><g class="chart-hover-points"></g><text class="chart-axis-label" x="${margin.left}" y="${height - 5}">${formatClock(firstTime)}</text><text class="chart-axis-label" x="${width - margin.right}" y="${height - 5}" text-anchor="end">${formatClock(lastTime)}</text></svg><div class="chart-tooltip" hidden></div>`
  bindChartHover(target, { rows, series, width, height, margin, plotHeight, firstTime, span, xFor, yFor, options })
}

function percent(used, total) {
  return total > 0 ? clamp(number(used) / number(total) * 100) : 0
}

function standardDeviation(values) {
  const clean = values.map(Number).filter(Number.isFinite)
  if (!clean.length) return 0
  const mean = clean.reduce((sum, value) => sum + value, 0) / clean.length
  return Math.sqrt(clean.reduce((sum, value) => sum + (value - mean) ** 2, 0) / clean.length)
}

function average(values) {
  const clean = values.map(Number).filter(Number.isFinite)
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null
}

function renderCharts() {
  const server = state.server; const rows = historyRows(); const latest = rows.at(-1) || server
  elements.cpuCurrent.textContent = `${number(server.cpu).toFixed(2)}%`
  elements.ramCurrent.textContent = `${formatMb(server.ram_used)} / ${formatMb(server.ram_total)}\n${formatMb(server.swap_used)} / ${formatMb(server.swap_total)}`
  elements.diskCurrent.textContent = `${formatMb(server.disk_used)} / ${formatMb(server.disk_total)}`
  elements.netCurrent.textContent = `↑ ${formatBytes(server.net_out_speed)}/s\n↓ ${formatBytes(server.net_in_speed)}/s`
  elements.connectionsCurrent.textContent = `TCP: ${number(server.tcp_conn)}\nUDP: ${number(server.udp_conn)}`
  elements.processesCurrent.textContent = `${number(server.processes)}`

  renderLineChart(elements.cpuChart, rows, [{ label: 'CPU', get: row => number(row.cpu), color: colors.red, area: true, formatValue: value => `${value.toFixed(2)}%` }], { min: 0, max: 100, formatY: value => `${Math.round(value)}%` })
  renderLineChart(elements.ramChart, rows, [
    { label: t('ram'), get: row => percent(row.ram_used, row.ram_total), color: colors.red, area: true, formatValue: value => `${value.toFixed(2)}%` },
    { label: t('swap'), get: row => percent(row.swap_used, row.swap_total), color: colors.cyan, formatValue: value => `${value.toFixed(2)}%` }
  ], { min: 0, max: 100, formatY: value => `${Math.round(value)}%` })
  const diskTotal = Math.max(number(server.disk_total), ...rows.map(row => number(row.disk_total)))
  renderLineChart(elements.diskChart, rows, [{ label: t('disk'), get: row => number(row.disk_used), color: colors.red, area: true, formatValue: formatMb }], { min: 0, max: Math.max(1, diskTotal), formatY: formatMb })
  renderLineChart(elements.netChart, rows, [
    { label: t('download'), get: row => number(row.net_in_speed), color: colors.green, formatValue: value => `${formatBytes(value)}/s` },
    { label: t('upload'), get: row => number(row.net_out_speed), color: colors.red, formatValue: value => `${formatBytes(value)}/s` }
  ], { includeZero: true, formatY: formatBytes })
  renderLineChart(elements.connectionsChart, rows, [
    { label: 'TCP', get: row => number(row.tcp_conn), color: colors.red, formatValue: value => `${Math.round(value)}` },
    { label: 'UDP', get: row => number(row.udp_conn), color: colors.cyan, formatValue: value => `${Math.round(value)}` }
  ], { includeZero: true, formatY: formatCompact })
  renderLineChart(elements.processesChart, rows, [{ label: t('processes'), get: row => number(row.processes), color: colors.red, formatValue: value => `${Math.round(value)}` }], { includeZero: true, formatY: formatCompact })

  const probes = [
    { ping: 'ping_cm', loss: 'loss_cm', label: t('mobile'), color: colors.orange },
    { ping: 'ping_cu', loss: 'loss_cu', label: t('unicom'), color: colors.green },
    { ping: 'ping_ct', loss: 'loss_ct', label: t('telecom'), color: colors.blue },
    { ping: 'ping_bd', loss: 'loss_bd', label: t('backup'), color: colors.magenta }
  ]
  elements.pingLegend.innerHTML = probes.map(probe => {
    const pings = rows.map(row => row[probe.ping]).filter(value => Number.isFinite(Number(value)))
    const losses = rows.map(row => row[probe.loss]).filter(value => Number.isFinite(Number(value)))
    const current = number(server[probe.ping], number(latest?.[probe.ping]))
    const loss = average(losses) ?? number(server[probe.loss])
    return `<div class="ping-legend-item" style="--legend-color:${probe.color}"><strong>${escapeHtml(probe.label)}</strong><span>${current ? `${current.toFixed(0)} ms` : '—'} · ${loss.toFixed(1)}% ${t('loss')} · ${standardDeviation(pings).toFixed(1)} ms ${t('volatility')}</span></div>`
  }).join('')
  renderLineChart(elements.pingChart, rows, probes.map(probe => ({ label: probe.label, get: row => Number(row[probe.ping]), color: probe.color, formatValue: value => `${Math.round(value)} ms` })), { pad: true, height: 430, formatY: value => `${Math.round(value)}ms` })
}

function renderAll() {
  applyTranslations(); applyConfig(); renderIdentity(); renderSpecs(); renderCharts()
}

function normalizeHistory(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

function showHistoryNotice(message = '') {
  elements.historyNotice.textContent = message
  elements.historyNotice.hidden = !message
}

async function loadHistory(hours = state.hours, button = null) {
  if (!state.preview && hours > 1 && !isLoggedIn(currentBase())) {
    showHistoryNotice(t('loginRequired'))
    openLoginModal(hours)
    return
  }

  button?.classList.add('is-loading')
  try {
    const data = state.preview
      ? previewHistory(state.server).filter(row => timestamp(row.timestamp) >= Date.now() - hours * 3600000)
      : await requestJson(`/api/history/all?id=${encodeURIComponent(state.id)}&hours=${hours}`)
    state.history = normalizeHistory(data)
    state.hours = hours
    state.pendingHistoryHours = null
    showHistoryNotice(state.history.length ? '' : t('historyEmpty'))
    document.querySelectorAll('.range-switch').forEach(group => group.querySelectorAll('button').forEach(item => item.classList.toggle('active', Number(item.dataset.hours) === hours)))
    renderCharts()
  } catch (error) {
    if (error.status === 401) {
      const message = t('loginRequired')
      showHistoryNotice(message)
      showToast(message)
      openLoginModal(hours)
      return
    }
    if (error.status === 409) {
      const message = t('databaseUpgrade')
      showHistoryNotice(message); showToast(message)
      return
    }
    const message = `${t('historyFailed')}: ${error.message}`
    showHistoryNotice(message); showToast(message)
  } finally {
    button?.classList.remove('is-loading')
  }
}

async function fetchDetail() {
  if (state.preview) return previewServer()
  return await requestJson(`/api/server?id=${encodeURIComponent(state.id)}`)
}

function showError(error) {
  elements.loading.hidden = true; elements.content.hidden = true; elements.error.hidden = false
  elements.errorMessage.textContent = error?.message || t('loadFailed')
}

async function refresh({ notify = false, history = false } = {}) {
  elements.refreshButton.classList.add('is-spinning')
  try {
    state.server = await fetchDetail()
    renderAll()
    if (history) await loadHistory(state.hours)
    if (notify) showToast(t('refreshed'))
  } catch (error) { showError(error) }
  finally { elements.refreshButton.classList.remove('is-spinning') }
}

function socketUrl() {
  const url = new URL(joinUrl(state.site.base, '/api/ws'))
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('subscribe', state.id)
  return url.href
}

function appendSample(data, sampleTime) {
  const row = { ...data, timestamp: timestamp(sampleTime ?? data.timestamp ?? data.last_updated) || Date.now() }
  state.history.push(row)
  const cutoff = Date.now() - Math.max(0.167, state.hours) * 3600000
  state.history = state.history.filter(item => timestamp(item.timestamp) >= cutoff).slice(-1800)
  state.server = { ...state.server, ...data, last_updated: sampleTime ?? data.last_updated, report_timestamp: sampleTime ?? data.report_timestamp }
}

function handleSocketMessage(message) {
  if (message?.type !== 'batchUpdate' || !Array.isArray(message.updates)) return
  for (const update of message.updates) {
    if (update?.serverId !== state.id) continue
    if (Array.isArray(update.samples) && update.samples.length) {
      update.samples.forEach(sample => {
        const data = sample?.data || sample?.payload || sample?.metrics
        if (data) appendSample(data, sample.ts ?? update.ts ?? message.ts)
      })
    } else if (update.data) appendSample(update.data, update.ts ?? message.ts)
  }
  clearTimeout(state.renderTimer)
  state.renderTimer = setTimeout(renderAll, 100)
}

function connectSocket() {
  if (state.preview || state.socketManual) return
  try {
    const socket = new WebSocket(socketUrl()); state.socket = socket
    socket.addEventListener('message', event => {
      try { handleSocketMessage(JSON.parse(event.data)) } catch { /* ignore malformed message */ }
    })
    socket.addEventListener('close', () => {
      if (!state.socketManual) state.socketRetry = setTimeout(connectSocket, 4000)
    })
    socket.addEventListener('error', () => socket.close())
  } catch { state.socketRetry = setTimeout(connectSocket, 5000) }
}

function closeSocket() {
  state.socketManual = true; clearTimeout(state.socketRetry)
  try { state.socket?.close() } catch { /* noop */ }
}

function bindEvents() {
  document.addEventListener('error', event => {
    const image = event.target
    if (!image?.classList?.contains('region-flag')) return
    image.hidden = true; if (image.nextElementSibling) image.nextElementSibling.hidden = false
  }, true)
  elements.refreshButton.addEventListener('click', () => refresh({ notify: true, history: true }))
  elements.retryButton.addEventListener('click', () => location.reload())
  elements.themeButton.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light'; localStorage.setItem('csm-next-theme', state.theme); applyTheme(); renderCharts()
  })
  elements.languageButton.addEventListener('click', () => {
    state.language = state.language === 'zh' ? 'en' : 'zh'; localStorage.setItem('csm-next-language', state.language); renderAll()
  })
  document.querySelector('.detail-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-tab]'); if (!button) return
    state.tab = button.dataset.tab
    document.querySelectorAll('.detail-tab').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)) })
    elements.loadPanel.classList.toggle('active', state.tab === 'load'); elements.loadPanel.hidden = state.tab !== 'load'
    elements.pingPanel.classList.toggle('active', state.tab === 'ping'); elements.pingPanel.hidden = state.tab !== 'ping'
    requestAnimationFrame(renderCharts)
  })
  document.querySelectorAll('.range-switch').forEach(group => group.addEventListener('click', event => {
    const button = event.target.closest('[data-hours]'); if (!button) return
    loadHistory(Number(button.dataset.hours), button)
  }))
  elements.loginForm?.addEventListener('submit', submitLogin)
  elements.loginCancel?.addEventListener('click', () => closeLoginModal({ clearPending: true }))
  elements.loginModal?.addEventListener('click', event => {
    if (event.target === elements.loginModal) closeLoginModal({ clearPending: true })
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && elements.loginModal && !elements.loginModal.hidden) {
      closeLoginModal({ clearPending: true })
    }
  })
  window.addEventListener('resize', () => { clearTimeout(state.renderTimer); state.renderTimer = setTimeout(renderCharts, 120) })
  window.addEventListener('beforeunload', closeSocket)
}

async function init() {
  bindEvents(); applyTheme(); applyTranslations()
  if (!state.id) { showError(new Error(t('invalidId'))); return }
  try {
    state.config = await loadConfig()
    state.themeSettings = state.preview
      ? { ...normalizeThemeSettings({}, { backgroundImage: state.config.backgroundImage, panelOpacity: 1 }), storage: 'preview' }
      : await loadThemeSettings({ backgroundImage: state.config.backgroundImage, panelOpacity: 1 })
    state.themeSettingsLoaded = true
    const configured = Array.isArray(state.config.apiBase) ? state.config.apiBase : state.config.apiBase ? [state.config.apiBase] : []
    state.sites = (configured.length ? configured : ['']).map((base, index) => ({ index, base: normalizeBase(base) }))
    state.siteIndex = Math.max(0, Math.min(state.sites.length - 1, state.siteIndex || 0)); state.site = state.sites[state.siteIndex]
    applyConfig()
    if (!state.preview) state.apiConfig = await requestJson('/api/config').catch(() => ({}))
    state.server = await fetchDetail()
    elements.versionText.textContent = state.apiConfig.version ? `CF-Server-Monitor ${state.apiConfig.version}` : 'CF-Server-Monitor Theme'
    elements.loading.hidden = true; elements.error.hidden = true; elements.content.hidden = false
    renderAll(); await loadHistory(1); connectSocket()
    state.refreshTimer = setInterval(() => refresh(), 60000)
    state.clockTimer = setInterval(() => { if (state.server) renderSpecs() }, 1000)
  } catch (error) { showError(error) }
}

init()
