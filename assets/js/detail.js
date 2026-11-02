import { createRealtime, realtimeUrl } from './shared/realtime.js'
import { probeLines, probeMetric, PROBE_LINES } from './shared/ping.js'
import { getJwt, setJwt } from './shared/auth.js'
import { originalAdminUrl, resolveAdminUrl } from './shared/admin.js'
import { escapeHtml } from './shared/dom.js'
import { flagMarkup } from './shared/flags.js'
import { fetchJson } from './shared/http.js'
import {
  getLoginTurnstileToken, loginTurnstileRequired, loginWithCredentials,
  removeLoginTurnstile, renderLoginTurnstile
} from './shared/login.js'
import { applyThemeAppearance, loadThemeSettings } from './shared/theme.js'
import { normalizeThemeSettings } from './shared/theme-settings.js'
import { injectedSiteTitle, resolveSiteTitle } from './shared/title.js'
import { joinUrl, metaApiBases, normalizeBase } from './shared/url.js'

const ONLINE_THRESHOLD = 5 * 60 * 1000
const MB = 1024 * 1024

const translations = {
  zh: {
    realtimePaused: '实时更新已暂停，定时刷新仍可使用。', resumeRealtime: '继续实时更新',
    dashboard: '仪表盘', refresh: '刷新数据', theme: '切换明暗主题', language: 'Switch to English', admin: '管理后台',
    loading: '正在载入节点详情', loadFailed: '无法载入节点详情', retry: '重试', back: '返回仪表盘',
    online: '在线', offline: '离线', cpu: 'CPU', architecture: '架构', os: '操作系统', virtualization: '虚拟化', kernelVersion: '内核版本',
    netSpeed: '网络', traffic: '总流量', ram: '内存', swap: '交换', disk: '磁盘', uptime: '运行时间', lastUpdate: '最后上报',
    connections: '连接数', processes: '进程数', cores: '{count} Cores', unavailable: '—', download: '下载', upload: '上传',
    historyEmpty: '无',
    load: '负载', ping: '延迟', realtime: '实时', oneHour: '1 小时', oneDay: '1 天', hoursRange: '{count} 小时', daysRange: '{count} 天',
    smooth: '平滑', hideAll: '隐藏全部', showAll: '显示全部', min: '最小值', max: '最大值', avg: '平均值', latest: '最新',
    lossTips: '丢包率与波动基于当前时间范围内的历史采样计算；波动 = P99 / P50。',
    smoothTips: '开启平滑后，曲线经过指数加权移动平均 (EWMA) 处理，展示的是平滑趋势，并非原始测量值；需要精确数值请关闭平滑。',
    loginRequired: '后端要求登录后查看此范围的历史数据，请先登录。',
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
    realtimePaused: 'Live updates paused. Periodic refresh is still available.', resumeRealtime: 'Resume live updates',
    dashboard: 'Dashboard', refresh: 'Refresh data', theme: 'Toggle color theme', language: '切换到中文', admin: 'Admin',
    loading: 'Loading server detail', loadFailed: 'Unable to load server detail', retry: 'Retry', back: 'Back to dashboard',
    online: 'Online', offline: 'Offline', cpu: 'CPU', architecture: 'Architecture', os: 'OS', virtualization: 'Virtualization', kernelVersion: 'Kernel Version',
    netSpeed: 'Net Spd', traffic: 'Traffic', ram: 'RAM', swap: 'Swap', disk: 'Disk', uptime: 'Uptime', lastUpdate: 'Last Update',
    connections: 'Connections', processes: 'Processes', cores: '{count} Cores', unavailable: '—', download: 'Download', upload: 'Upload',
    historyEmpty: 'None',
    load: 'Load', ping: 'Ping', realtime: 'Real-time', oneHour: '1 Hour', oneDay: '1 Day', hoursRange: '{count} Hours', daysRange: '{count} Days',
    smooth: 'Smooth', hideAll: 'Hide All', showAll: 'Show All', min: 'Minimum', max: 'Maximum', avg: 'Average', latest: 'Latest',
    lossTips: 'Loss and volatility are computed from history samples in the selected range; volatility = P99 / P50.',
    smoothTips: 'With smoothing on, curves are processed with an Exponentially Weighted Moving Average (EWMA): a trend line, not the raw measured values. Turn it off to see exact data points.',
    loginRequired: 'The backend requires sign-in to view this history range.',
    loginTitle: 'Sign in for long history',
    loginMessage: 'JWT tokens are scoped to the current browser origin. Logging into the original Admin panel does not transfer credentials here.',
    username: 'Username', password: 'Password', login: 'Sign in', cancel: 'Cancel', openAdmin: 'Open original admin',
    loginSuccess: 'Signed in. Loading history…', loginFailed: 'Sign-in failed. Check username and password.',
    loginMissing: 'Enter username and password', loginTurnstile: 'Complete the security check first',
    historyFailed: 'Failed to load history', databaseUpgrade: 'The backend database needs an upgrade. Finish it in the upstream admin panel, then retry.', current: 'Current', telecom: 'Telecom TCP', unicom: 'Unicom TCP', mobile: 'Mobile TCP', backup: 'Backup',
    loss: 'Loss', volatility: 'Vol', refreshed: 'Detail refreshed', invalidId: 'Missing server ID',
    justNow: 'just now', ago: '{value} ago', dayShort: 'day', hourShort: 'h', minuteShort: 'min', secondShort: 's'
  }
}

// komari-next chart palettes (LoadChart.tsx / PingChart.tsx)
const colors = { red: '#F38181', yellow: '#FCE38A', teal: '#95E1D3' }
const PING_PALETTE = ['#F38181', '#347433', '#898AC4', '#03A6A1', '#7AD6F0', '#B388FF', '#FF8A65', '#FFD600']

let state
let elements

function createState(route = {}) {
  return {
    destroyed: false, dirtyMetrics: new Set(), liveRendering: false, historyRequest: 0,
    config: {}, sites: [], site: null, server: null, history: [], hours: 0.167, apiConfig: {},
    rangeByTab: { load: 0.167, ping: 1 }, hiddenProbes: new Set(), openProbes: new Set(), smooth: false,
    themeSettings: normalizeThemeSettings(), themeSettingsLoaded: false,
    id: route.id || '', siteIndex: Number(route.siteIndex) || 0,
    preview: new URLSearchParams(location.search).get('preview') === '1',
    language: localStorage.getItem('csm-next-language') || (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'),
    theme: localStorage.getItem('csm-next-theme') || 'light', tab: 'load', socket: null,
    renderTimer: null, resizeTimer: null, refreshTimer: null, clockTimer: null,
    pendingHistoryHours: null, loginBusy: false, turnstileWidgetId: null
  }
}

const queryElements = () => ({
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
  pingChart: document.querySelector('#pingChart'), pingSeriesLegend: document.querySelector('#pingSeriesLegend'),
  pingToggleAll: document.querySelector('#pingToggleAll'), pingToggleLabel: document.querySelector('#pingToggleAllLabel'), pingSmooth: document.querySelector('#pingSmooth'),
  toast: document.querySelector('#toast'), themeColor: document.querySelector('meta[name="theme-color"]'),
  loginModal: document.querySelector('#loginModal'), loginForm: document.querySelector('#loginForm'),
  loginUsername: document.querySelector('#loginUsername'), loginPassword: document.querySelector('#loginPassword'),
  loginError: document.querySelector('#loginError'), loginMessage: document.querySelector('#loginMessage'),
  loginSubmit: document.querySelector('#loginSubmit'), loginCancel: document.querySelector('#loginCancel'),
  loginTurnstile: document.querySelector('#loginTurnstile'), loginAdminLink: document.querySelector('#loginAdminLink')
})

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
  const date = new Date(time); const pad = part => String(part).padStart(2, '0')
  // komari: HH:MM for short ranges, MM/DD once the range spans a day
  return state.hours >= 24 ? `${pad(date.getMonth() + 1)}/${pad(date.getDate())}` : `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatTooltipTime(value) {
  const time = timestamp(value)
  if (!time) return '—'
  const date = new Date(time); const pad = part => String(part).padStart(2, '0')
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return state.hours <= 0.167 ? `${clock}:${pad(date.getSeconds())}` : `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${clock}`
}

function formatUptime(server) {
  const boot = timestamp(server?.boot_time)
  if (!boot || boot > Date.now()) return '—'
  let seconds = Math.floor((Date.now() - boot) / 1000)
  const days = Math.floor(seconds / 86400); seconds %= 86400
  const hours = Math.floor(seconds / 3600); seconds %= 3600
  const minutes = Math.floor(seconds / 60); seconds %= 60
  const parts = [[days, 'dayShort'], [hours, 'hourShort'], [minutes, 'minuteShort'], [seconds, 'secondShort']]
    .filter(([value]) => value).map(([value, unit]) => `${value} ${t(unit)}`)
  return parts.join(' ') || `0 ${t('secondShort')}`
}

function isOnline(server) {
  const updated = timestamp(server?.report_timestamp ?? server?.last_updated)
  return Boolean(updated && Date.now() - updated < ONLINE_THRESHOLD)
}

function regionFlag(region) {
  return flagMarkup(region, state.site?.base || '')
}

function storageKey(base) {
  return `csm-next-turnstile:${base}`
}

function currentBase() {
  return state.site?.base || location.origin
}

// Upstream convention: config.json is deprecated — meta apiBase or same-origin.
function loadConfig() {
  return {
    title: injectedSiteTitle(),
    backgroundImage: '',
    apiBase: metaApiBases()
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
    await refresh()
    await loadHistory(pendingHours)
    connectSocket()
  } catch (error) {
    showLoginError(error.message || t('loginFailed'))
  } finally {
    state.loginBusy = false
    if (elements.loginSubmit) elements.loginSubmit.disabled = false
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme
  elements.themeColor?.setAttribute('content', state.theme === 'dark' ? '#0a0a0a' : '#f8f8f8')
}

function applyTranslations() {
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en'
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n, { count: node.dataset.i18nCount ?? '' }) })
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
  const flag = regionFlag(server.region)
  if (elements.nodeFlag.innerHTML !== flag) elements.nodeFlag.innerHTML = flag
  elements.nodeName.textContent = server.name || server.id
  elements.nodeId.textContent = server.id
  if (elements.nodeStatus) {
    elements.nodeStatus.textContent = online ? t('online') : t('offline')
    elements.nodeStatus.classList.toggle('offline', !online)
  }
  document.title = `${server.name || server.id} · ${resolveSiteTitle(state.config, state.apiConfig)}`
}

// Upstream gpu_info is a JSON array of { name, info, id } (or plain text); see ServerDetail.vue parseGpuInfo.
function gpuName(raw) {
  let list = Array.isArray(raw) ? raw : []
  if (typeof raw === 'string' && raw.trim()) {
    try { const parsed = JSON.parse(raw); list = Array.isArray(parsed) ? parsed : [] } catch { return raw }
  }
  return list.length ? list.map(gpu => gpu?.name || gpu?.id || 'GPU').join(' / ') : 'Unknown'
}

function renderSpecs() {
  const server = state.server
  const network = `<span class="spec-lines"><span class="up">↑ ${formatBytes(server.net_out_speed)}/s</span><span class="down">↓ ${formatBytes(server.net_in_speed)}/s</span></span>`
  const traffic = `<span class="spec-lines"><span>↑ ${formatBytes(server.net_tx_monthly)}</span><span>↓ ${formatBytes(server.net_rx_monthly)}</span></span>`
  elements.specGrid.innerHTML = [
    specCard(t('cpu'), escapeHtml(server.cpu_info || '—'), t('cores', { count: number(server.cpu_cores) || '—' }), 'span-2'),
    specCard(t('architecture'), escapeHtml(server.arch || 'Unknown')),
    // CF-Server-Monitor reports no virtualization field; komari shows "Unknown" then.
    specCard(t('virtualization'), escapeHtml(server.virtualization || 'Unknown')),
    specCard('GPU', escapeHtml(gpuName(server.gpu_info)), '', 'span-2'),
    specCard(t('os'), escapeHtml(server.os || 'Unknown'), `${t('kernelVersion')}: ${server.kernel_version || 'Unknown'}`),
    specCard(t('netSpeed'), network),
    specCard(t('traffic'), traffic),
    specCard(t('ram'), escapeHtml(formatMb(server.ram_total))),
    specCard(t('swap'), escapeHtml(formatMb(server.swap_total))),
    specCard(t('disk'), escapeHtml(formatMb(server.disk_total))),
    specCard(t('uptime'), escapeHtml(formatUptime(server)), '', 'spec-compact'),
    specCard(t('lastUpdate'), escapeHtml(formatDate(server.last_updated)), '', 'spec-compact')
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
  const { rows, series, width, height, margin, firstTime, span, xFor, yFor, options } = context
  const points = target.querySelector('.chart-hover-points')
  const tooltip = target.querySelector('.chart-tooltip')

  const hide = () => {
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
    const entries = series.filter(item => !item.hidden).map(item => {
      const value = Number(item.get(row))
      if (!Number.isFinite(value)) return null
      return {
        label: item.label || '', color: item.color || colors.red, value,
        text: (item.formatTooltip?.(row, value) ?? (item.formatValue || options.formatTooltip || formatCompact)(value)), y: yFor(value)
      }
    }).filter(Boolean)
    if (!entries.length) { hide(); return }

    // komari uses recharts `cursor={false}`: active dots only, no crosshair
    points.innerHTML = entries.map(entry => `<circle class="chart-hover-point" cx="${x}" cy="${entry.y}" r="4" fill="${entry.color}"></circle>`).join('')
    tooltip.innerHTML = `<strong>${formatTooltipTime(row.timestamp)}</strong>${entries.map(entry => `<div><i style="background:${entry.color}"></i><span>${escapeHtml(entry.label)}</span><b>${escapeHtml(entry.text)}</b></div>`).join('')}`
    tooltip.hidden = false
    tooltip.classList.toggle('flip', localX > rect.width * 0.62)
    tooltip.style.left = `${localX}px`
    const averageY = entries.reduce((sum, entry) => sum + entry.y, 0) / entries.length
    const pixelY = averageY / height * rect.height
    tooltip.style.top = `${Math.max(24, Math.min(rect.height - 24, pixelY))}px`
  }
}

// recharts-style "auto" upper bound: round up to a 1/2/2.5/5 × 10^n step over 4 intervals
function niceMax(value) {
  if (!(value > 0)) return 1
  const rough = value / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map(factor => factor * power).find(candidate => candidate >= rough)
  return step * 4
}

function renderLineChart(target, rows, series, options = {}) {
  const fields = target === elements.cpuChart ? ['cpu']
    : target === elements.ramChart ? ['ram_used', 'swap_used']
    : target === elements.diskChart ? ['disk_used']
    : target === elements.netChart ? ['net_in_speed', 'net_out_speed']
    : target === elements.connectionsChart ? ['tcp_conn', 'udp_conn']
    : target === elements.processesChart ? ['processes']
    : PROBE_LINES.flatMap(line => [line.ping, line.loss])
  if (state.liveRendering) {
    if ((state.tab === 'ping') !== (target === elements.pingChart)) return
    if (!fields.some(field => state.dirtyMetrics.has(field))) return
  }
  rows = rows.filter(row => fields.some(field => Object.hasOwn(row, field)))
  const visible = series.filter(item => !item.hidden)
  const allValues = []
  visible.forEach(item => rows.forEach(row => {
    const value = Number(item.get(row)); if (Number.isFinite(value)) allValues.push(value)
  }))
  if (!rows.length || (!allValues.length && visible.length)) {
    target.innerHTML = `<div class="chart-empty">${escapeHtml(t('historyEmpty'))}</div>`
    return
  }
  const measured = target.getBoundingClientRect?.().width
  // Hidden tab panels measure 0px; drawing then would bake a 288px viewBox that later stretches
  // (giant axis text). Skip and let the tab switch redraw once the panel is laid out.
  if (measured === 0 && target.offsetParent === null) {
    target.dataset.stale = '1'
    return
  }
  delete target.dataset?.stale
  const width = Math.max(240, Math.round(measured || 288))
  const height = Math.round(width * 9 / 16)
  const margin = { left: 16, right: 16, top: 8, bottom: 20 }
  const plotWidth = width - margin.left - margin.right; const plotHeight = height - margin.top - margin.bottom
  const dataMax = allValues.length ? Math.max(...allValues) : 0
  const min = options.min ?? 0
  let max = options.max ?? niceMax(Math.max(options.minMax ?? 0, dataMax))
  if (max <= min) max = min + 1
  const times = rows.map(row => timestamp(row.timestamp))
  const firstTime = Math.min(...times); const lastTime = Math.max(...times); const span = Math.max(1, lastTime - firstTime)
  const xFor = row => margin.left + ((timestamp(row.timestamp) - firstTime) / span) * plotWidth
  const yFor = value => margin.top + (1 - (value - min) / (max - min)) * plotHeight
  const formatY = options.formatY || (value => formatCompact(value))
  const bottom = margin.top + plotHeight
  // 5 horizontal gridlines, Y labels mirrored inside the plot like recharts `mirror`
  const grid = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = margin.top + plotHeight * ratio; const value = max - (max - min) * ratio
    return `<line class="chart-grid-line" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line><text class="chart-axis-label" x="${margin.left + 2}" y="${y - 3}">${escapeHtml(formatY(value))}</text>`
  }).join('')
  const paths = series.map((item, index) => {
    if (item.hidden) return ''
    const path = pathFor(rows, item.get, xFor, yFor)
    if (!path) return ''
    const color = item.color || colors.red
    const area = item.area ? `<path class="chart-area" d="${path} L${xFor(rows[rows.length - 1])},${bottom} L${xFor(rows[0])},${bottom} Z" fill="${color}"></path>` : ''
    return `${area}<path class="chart-line${options.thick ? ' thick' : ''}" d="${path}" stroke="${color}" data-series="${index}"></path>`
  }).join('')
  target.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${grid}<line class="chart-axis-line" x1="${margin.left}" y1="${bottom}" x2="${width - margin.right}" y2="${bottom}"></line>${paths}<g class="chart-hover-points"></g><text class="chart-axis-label" x="${margin.left}" y="${height - 4}">${formatClock(firstTime)}</text><text class="chart-axis-label" x="${width - margin.right}" y="${height - 4}" text-anchor="end">${formatClock(lastTime)}</text></svg><div class="chart-tooltip" hidden></div>`
  bindChartHover(target, { rows, series, width, height, margin, firstTime, span, xFor, yFor, options })
}

function percent(used, total) {
  return total > 0 ? clamp(number(used) / number(total) * 100) : 0
}

function average(values) {
  const clean = values.map(Number).filter(Number.isFinite)
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null
}

function percentile(sorted, ratio) {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(ratio * sorted.length) - 1)] : null
}

// Port of komari-next interpolateNullsLinear (src/utils/RecordHelper.tsx, MIT): linearly bridge null
// runs between two real points when the gap is ≤ median sample interval × 6, clamped to 2–30 min.
export function interpolateNullsLinear(rows, keys, { maxGapMultiplier = 6, minCapMs = 2 * 60_000, maxCapMs = 30 * 60_000 } = {}) {
  if (!rows?.length || !keys.length) return rows
  const times = rows.map(row => timestamp(row.timestamp))
  const out = rows.map(row => ({ ...row }))
  for (const key of keys) {
    const valid = rows.map((row, index) => (typeof row[key] === 'number' && Number.isFinite(row[key]) ? index : -1)).filter(index => index >= 0)
    if (valid.length < 2) continue
    const gaps = valid.slice(1).map((index, step) => times[index] - times[valid[step]]).filter(gap => gap > 0).sort((a, b) => a - b)
    if (!gaps.length) continue
    const maxGap = Math.max(minCapMs, Math.min(maxCapMs, gaps[(gaps.length / 2) | 0] * maxGapMultiplier))
    for (let step = 0; step < valid.length - 1; step++) {
      const from = valid[step]; const to = valid[step + 1]
      const span = times[to] - times[from]
      if (to - from < 2 || span <= 0 || span > maxGap) continue
      for (let index = from + 1; index < to; index++) {
        out[index][key] = rows[from][key] + (rows[to][key] - rows[from][key]) * (times[index] - times[from]) / span
      }
    }
  }
  return out
}

// Port of komari-next cutPeakValues (src/utils/RecordHelper.tsx, MIT): null out spikes that deviate
// >30% from the ±7-sample neighbourhood mean, then fill and smooth with an EWMA (α = 0.3).
export function cutPeakValues(data, keys, alpha = 0.3, windowSize = 15, spikeThreshold = 0.3) {
  if (!data?.length) return data
  const result = [...data]
  const halfWindow = Math.floor(windowSize / 2)
  for (const key of keys) {
    for (let i = 0; i < result.length; i++) {
      const current = result[i][key]
      if (typeof current !== 'number') continue
      const neighbours = []
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(result.length - 1, i + halfWindow); j++) {
        if (j !== i && typeof result[j][key] === 'number') neighbours.push(result[j][key])
      }
      if (neighbours.length < 2) continue
      const mean = neighbours.reduce((sum, value) => sum + value, 0) / neighbours.length
      if (mean > 0 ? Math.abs(current - mean) / mean > spikeThreshold : Math.abs(current) > 10) {
        result[i] = { ...result[i], [key]: null }
      }
    }
    let ewma = null
    for (let i = 0; i < result.length; i++) {
      const current = result[i][key]
      if (typeof current === 'number') {
        ewma = ewma === null ? current : alpha * current + (1 - alpha) * ewma
        result[i] = { ...result[i], [key]: ewma }
      } else if (ewma !== null) {
        result[i] = { ...result[i], [key]: ewma }
      }
    }
  }
  return result
}

function probeStats(rows, probe, server) {
  const pings = rows.map(row => probeMetric(row[probe.ping])).filter(value => value !== null)
  const sorted = [...pings].sort((a, b) => a - b)
  const losses = rows.map(row => probeMetric(row[probe.loss], 'loss')).filter(value => value !== null)
  const p50 = percentile(sorted, 0.5); const p99 = percentile(sorted, 0.99)
  return {
    latest: probeMetric(server[probe.ping]) ?? (pings.length ? pings[pings.length - 1] : null),
    min: sorted[0] ?? null, max: sorted[sorted.length - 1] ?? null, avg: average(pings), p50, p99,
    loss: average(losses) ?? probeMetric(server[probe.loss], 'loss'),
    volatility: p50 ? p99 / p50 : null
  }
}

function pingSummaryMarkup(probe, stats) {
  const ms = value => value === null ? '—' : `${Math.round(value)} ms`
  const parts = [ms(stats.latest)]
  if (stats.loss !== null) parts.push(`${stats.loss.toFixed(1)}%${t('loss')}`)
  if (stats.volatility !== null) parts.push(`${stats.volatility.toFixed(1)}${t('volatility')}`)
  const rows = [['min', ms(stats.min)], ['max', ms(stats.max)], ['avg', ms(stats.avg)], ['latest', ms(stats.latest)],
    ['p50', ms(stats.p50)], ['p99', ms(stats.p99)], ['loss', stats.loss === null ? '—' : `${stats.loss.toFixed(1)}%`]]
  const open = state.openProbes.has(probe.id) ? ' open' : ''
  return `<div class="ping-legend-item" style="--legend-color:${probe.color}"><i aria-hidden="true"></i><div>
    <div class="ping-legend-name"><strong title="${escapeHtml(probe.label)}">${escapeHtml(probe.label)}</strong><details class="ping-more" data-probe="${escapeHtml(probe.id)}"${open}><summary aria-label="${escapeHtml(probe.label)}">…</summary><dl>${rows.map(([key, value]) => `<dt>${escapeHtml(t(key))}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl></details></div>
    <span>${parts.map(part => `<span>${escapeHtml(part)}</span>`).join('')}</span></div></div>`
}

function renderCharts() {
  const server = state.server; const rows = historyRows()
  elements.cpuCurrent.textContent = `${number(server.cpu).toFixed(2)}%`
  elements.ramCurrent.textContent = `${formatMb(server.ram_used)} / ${formatMb(server.ram_total)}\n${formatMb(server.swap_used)} / ${formatMb(server.swap_total)}`
  elements.diskCurrent.textContent = `${formatMb(server.disk_used)} / ${formatMb(server.disk_total)}`
  elements.netCurrent.textContent = `↑ ${formatBytes(server.net_out_speed)}/s\n↓ ${formatBytes(server.net_in_speed)}/s`
  elements.connectionsCurrent.textContent = `TCP: ${number(server.tcp_conn)}\nUDP: ${number(server.udp_conn)}`
  elements.processesCurrent.textContent = `${number(server.processes)}`

  const percentLabel = value => `${Math.round(value)}%`
  renderLineChart(elements.cpuChart, rows, [{ label: 'CPU', get: row => number(row.cpu), color: colors.red, area: true, formatValue: value => `${value.toFixed(2)}%` }], { min: 0, max: 100, formatY: percentLabel })
  renderLineChart(elements.ramChart, rows, [
    { label: t('ram'), get: row => percent(row.ram_used, row.ram_total), color: colors.red, area: true, formatTooltip: (row, value) => `${formatMb(row.ram_used)} (${Math.round(value)}%)` },
    { label: t('swap'), get: row => percent(row.swap_used, row.swap_total), color: colors.yellow, area: true, formatTooltip: (row, value) => `${formatMb(row.swap_used)} (${Math.round(value)}%)` }
  ], { min: 0, max: 100, formatY: percentLabel })
  const diskTotal = Math.max(number(server.disk_total), ...rows.map(row => number(row.disk_total)))
  renderLineChart(elements.diskChart, rows, [{ label: t('disk'), get: row => number(row.disk_used), color: colors.red, area: true, formatValue: formatMb }], { min: 0, max: Math.max(1, diskTotal), formatY: formatMb })
  renderLineChart(elements.netChart, rows, [
    { label: t('download'), get: row => number(row.net_in_speed), color: colors.red, formatValue: value => `${formatBytes(value)}/s` },
    { label: t('upload'), get: row => number(row.net_out_speed), color: colors.teal, formatValue: value => `${formatBytes(value)}/s` }
  ], { formatY: formatBytes })
  renderLineChart(elements.connectionsChart, rows, [
    { label: 'TCP', get: row => number(row.tcp_conn), color: colors.red, formatValue: value => `${Math.round(value)}` },
    { label: 'UDP', get: row => number(row.udp_conn), color: colors.teal, formatValue: value => `${Math.round(value)}` }
  ], { formatY: formatCompact })
  renderLineChart(elements.processesChart, rows, [{ label: t('processes'), get: row => number(row.processes), color: colors.red, formatValue: value => `${Math.round(value)}` }], { minMax: 100, formatY: formatCompact })

  if (state.liveRendering && (state.tab !== 'ping' || !PROBE_LINES.some(line => state.dirtyMetrics.has(line.ping) || state.dirtyMetrics.has(line.loss)))) return
  const probes = probeLines(server, { ...state.apiConfig, ...server.sysConfig }, state.language)
    .map((line, index) => ({ ...line, color: PING_PALETTE[index % PING_PALETTE.length] }))
  const stats = new Map(probes.map(probe => [probe.id, probeStats(rows, probe, server)]))
  elements.pingLegend.innerHTML = probes.map(probe => pingSummaryMarkup(probe, stats.get(probe.id))).join('')
  if (elements.pingSeriesLegend) {
    elements.pingSeriesLegend.innerHTML = probes.map(probe => {
      const volatility = stats.get(probe.id).volatility
      const label = volatility === null ? probe.label : `${probe.label} (${t('volatility')}: ${volatility.toFixed(2)})`
      return `<button type="button" data-probe="${escapeHtml(probe.id)}" class="${state.hiddenProbes.has(probe.id) ? 'off' : ''}" aria-pressed="${!state.hiddenProbes.has(probe.id)}"><i style="background:${probe.color}"></i>${escapeHtml(label)}</button>`
    }).join('')
  }
  if (elements.pingToggleAll) {
    const anyVisible = probes.some(probe => !state.hiddenProbes.has(probe.id))
    elements.pingToggleAll.dataset.action = anyVisible ? 'hide' : 'show'
    elements.pingToggleAll.classList.toggle('is-hidden-all', !anyVisible)
    if (elements.pingToggleLabel) elements.pingToggleLabel.textContent = t(anyVisible ? 'hideAll' : 'showAll')
  }
  const pingRows = rows.map(row => {
    const next = { timestamp: row.timestamp }
    probes.forEach(probe => { next[probe.ping] = probeMetric(row[probe.ping]); next[probe.loss] = row[probe.loss] })
    return next
  })
  const pingKeys = probes.map(probe => probe.ping)
  const chartRows = interpolateNullsLinear(state.smooth ? cutPeakValues(pingRows, pingKeys) : pingRows, pingKeys)
  renderLineChart(elements.pingChart, chartRows, probes.map(probe => ({
    label: probe.label, get: row => row[probe.ping] ?? NaN, color: probe.color, hidden: state.hiddenProbes.has(probe.id),
    formatValue: value => `${Math.round(value)} ms`
  })), { thick: true, formatY: value => `${Math.round(value)}ms` })
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
  const owner = state
  const requestId = ++state.historyRequest
  button?.classList.add('is-loading')
  try {
    const data = state.preview
      ? previewHistory(state.server).filter(row => timestamp(row.timestamp) >= Date.now() - hours * 3600000)
      : await requestJson(`/api/history/all?id=${encodeURIComponent(state.id)}&hours=${hours}`, { timeoutMs: 60000 })
    if (owner !== state || owner.destroyed || requestId !== state.historyRequest) return
    state.history = normalizeHistory(data)
    state.hours = hours
    state.rangeByTab[state.tab] = hours
    state.pendingHistoryHours = null
    showHistoryNotice('')
    document.querySelectorAll('.range-switch').forEach(group => {
      const selected = state.rangeByTab[group.dataset?.rangeGroup] ?? hours
      group.querySelectorAll('button').forEach(item => item.classList.toggle('active', Number(item.dataset.hours) === selected))
    })
    renderCharts()
  } catch (error) {
    if (owner !== state || owner.destroyed || requestId !== state.historyRequest) return
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
  const owner = state
  elements.refreshButton.classList.add('is-spinning')
  try {
    const server = await fetchDetail()
    if (owner !== state || owner.destroyed) return
    state.server = server
    renderAll()
    if (history) await loadHistory(state.hours)
    if (notify) showToast(t('refreshed'))
  } catch (error) { if (owner === state && !owner.destroyed) showError(error) }
  finally { if (owner === state && !owner.destroyed) elements.refreshButton.classList.remove('is-spinning') }
}

function appendSample(data, sampleTime) {
  const row = { ...data, timestamp: timestamp(sampleTime ?? data.timestamp ?? data.last_updated) || Date.now() }
  Object.keys(data).forEach(key => state.dirtyMetrics.add(key))
  state.history.push(row)
  const cutoff = Date.now() - Math.max(0.167, state.hours) * 3600000
  state.history = state.history.filter(item => timestamp(item.timestamp) >= cutoff).slice(state.hours <= 0.167 ? -150 : -1800)
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
  if (!state.dirtyMetrics.size || state.renderTimer || document.hidden) return
  const owner = state
  state.renderTimer = setTimeout(() => {
    owner.renderTimer = null
    if (owner !== state || owner.destroyed || document.hidden) return
    renderIdentity()
    state.liveRendering = true
    renderCharts()
    state.liveRendering = false
    state.dirtyMetrics.clear()
  }, 100)
}

function connectSocket() {
  if (state.preview || state.destroyed) return
  closeSocket()
  const owner = state
  state.socket = createRealtime({
    url: () => realtimeUrl(state.site.base, state.id, getJwt(state.site.base)),
    timeoutMinutes: () => state.apiConfig.frontend_ws_timeout_minutes,
    beforeResume: () => refresh({ history: true }),
    onMessage: message => { if (owner === state && !owner.destroyed) handleSocketMessage(message) },
    onPause: reason => {
      if (owner !== state || owner.destroyed) return
      const notice = document.querySelector('#realtimeNotice')
      if (notice) notice.hidden = !reason
    }
  })
  const notice = document.querySelector('#realtimeNotice')
  if (notice) notice.hidden = true
}

function closeSocket() {
  state.socket?.destroy()
  state.socket = null
}

let globalListeners = []

function addGlobalListener(target, type, handler, options) {
  target.addEventListener(type, handler, options)
  globalListeners.push({ target, type, handler, options })
}

function removeGlobalListeners() {
  for (const { target, type, handler, options } of globalListeners) {
    target.removeEventListener(type, handler, options)
  }
  globalListeners = []
}

function bindEvents() {
  document.querySelector('#resumeRealtime')?.addEventListener('click', () => state.socket?.resume())
  addGlobalListener(document, 'error', event => {
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
    // komari keeps an independent range per tab (Load: real-time, Ping: 1 hour)
    if (state.rangeByTab[state.tab] !== state.hours) loadHistory(state.rangeByTab[state.tab])
    // Always redraw after layout: charts in a previously hidden panel were skipped (0px wide).
    requestAnimationFrame(() => { if (!state.destroyed) renderCharts() })
  })
  elements.pingSeriesLegend?.addEventListener('click', event => {
    const button = event.target.closest('[data-probe]'); if (!button) return
    const id = button.dataset.probe
    if (state.hiddenProbes.has(id)) state.hiddenProbes.delete(id); else state.hiddenProbes.add(id)
    renderCharts()
  })
  elements.pingToggleAll?.addEventListener('click', () => {
    if (elements.pingToggleAll.dataset.action === 'show') state.hiddenProbes.clear()
    else probeLines(state.server, { ...state.apiConfig, ...state.server.sysConfig }, state.language).forEach(line => state.hiddenProbes.add(line.id))
    renderCharts()
  })
  elements.pingSmooth?.addEventListener('change', () => { state.smooth = elements.pingSmooth.checked; renderCharts() })
  // remember which "…" stat popovers are open so live re-renders don't collapse them
  elements.pingLegend?.addEventListener('click', event => {
    const details = event.target.closest?.('details[data-probe]'); if (!details || !event.target.closest('summary')) return
    if (details.open) state.openProbes.delete(details.dataset.probe); else state.openProbes.add(details.dataset.probe)
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
  addGlobalListener(document, 'keydown', event => {
    if (event.key === 'Escape' && elements.loginModal && !elements.loginModal.hidden) {
      closeLoginModal({ clearPending: true })
    }
  })
  addGlobalListener(window, 'resize', () => {
    clearTimeout(state.resizeTimer)
    state.resizeTimer = setTimeout(() => { if (!state.destroyed) renderCharts() }, 120)
  })
  addGlobalListener(window, 'beforeunload', closeSocket)
}

async function init() {
  bindEvents(); applyTheme(); applyTranslations()
  if (!state.id) { showError(new Error(t('invalidId'))); return }
  try {
    state.config = await loadConfig()
    state.themeSettings = loadThemeSettings({ backgroundImage: state.config.backgroundImage, panelOpacity: 1 })
    state.themeSettingsLoaded = true
    const configured = Array.isArray(state.config.apiBase) ? state.config.apiBase : state.config.apiBase ? [state.config.apiBase] : []
    state.sites = (configured.length ? configured : ['']).map((base, index) => ({ index, base: normalizeBase(base) }))
    state.siteIndex = Math.max(0, Math.min(state.sites.length - 1, state.siteIndex || 0)); state.site = state.sites[state.siteIndex]
    applyConfig()
    if (!state.preview) state.apiConfig = await requestJson('/api/config').catch(() => ({}))
    state.server = await fetchDetail()
    elements.versionText.textContent = state.apiConfig.version ? `CF-Server-Monitor ${state.apiConfig.version}` : 'CF-Server-Monitor Theme'
    elements.loading.hidden = true; elements.error.hidden = true; elements.content.hidden = false
    renderAll(); await loadHistory(state.rangeByTab.load); connectSocket()
    state.refreshTimer = setInterval(() => { if (!document.hidden) void refresh() }, 60000)
    state.clockTimer = setInterval(() => { if (state.server && !document.hidden) renderSpecs() }, 1000)
  } catch (error) { showError(error) }
}

function destroy() {
  state.destroyed = true
  closeSocket()
  clearTimeout(state.renderTimer)
  clearTimeout(state.resizeTimer)
  clearInterval(state.refreshTimer)
  clearInterval(state.clockTimer)
  clearTimeout(showToast.timer)
  destroyLoginTurnstile()
  removeGlobalListeners()
}

export async function mount(route) {
  state = createState(route)
  elements = queryElements()
  await init()
  return { destroy }
}
