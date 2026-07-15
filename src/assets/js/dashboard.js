const ONLINE_THRESHOLD = 5 * 60 * 1000
const DEFAULT_REFRESH_INTERVAL = 60 * 1000
const MB = 1024 * 1024
const GB = 1024 * MB

const translations = {
  zh: {
    dashboard: '仪表盘',
    currentTime: '当前时间',
    currentOnline: '当前在线',
    offline: '离线',
    online: '在线',
    region: '区域',
    regionHint: '节点分布区域',
    trafficOverview: '流量概览',
    networkSpeed: '网络速度',
    searchPlaceholder: '按名称、区域或系统搜索节点…',
    grid: '网格',
    table: '表格',
    status: '状态',
    node: '节点',
    system: '系统',
    disk: '磁盘',
    updated: '更新时间',
    refresh: '刷新数据',
    theme: '切换明暗主题',
    language: 'Switch to English',
    admin: '管理后台',
    retry: '重试',
    connecting: '正在连接',
    live: '实时连接',
    polling: '定时刷新',
    preview: '预览数据',
    refreshing: '正在刷新',
    refreshed: '数据已刷新',
    all: '全部',
    unknown: '未知',
    serversSummary: '{total} 台服务器，{online} 台在线',
    noNodes: '没有匹配的节点',
    noNodesHint: '请调整区域筛选或搜索关键词。',
    noServerData: '暂时没有服务器数据',
    noServerDataHint: '请先在管理后台添加节点，或检查 API 地址配置。',
    loadFailedTitle: '无法读取监控数据',
    loadFailed: '请检查 config.json 中的 apiBase、后端 CORS 设置和站点公开状态。',
    unauthorized: '当前站点需要登录，请先前往原管理端完成登录。',
    verifyTitle: '需要完成安全验证',
    verifyMessage: '验证完成后将自动载入监控数据。',
    verifyingSite: '正在验证站点 {current}/{total}',
    verifyFailed: '安全验证失败，请刷新页面重试。',
    loading: '正在载入数据',
    netSpeed: '网络速度',
    traffic: '流量',
    pingStats: '探针状态',
    latency: '延迟',
    loss: '实时丢包',
    liveLossHint: '最近一次 CT/CU/CM/BD 四线路采样的平均丢包率，并非 24 小时历史值',
    trafficLimit: '流量限额',
    uptime: '运行',
    expired: '已到期',
    days: '{count} 天',
    dayShort: '天',
    hourShort: '时',
    minuteShort: '分',
    secondShort: '秒',
    justNow: '刚刚',
    ago: '{value}前',
    timeout: '超时',
    currentSamples: '当前四线路',
    demoHint: '当前为 ?preview=1 本地预览模式。'
  },
  en: {
    dashboard: 'Dashboard',
    currentTime: 'Current Time',
    currentOnline: 'Current Online',
    offline: 'Offline',
    online: 'Online',
    region: 'Region',
    regionHint: 'Distributed regions',
    trafficOverview: 'Traffic Overview',
    networkSpeed: 'Network Speed',
    searchPlaceholder: 'Search nodes by name, region, OS…',
    grid: 'Grid',
    table: 'Table',
    status: 'Status',
    node: 'Node',
    system: 'System',
    disk: 'Disk',
    updated: 'Updated',
    refresh: 'Refresh data',
    theme: 'Toggle color theme',
    language: '切换到中文',
    admin: 'Admin',
    retry: 'Retry',
    connecting: 'Connecting',
    live: 'Live updates',
    polling: 'Scheduled refresh',
    preview: 'Preview data',
    refreshing: 'Refreshing',
    refreshed: 'Data refreshed',
    all: 'All',
    unknown: 'Unknown',
    serversSummary: '{total} servers total, {online} online',
    noNodes: 'No matching nodes',
    noNodesHint: 'Try another region or search phrase.',
    noServerData: 'No server data yet',
    noServerDataHint: 'Add a node in Admin or check the configured API endpoint.',
    loadFailedTitle: 'Unable to load monitoring data',
    loadFailed: 'Check apiBase in config.json, backend CORS settings, and public access.',
    unauthorized: 'This site requires authentication. Sign in through the original Admin panel first.',
    verifyTitle: 'Security verification required',
    verifyMessage: 'Monitoring data will load automatically after verification.',
    verifyingSite: 'Verifying site {current} of {total}',
    verifyFailed: 'Verification failed. Refresh the page to try again.',
    loading: 'Loading data',
    netSpeed: 'Net Spd',
    traffic: 'Traffic',
    pingStats: 'Probe Stats',
    latency: 'Latency',
    loss: 'Live Loss',
    liveLossHint: 'Average loss from the latest CT/CU/CM/BD samples, not a 24-hour history',
    trafficLimit: 'Traffic Limit',
    uptime: 'up',
    expired: 'Expired',
    days: '{count} day',
    dayShort: 'd',
    hourShort: 'h',
    minuteShort: 'm',
    secondShort: 's',
    justNow: 'just now',
    ago: '{value} ago',
    timeout: 'timeout',
    currentSamples: '4 live probes',
    demoHint: 'Local preview mode enabled by ?preview=1.'
  }
}

const state = {
  config: {},
  sites: [],
  servers: [],
  siteConfigs: [],
  stats: {
    total: 0,
    online: 0,
    offline: 0,
    globalNetRx: 0,
    globalNetTx: 0,
    globalSpeedIn: 0,
    globalSpeedOut: 0
  },
  regions: {},
  filter: 'all',
  query: '',
  view: localStorage.getItem('csm-next-view') || 'grid',
  language: localStorage.getItem('csm-next-language') || (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'),
  theme: localStorage.getItem('csm-next-theme') || 'light',
  sockets: [],
  socketOnline: 0,
  loading: false,
  preview: new URLSearchParams(location.search).get('preview') === '1',
  renderTimer: null,
  refreshTimer: null,
  clockTimer: null
}

const elements = {
  brandTitle: document.querySelector('#brandTitle'),
  siteEyebrow: document.querySelector('#siteEyebrow'),
  adminLink: document.querySelector('#adminLink'),
  footerAdminLink: document.querySelector('#footerAdminLink'),
  refreshButton: document.querySelector('#refreshButton'),
  themeButton: document.querySelector('#themeButton'),
  languageButton: document.querySelector('#languageButton'),
  currentTime: document.querySelector('#currentTime'),
  currentDate: document.querySelector('#currentDate'),
  onlineCount: document.querySelector('#onlineCount'),
  totalCount: document.querySelector('#totalCount'),
  offlineCount: document.querySelector('#offlineCount'),
  regionCount: document.querySelector('#regionCount'),
  trafficUp: document.querySelector('#trafficUp'),
  trafficDown: document.querySelector('#trafficDown'),
  speedUp: document.querySelector('#speedUp'),
  speedDown: document.querySelector('#speedDown'),
  liveState: document.querySelector('#liveState'),
  searchInput: document.querySelector('#searchInput'),
  clearSearch: document.querySelector('#clearSearch'),
  filterBar: document.querySelector('#filterBar'),
  serverSummary: document.querySelector('#serverSummary em'),
  statusBanner: document.querySelector('#statusBanner'),
  statusTitle: document.querySelector('#statusTitle'),
  statusMessage: document.querySelector('#statusMessage'),
  retryButton: document.querySelector('#retryButton'),
  gridView: document.querySelector('#gridView'),
  tableView: document.querySelector('#tableView'),
  cardGroups: document.querySelector('#cardGroups'),
  serverTableBody: document.querySelector('#serverTableBody'),
  versionText: document.querySelector('#versionText'),
  turnstileModal: document.querySelector('#turnstileModal'),
  verifyMessage: document.querySelector('#verifyMessage'),
  turnstileWidget: document.querySelector('#turnstileWidget'),
  toast: document.querySelector('#toast'),
  themeColor: document.querySelector('meta[name="theme-color"]')
}

function t(key, params = {}) {
  const dictionary = translations[state.language] || translations.zh
  let value = dictionary[key] ?? translations.en[key] ?? key
  for (const [name, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{${name}}`, String(replacement))
  }
  return value
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function clamp(value, min = 0, max = 100) {
  const number = Number.parseFloat(value)
  if (!Number.isFinite(number)) return min
  return Math.max(min, Math.min(max, number))
}

function toTimestamp(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return number < 10_000_000_000 ? number * 1000 : number
}

function isOnline(server, now = Date.now()) {
  const timestamp = toTimestamp(server.report_timestamp ?? server.last_updated)
  return Boolean(timestamp && now - timestamp < ONLINE_THRESHOLD)
}

function formatBytes(value, digits = 2) {
  const bytes = Number.parseFloat(value) || 0
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const number = bytes / (1024 ** index)
  const precision = number >= 100 ? 0 : number >= 10 ? Math.min(1, digits) : digits
  return `${Number(number.toFixed(precision))} ${units[index]}`
}

function formatMetricMb(value) {
  return formatBytes((Number.parseFloat(value) || 0) * MB)
}

function parseTrafficLimit(value) {
  if (value === null || value === undefined || value === '') return 0
  const match = String(value).trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i)
  if (!match) return 0
  const number = Number.parseFloat(match[1])
  if (!Number.isFinite(number) || number <= 0) return 0
  const unit = (match[2] || 'GB').toUpperCase()
  const powers = { B: 0, KB: 1, MB: 2, GB: 3, TB: 4 }
  return number * (1024 ** powers[unit])
}

function trafficUsed(server) {
  const rx = Number.parseFloat(server.net_rx_monthly) || 0
  const tx = Number.parseFloat(server.net_tx_monthly) || 0
  if (server.traffic_calc_type === 'dl') return rx
  if (server.traffic_calc_type === 'ul') return tx
  return rx + tx
}

function percentage(used, total) {
  if (!(total > 0)) return 0
  return clamp((used / total) * 100)
}

function average(values) {
  const valid = values.map(Number).filter(value => Number.isFinite(value) && value >= 0)
  if (!valid.length) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function flagMarkup(region, compact = false) {
  const code = String(region || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX') return '<span class="flag-code">--</span>'
  const lower = code.toLowerCase()
  return `<img class="region-flag" src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.3.2/flags/4x3/${lower}.svg" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="flag-code" hidden>${escapeHtml(code)}</span>`
}

function shortOs(value) {
  const os = String(value || '').trim()
  if (!os) return 'Unknown'
  const known = ['Debian', 'Ubuntu', 'CentOS', 'AlmaLinux', 'Rocky', 'Fedora', 'Alpine', 'Arch', 'Windows', 'OpenWrt', 'FreeBSD']
  const match = known.find(name => os.toLowerCase().includes(name.toLowerCase()))
  return match || os.split(/[\s/]/)[0].slice(0, 16)
}

function formatUptime(server) {
  const boot = toTimestamp(server.boot_time)
  if (!boot || boot > Date.now()) return '—'
  let seconds = Math.floor((Date.now() - boot) / 1000)
  const days = Math.floor(seconds / 86400)
  seconds %= 86400
  const hours = Math.floor(seconds / 3600)
  seconds %= 3600
  const minutes = Math.floor(seconds / 60)
  if (days > 0) return `${days}${t('dayShort')} ${hours}${t('hourShort')} ${minutes}${t('minuteShort')}`
  if (hours > 0) return `${hours}${t('hourShort')} ${minutes}${t('minuteShort')}`
  return `${minutes}${t('minuteShort')}`
}

function formatUpdated(value) {
  const timestamp = toTimestamp(value)
  if (!timestamp) return '—'
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 10) return t('justNow')
  if (seconds < 60) return t('ago', { value: `${seconds}${t('secondShort')}` })
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('ago', { value: `${minutes}${t('minuteShort')}` })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('ago', { value: `${hours}${t('hourShort')}` })
  return t('ago', { value: `${Math.floor(hours / 24)}${t('dayShort')}` })
}

function expiryLabel(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (days < 0) return t('expired')
  return t('days', { count: days })
}

function joinUrl(base, path) {
  return `${String(base).replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`
}

function normalizeBase(value) {
  if (!value) return location.origin
  try {
    return new URL(String(value), location.href).href.replace(/\/$/, '')
  } catch {
    return String(value).replace(/\/$/, '')
  }
}

function detailUrl(server) {
  const url = new URL('./detail.html', location.href)
  url.search = ''
  url.searchParams.set('id', server.id)
  url.searchParams.set('site', String(server._siteIndex || 0))
  if (state.preview) url.searchParams.set('preview', '1')
  return url.href
}

function adminUrl() {
  const configured = state.config.adminUrl
  if (configured) return configured
  const base = state.sites[0]?.base || location.origin
  return `${base}/#/admin`
}

function showToast(message) {
  elements.toast.textContent = message
  elements.toast.classList.add('show')
  clearTimeout(showToast.timer)
  showToast.timer = setTimeout(() => elements.toast.classList.remove('show'), 2400)
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme
  elements.themeColor?.setAttribute('content', state.theme === 'dark' ? '#101216' : '#f8f9fb')
}

function applyTranslations() {
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en'
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(node.dataset.i18n)
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    node.placeholder = t(node.dataset.i18nPlaceholder)
  })
  document.querySelectorAll('[data-i18n-title]').forEach(node => {
    const text = t(node.dataset.i18nTitle)
    node.title = text
    node.setAttribute('aria-label', text)
  })
  elements.languageButton.querySelector('span').textContent = state.language === 'zh' ? '文' : 'A'
  elements.languageButton.querySelector('small').textContent = state.language === 'zh' ? 'A' : '文'
}

function applyConfig() {
  const title = state.config.title || 'CF-Server-Monitor'
  document.title = title
  elements.brandTitle.textContent = title
  elements.siteEyebrow.textContent = String(title).toUpperCase()
  if (state.config.backgroundImage) {
    document.body.style.backgroundImage = `url("${String(state.config.backgroundImage).replaceAll('"', '%22')}")`
    document.body.classList.add('has-background')
  }
  const link = adminUrl()
  elements.adminLink.href = link
  elements.footerAdminLink.href = link
}

function updateClock() {
  const now = new Date()
  const locale = state.language === 'zh' ? 'zh-CN' : 'en-GB'
  elements.currentTime.textContent = now.toLocaleTimeString(locale, { hour12: false })
  elements.currentDate.textContent = now.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function updateConnectionState(mode) {
  elements.liveState.classList.remove('online', 'error')
  if (mode === 'live') elements.liveState.classList.add('online')
  if (mode === 'error') elements.liveState.classList.add('error')
  const label = mode === 'live' ? t('live') : mode === 'preview' ? t('preview') : mode === 'error' ? t('loadFailedTitle') : t('polling')
  elements.liveState.querySelector('em').textContent = label
}

async function loadRuntimeConfig() {
  try {
    const response = await fetch('./config.json', { cache: 'no-store' })
    if (!response.ok) throw new Error(`config.json: HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    console.warn('[theme] config.json could not be loaded, using same-origin defaults.', error)
    return { apiBase: [], title: 'CF-Server-Monitor', backgroundImage: '' }
  }
}

function requestHeaders(site, extra = {}) {
  const headers = new Headers(extra)
  const jwt = localStorage.getItem('jwt_token')
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`)
  if (site?.verifiedCredential) headers.set('X-Turnstile-Verified', site.verifiedCredential)
  return headers
}

async function requestJson(site, path, options = {}) {
  const response = await fetch(joinUrl(site.base, path), {
    ...options,
    headers: requestHeaders(site, options.headers),
    cache: options.cache || 'no-store'
  })
  const verified = response.headers.get('X-Turnstile-Verified')
  if (verified) site.verifiedCredential = verified
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (data?.turnstile_verified) site.verifiedCredential = data.turnstile_verified
  if (!response.ok) {
    const error = new Error(data?.error || `HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  return { data, response }
}

async function initializeSites() {
  const configured = Array.isArray(state.config.apiBase)
    ? state.config.apiBase
    : state.config.apiBase ? [state.config.apiBase] : []
  const bases = [...new Set((configured.length ? configured : ['']).map(normalizeBase))]
  state.sites = bases.map((base, index) => ({
    index,
    base,
    config: {},
    verifiedCredential: '',
    version: ''
  }))
  applyConfig()

  await Promise.all(state.sites.map(async site => {
    try {
      const { data } = await requestJson(site, '/api/config')
      site.config = data || {}
      site.version = data?.version || ''
    } catch (error) {
      site.configError = error
    }
  }))
}

function turnstileEnabled(site) {
  const value = site.config?.turnstile_enabled
  return value === true || value === 'true'
}

async function loadTurnstileScript() {
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

function getTurnstileToken(siteKey) {
  return new Promise((resolve, reject) => {
    elements.turnstileWidget.replaceChildren()
    let widgetId
    const timeout = setTimeout(() => reject(new Error(t('verifyFailed'))), 120000)
    widgetId = window.turnstile.render(elements.turnstileWidget, {
      sitekey: siteKey,
      theme: state.theme,
      callback: token => {
        clearTimeout(timeout)
        resolve({ token, widgetId })
      },
      'error-callback': () => {
        clearTimeout(timeout)
        reject(new Error(t('verifyFailed')))
      },
      'expired-callback': () => window.turnstile.reset(widgetId)
    })
  })
}

async function verifyTurnstileSites() {
  const pending = state.sites.filter(site => turnstileEnabled(site) && site.config?.verified !== true)
  if (!pending.length) return
  await loadTurnstileScript()
  elements.turnstileModal.hidden = false

  try {
    for (let index = 0; index < pending.length; index += 1) {
      const site = pending[index]
      const siteKey = site.config?.turnstile_site_key
      if (!siteKey) throw new Error(t('verifyFailed'))
      elements.verifyMessage.textContent = t('verifyingSite', { current: index + 1, total: pending.length })
      const { token } = await getTurnstileToken(siteKey)
      const response = await fetch(joinUrl(site.base, '/api/config'), {
        headers: { 'X-Turnstile-Token': token },
        cache: 'no-store'
      })
      const data = await response.json().catch(() => ({}))
      const credential = response.headers.get('X-Turnstile-Verified') || data.turnstile_verified || ''
      if (!response.ok || (data.verified !== true && !credential)) throw new Error(data.error || t('verifyFailed'))
      site.verifiedCredential = credential
      site.config = { ...site.config, ...data, verified: true }
    }
  } finally {
    elements.turnstileModal.hidden = true
    elements.verifyMessage.textContent = t('verifyMessage')
  }
}

function previewServers() {
  const now = Date.now()
  const definitions = [
    ['Tokyo-Edge', 'JP', 'Asia', 'Debian 12', 3.2, 28, 11, 16, 0, '¥120/Annual', 219],
    ['yt-Hong Kong', 'HK', 'Asia', 'Debian 12', 4.0, 20, 47, 128, 21.2, '¥190/Annual', 219],
    ['Singapore-Core', 'SG', 'Asia', 'Ubuntu 24.04', 2.1, 11, 57, 58, 1.8, '$24/Year', 312],
    ['Seoul-Gateway', 'KR', 'Asia', 'Alpine 3.20', 0.8, 20, 45, 83, 0.3, '$2/Month', 87],
    ['Frankfurt-01', 'DE', 'Europe', 'Debian 12', 8.6, 34, 39, 169, 0, '€22/Year', 148],
    ['Amsterdam-Edge', 'NL', 'Europe', 'Ubuntu 22.04', 14.2, 46, 62, 181, 2.4, '€3/Month', 61],
    ['London-Backup', 'GB', 'Europe', 'AlmaLinux 9', 0, 18, 29, 0, 100, '£16/Year', 28],
    ['Los-Angeles', 'US', 'America', 'Rocky Linux 9', 26, 52, 73, 142, 4.2, '$30/Year', 174]
  ]
  return definitions.map((item, index) => {
    const [name, region, group, os, cpu, ram, disk, ping, loss, price, expireDays] = item
    const offline = name === 'London-Backup'
    const ramTotal = 1024 + (index % 4) * 1024
    const diskTotal = 20480 + (index % 3) * 20480
    return {
      id: `preview-${index + 1}`,
      name,
      region,
      server_group: group,
      os,
      arch: index % 2 ? 'x86_64' : 'aarch64',
      cpu,
      ram_total: ramTotal,
      ram_used: ramTotal * ram / 100,
      disk_total: diskTotal,
      disk_used: diskTotal * disk / 100,
      net_in_speed: 8200 + index * 3700,
      net_out_speed: 4300 + index * 2800,
      net_rx_monthly: (13 + index * 17) * GB,
      net_tx_monthly: (9 + index * 11) * GB,
      traffic_limit: index % 2 ? 1024 : 500,
      traffic_calc_type: 'total',
      ping_ct: ping || null,
      ping_cu: ping ? ping + 8 : null,
      ping_cm: ping ? ping + 21 : null,
      ping_bd: ping ? ping + 4 : null,
      loss_ct: loss,
      loss_cu: Math.max(0, loss - 0.6),
      loss_cm: loss,
      loss_bd: Math.max(0, loss - 1),
      ip_v4: '1',
      ip_v6: index % 3 === 0 ? '1' : '0',
      price,
      expire_date: new Date(now + expireDays * 86400000).toISOString().slice(0, 10),
      boot_time: now - (7 + index * 33) * 86400000 - index * 3600000,
      last_updated: now - (offline ? 12 * 60 : 20 + index * 6) * 1000,
      _siteIndex: 0,
      _sourceKey: `0:preview-${index + 1}`
    }
  })
}

async function fetchSiteServers(site) {
  const { data } = await requestJson(site, '/api/servers')
  const raw = Array.isArray(data?.servers)
    ? data.servers
    : Object.entries(data?.latestMetricsMap || {}).map(([id, metrics]) => ({ id, ...metrics }))
  return {
    siteIndex: site.index,
    servers: raw.map(server => ({
      ...server,
      _siteIndex: site.index,
      _sourceKey: `${site.index}:${server.id}`
    })),
    sysConfig: data?.sysConfig || {},
    version: site.version || data?.version || ''
  }
}

async function refreshData({ notify = false } = {}) {
  if (state.loading) return
  state.loading = true
  elements.refreshButton.classList.add('is-spinning')
  updateConnectionState(state.preview ? 'preview' : 'polling')

  try {
    if (state.preview) {
      state.servers = previewServers()
      state.siteConfigs = [{ show_price: true, show_expire: true, show_tf: true }]
      elements.versionText.textContent = 'CF-Server-Monitor Theme · Preview'
      hideError()
      recomputeStats()
      renderAll()
      updateConnectionState('preview')
      if (notify) showToast(t('demoHint'))
      return
    }

    const results = await Promise.allSettled(state.sites.map(fetchSiteServers))
    const successful = results.filter(result => result.status === 'fulfilled').map(result => result.value)
    const failures = results.filter(result => result.status === 'rejected').map(result => result.reason)
    if (!successful.length) throw failures[0] || new Error(t('loadFailed'))

    state.servers = successful.flatMap(result => result.servers)
    state.siteConfigs = []
    successful.forEach(result => {
      state.siteConfigs[result.siteIndex] = result.sysConfig
    })
    const version = successful.map(result => result.version).find(Boolean)
    elements.versionText.textContent = version ? `CF-Server-Monitor ${version}` : 'CF-Server-Monitor Theme'
    if (!state.config.title) {
      const apiTitle = successful.map(result => result.sysConfig?.site_title).find(Boolean)
      if (apiTitle) {
        state.config.title = apiTitle
        applyConfig()
      }
    }

    recomputeStats()
    renderAll()
    hideError()
    if (failures.length) showToast(`${failures.length} API endpoint(s) unavailable`)
    if (notify) showToast(t('refreshed'))
    updateConnectionState(state.socketOnline > 0 ? 'live' : 'polling')
  } catch (error) {
    console.error('[theme] refresh failed', error)
    state.servers = []
    recomputeStats()
    renderAll()
    showError(error)
    updateConnectionState('error')
  } finally {
    state.loading = false
    elements.refreshButton.classList.remove('is-spinning')
  }
}

function recomputeStats() {
  const now = Date.now()
  const regions = {}
  let online = 0
  let globalNetRx = 0
  let globalNetTx = 0
  let globalSpeedIn = 0
  let globalSpeedOut = 0

  for (const server of state.servers) {
    if (isOnline(server, now)) online += 1
    globalNetRx += Number.parseFloat(server.net_rx_monthly) || 0
    globalNetTx += Number.parseFloat(server.net_tx_monthly) || 0
    globalSpeedIn += Number.parseFloat(server.net_in_speed) || 0
    globalSpeedOut += Number.parseFloat(server.net_out_speed) || 0
    const region = String(server.region || 'XX').toUpperCase()
    regions[region] = (regions[region] || 0) + 1
  }

  state.stats = {
    total: state.servers.length,
    online,
    offline: state.servers.length - online,
    globalNetRx,
    globalNetTx,
    globalSpeedIn,
    globalSpeedOut
  }
  state.regions = regions
}

function renderOverview() {
  elements.onlineCount.textContent = state.stats.online
  elements.totalCount.textContent = state.stats.total
  elements.offlineCount.textContent = state.stats.offline
  elements.regionCount.textContent = Object.keys(state.regions).filter(region => region !== 'XX').length
  elements.trafficUp.textContent = formatBytes(state.stats.globalNetTx)
  elements.trafficDown.textContent = formatBytes(state.stats.globalNetRx)
  elements.speedUp.textContent = `${formatBytes(state.stats.globalSpeedOut)}/s`
  elements.speedDown.textContent = `${formatBytes(state.stats.globalSpeedIn)}/s`
  elements.serverSummary.textContent = t('serversSummary', { total: state.stats.total, online: state.stats.online })
}

function renderFilters() {
  const entries = Object.entries(state.regions).sort(([left], [right]) => left.localeCompare(right))
  const filters = [['all', state.stats.total], ...entries]
  elements.filterBar.innerHTML = filters.map(([code, count]) => {
    const active = state.filter === code
    const label = code === 'all' ? t('all') : code === 'XX' ? t('unknown') : code
    const icon = code === 'all' ? '<span class="filter-dot"></span>' : `<span class="flag">${flagMarkup(code, true)}</span>`
    return `<button class="filter-chip${active ? ' active' : ''}" type="button" data-filter="${escapeHtml(code)}" aria-pressed="${active}">${icon}<span>${escapeHtml(label)}</span><small>${count}</small></button>`
  }).join('')
}

function filteredServers() {
  const query = state.query.trim().toLowerCase()
  return state.servers.filter(server => {
    const region = String(server.region || 'XX').toUpperCase()
    if (state.filter !== 'all' && region !== state.filter) return false
    if (!query) return true
    return [server.name, server.region, server.os, server.arch, server.server_group, server.tags]
      .some(value => String(value || '').toLowerCase().includes(query))
  })
}

function probeClass(value, type) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return 'missing'
  if (type === 'latency') return number >= 180 ? 'bad' : number >= 90 ? 'warn' : ''
  return number >= 10 ? 'bad' : number >= 2 ? 'warn' : ''
}

function renderProbeBars(values, type) {
  const names = ['CT', 'CU', 'CM', 'BD']
  const normalized = values.length ? values : [null, null, null, null]
  return Array.from({ length: 24 }, (_, index) => {
    const probeIndex = index % normalized.length
    const value = normalized[probeIndex]
    const unit = type === 'latency' ? 'ms' : '%'
    const label = Number.isFinite(Number(value)) ? `${names[probeIndex]} ${Number(value).toFixed(type === 'latency' ? 0 : 1)}${unit}` : `${names[probeIndex]} N/A`
    return `<span class="probe-bar ${probeClass(value, type)}" title="${escapeHtml(label)}"></span>`
  }).join('')
}

function gaugeMarkup(label, value, detail) {
  const safe = clamp(value)
  return `<div class="gauge-cell"><div class="gauge-ring" style="--gauge-value:${safe.toFixed(2)}"><svg class="gauge-svg" viewBox="0 0 64 64" aria-hidden="true"><circle class="gauge-track" cx="32" cy="32" r="25" pathLength="100"></circle><circle class="gauge-progress${safe <= 0 ? ' empty' : ''}" cx="32" cy="32" r="25" pathLength="100"></circle></svg><span>${Math.round(safe)}%</span></div><strong class="gauge-label">${escapeHtml(label)}</strong><small class="gauge-detail">${escapeHtml(detail)}</small></div>`
}

function cardMarkup(server) {
  const online = isOnline(server)
  const cpu = clamp(server.cpu)
  const ram = percentage(Number.parseFloat(server.ram_used) || 0, Number.parseFloat(server.ram_total) || 0)
  const disk = percentage(Number.parseFloat(server.disk_used) || 0, Number.parseFloat(server.disk_total) || 0)
  const pingValues = [server.ping_ct, server.ping_cu, server.ping_cm, server.ping_bd]
    .map(value => value === null || value === undefined || value === '' ? null : Number(value))
  const lossValues = [server.loss_ct, server.loss_cu, server.loss_cm, server.loss_bd]
    .map(value => value === null || value === undefined || value === '' ? null : Number(value))
  const pingAverage = average(pingValues)
  const lossAverage = average(lossValues)
  const validPings = pingValues.filter(value => Number.isFinite(value) && value >= 0)
  const pingRange = validPings.length ? Math.max(...validPings) - Math.min(...validPings) : null
  const limit = parseTrafficLimit(server.traffic_limit)
  const used = trafficUsed(server)
  const quotaPercent = percentage(used, limit)
  const siteConfig = state.siteConfigs[server._siteIndex] || {}
  const showPrice = siteConfig.show_price !== false
  const showExpire = siteConfig.show_expire !== false
  const showTraffic = siteConfig.show_tf !== false
  const badges = []
  if (server.ip_v4 === '1' && server.ip_v6 === '1') badges.push('<span class="mini-badge">V4 / V6</span>')
  else {
    if (server.ip_v4 === '1') badges.push('<span class="mini-badge">V4</span>')
    if (server.ip_v6 === '1') badges.push('<span class="mini-badge">V6</span>')
  }
  if (showPrice && server.price) badges.push(`<span class="mini-badge price">${escapeHtml(server.price)}</span>`)
  const expiry = showExpire ? expiryLabel(server.expire_date) : ''
  if (expiry) badges.push(`<span class="mini-badge expire">${escapeHtml(expiry)}</span>`)
  const quota = showTraffic && limit > 0
    ? `<div class="quota"><div class="quota-head"><span>${t('trafficLimit')}</span><span>${formatBytes(used)} / ${formatBytes(limit)}</span></div><div class="quota-track"><div class="quota-fill" style="width:${quotaPercent.toFixed(2)}%"></div></div><div class="quota-percent">${quotaPercent.toFixed(1)}%</div></div>`
    : ''

  return `<article class="server-card${online ? '' : ' offline'}" tabindex="0" role="link" data-server-key="${escapeHtml(server._sourceKey)}" aria-label="${escapeHtml(server.name)}">
    <header class="server-card-header">
      <div class="server-card-top">
        <div class="server-identity"><span class="server-flag" aria-hidden="true">${flagMarkup(server.region)}</span><span class="server-name">${escapeHtml(server.name || server.id)}</span></div>
        <div class="server-card-actions"><svg class="trend-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 5-5 4 3 7-7"/><path d="M15 7h5v5"/></svg><span class="status-pill${online ? '' : ' offline'}">${online ? t('online') : t('offline')}</span></div>
      </div>
      <div class="server-subline"><span class="os-chip">${escapeHtml(shortOs(server.os))}</span><span class="subline-divider">·</span><span class="uptime-text">${t('uptime')} ${escapeHtml(formatUptime(server))}</span></div>
    </header>
    <div class="server-card-content">
      <div class="gauge-grid">
        ${gaugeMarkup('CPU', cpu, `${cpu.toFixed(1)}%`)}
        ${gaugeMarkup('RAM', ram, formatMetricMb(server.ram_used))}
        ${gaugeMarkup('Disk', disk, formatMetricMb(server.disk_used))}
      </div>
      <div class="metrics-panel">
        <div class="metric-row"><span class="metric-name network">${t('netSpeed')}</span><span class="metric-values"><span class="up">↑ ${formatBytes(server.net_out_speed)}/s</span><span class="down">↓ ${formatBytes(server.net_in_speed)}/s</span></span></div>
        <div class="metric-row"><span class="metric-name">${t('traffic')}</span><span class="metric-values"><span>↑ ${formatBytes(server.net_tx_monthly)}</span><span>↓ ${formatBytes(server.net_rx_monthly)}</span></span></div>
        <section class="probe-section">
          <div class="probe-heading"><span>${t('pingStats')}</span><small>${pingRange === null ? t('currentSamples') : `Δ ${pingRange.toFixed(0)} ms`}</small></div>
          <div class="probe-grid">
            <div class="probe-box"><div class="probe-box-head"><span>${t('latency')}</span><strong>${pingAverage === null ? t('timeout') : `${pingAverage.toFixed(0)} ms`}</strong></div><div class="probe-bars">${renderProbeBars(pingValues, 'latency')}</div></div>
            <div class="probe-box"><div class="probe-box-head"><span title="${escapeHtml(t('liveLossHint'))}">${t('loss')}</span><strong>${lossAverage === null ? '—' : `${lossAverage.toFixed(1)}%`}</strong></div><div class="probe-bars">${renderProbeBars(lossValues, 'loss')}</div></div>
          </div>
        </section>
        ${quota}
      </div>
    </div>
    ${badges.length ? `<footer class="server-card-footer">${badges.join('')}</footer>` : ''}
  </article>`
}

function emptyMarkup(hasAnyServers) {
  const title = hasAnyServers ? t('noNodes') : t('noServerData')
  const hint = hasAnyServers ? t('noNodesHint') : t('noServerDataHint')
  return `<div class="empty-state"><div><span class="empty-icon">⌁</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(hint)}</p></div></div>`
}

function renderCards() {
  const servers = filteredServers()
  if (!servers.length) {
    elements.cardGroups.innerHTML = emptyMarkup(state.servers.length > 0)
    return
  }

  const groups = new Map()
  for (const server of servers) {
    const name = String(server.server_group || 'Default')
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(server)
  }
  const showGroupTitles = groups.size > 1
  elements.cardGroups.innerHTML = [...groups.entries()].map(([name, groupServers]) => `
    <section class="server-group">
      ${showGroupTitles ? `<h2 class="group-title">${escapeHtml(name)}<small>${groupServers.length}</small></h2>` : ''}
      <div class="server-grid">${groupServers.map(cardMarkup).join('')}</div>
    </section>`).join('')
}

function meterMarkup(value) {
  const safe = clamp(value)
  return `<span class="table-meter"><i style="--value:${safe.toFixed(2)}"></i><span>${safe.toFixed(1)}%</span></span>`
}

function renderTable() {
  const servers = filteredServers()
  if (!servers.length) {
    elements.serverTableBody.innerHTML = `<tr><td colspan="9">${escapeHtml(state.servers.length ? t('noNodes') : t('noServerData'))}</td></tr>`
    return
  }
  elements.serverTableBody.innerHTML = servers.map(server => {
    const online = isOnline(server)
    const ram = percentage(Number(server.ram_used), Number(server.ram_total))
    const disk = percentage(Number(server.disk_used), Number(server.disk_total))
    return `<tr tabindex="0" data-server-key="${escapeHtml(server._sourceKey)}">
      <td><span class="table-status${online ? '' : ' offline'}">${online ? t('online') : t('offline')}</span></td>
      <td><span class="table-node"><span class="table-flag" aria-hidden="true">${flagMarkup(server.region, true)}</span>${escapeHtml(server.name || server.id)}</span></td>
      <td>${escapeHtml(String(server.region || 'XX').toUpperCase())}</td>
      <td>${escapeHtml(`${shortOs(server.os)} / ${server.arch || 'N/A'}`)}</td>
      <td>${meterMarkup(server.cpu)}</td>
      <td>${meterMarkup(ram)}</td>
      <td>${meterMarkup(disk)}</td>
      <td><span class="up">↑ ${formatBytes(server.net_out_speed)}/s</span><br><span class="down">↓ ${formatBytes(server.net_in_speed)}/s</span></td>
      <td>${escapeHtml(formatUpdated(server.last_updated))}</td>
    </tr>`
  }).join('')
}

function renderViews() {
  const gridActive = state.view === 'grid'
  elements.gridView.classList.toggle('active', gridActive)
  elements.gridView.hidden = !gridActive
  elements.tableView.classList.toggle('active', !gridActive)
  elements.tableView.hidden = gridActive
  document.querySelectorAll('.view-button').forEach(button => {
    const active = button.dataset.view === state.view
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  })
}

function renderAll() {
  applyTranslations()
  renderOverview()
  renderFilters()
  renderCards()
  renderTable()
  renderViews()
  updateClock()
}

function showError(error) {
  const unauthorized = error?.status === 401
  elements.statusTitle.textContent = t('loadFailedTitle')
  elements.statusMessage.textContent = unauthorized ? t('unauthorized') : t('loadFailed')
  elements.statusBanner.hidden = false
}

function hideError() {
  elements.statusBanner.hidden = true
}

function findServer(key) {
  return state.servers.find(server => server._sourceKey === key)
}

function openServerFromElement(element) {
  const key = element?.dataset?.serverKey
  const server = findServer(key)
  if (server) location.href = detailUrl(server)
}

function scheduleRender() {
  clearTimeout(state.renderTimer)
  state.renderTimer = setTimeout(() => {
    recomputeStats()
    renderAll()
  }, 80)
}

function closeSockets() {
  for (const handle of state.sockets) {
    handle.manual = true
    clearTimeout(handle.retryTimer)
    try { handle.socket?.close() } catch { /* noop */ }
  }
  state.sockets = []
  state.socketOnline = 0
}

function socketUrl(base) {
  const url = new URL(joinUrl(base, '/api/ws'))
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('subscribe', 'all')
  return url.href
}

function applySocketMessage(site, message) {
  if (message?.type !== 'batchUpdate' || !Array.isArray(message.updates)) return
  for (const update of message.updates) {
    if (!update?.serverId) continue
    let data = update.data
    if (!data && Array.isArray(update.samples) && update.samples.length) {
      const sample = update.samples[update.samples.length - 1]
      data = sample?.data || sample?.payload || sample?.metrics
    }
    if (!data) continue
    const key = `${site.index}:${update.serverId}`
    const index = state.servers.findIndex(server => server._sourceKey === key)
    if (index < 0) continue
    state.servers[index] = {
      ...state.servers[index],
      ...data,
      id: update.serverId,
      report_timestamp: update.ts ?? message.ts ?? data.report_timestamp ?? data.last_updated,
      last_updated: update.ts ?? message.ts ?? data.last_updated,
      _siteIndex: site.index,
      _sourceKey: key
    }
  }
  scheduleRender()
}

function connectSocket(site) {
  const ids = state.servers.filter(server => server._siteIndex === site.index).map(server => server.id).filter(Boolean)
  if (!ids.length) return
  const handle = { site, socket: null, manual: false, attempts: 0, retryTimer: null, connected: false }
  state.sockets.push(handle)

  const open = () => {
    if (handle.manual) return
    try {
      const socket = new WebSocket(socketUrl(site.base))
      handle.socket = socket
      socket.addEventListener('open', () => {
        handle.attempts = 0
        handle.connected = true
        state.socketOnline += 1
        socket.send(JSON.stringify({ type: 'subscribe', scope: 'all', ids }))
        updateConnectionState('live')
      })
      socket.addEventListener('message', event => {
        try { applySocketMessage(site, JSON.parse(event.data)) } catch { /* ignore malformed messages */ }
      })
      socket.addEventListener('close', () => {
        if (handle.connected) state.socketOnline = Math.max(0, state.socketOnline - 1)
        handle.connected = false
        updateConnectionState(state.socketOnline > 0 ? 'live' : 'polling')
        if (!handle.manual) {
          handle.attempts += 1
          const delay = Math.min(30000, 1500 * (2 ** Math.min(handle.attempts, 4)))
          handle.retryTimer = setTimeout(open, delay)
        }
      })
      socket.addEventListener('error', () => socket.close())
    } catch {
      handle.retryTimer = setTimeout(open, 5000)
    }
  }
  open()
}

function connectSockets() {
  closeSockets()
  if (state.preview) return
  state.sites.forEach(connectSocket)
}

function bindEvents() {
  document.addEventListener('error', event => {
    const image = event.target
    if (!image?.classList?.contains('region-flag')) return
    image.hidden = true
    const fallback = image.nextElementSibling
    if (fallback) fallback.hidden = false
  }, true)
  elements.refreshButton.addEventListener('click', () => refreshData({ notify: true }))
  elements.retryButton.addEventListener('click', () => refreshData())
  elements.themeButton.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('csm-next-theme', state.theme)
    applyTheme()
  })
  elements.languageButton.addEventListener('click', () => {
    state.language = state.language === 'zh' ? 'en' : 'zh'
    localStorage.setItem('csm-next-language', state.language)
    renderAll()
  })
  elements.searchInput.addEventListener('input', event => {
    state.query = event.target.value
    elements.clearSearch.hidden = !state.query
    renderCards()
    renderTable()
  })
  elements.clearSearch.addEventListener('click', () => {
    state.query = ''
    elements.searchInput.value = ''
    elements.clearSearch.hidden = true
    elements.searchInput.focus()
    renderCards()
    renderTable()
  })
  elements.filterBar.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]')
    if (!button) return
    state.filter = button.dataset.filter
    renderFilters()
    renderCards()
    renderTable()
  })
  document.querySelector('.view-switch').addEventListener('click', event => {
    const button = event.target.closest('[data-view]')
    if (!button) return
    state.view = button.dataset.view
    localStorage.setItem('csm-next-view', state.view)
    renderViews()
  })
  elements.cardGroups.addEventListener('click', event => openServerFromElement(event.target.closest('[data-server-key]')))
  elements.cardGroups.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openServerFromElement(event.target.closest('[data-server-key]'))
    }
  })
  elements.serverTableBody.addEventListener('click', event => openServerFromElement(event.target.closest('[data-server-key]')))
  elements.serverTableBody.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openServerFromElement(event.target.closest('[data-server-key]'))
    }
  })
  window.addEventListener('beforeunload', closeSockets)
}

async function init() {
  bindEvents()
  applyTheme()
  applyTranslations()
  updateClock()
  updateConnectionState('polling')
  state.config = await loadRuntimeConfig()
  applyConfig()

  try {
    if (state.preview) {
      state.sites = [{ index: 0, base: normalizeBase(state.config.apiBase?.[0] || ''), config: {}, version: '' }]
      applyConfig()
      await refreshData()
    } else {
      await initializeSites()
      await verifyTurnstileSites()
      await refreshData()
      if (state.servers.length) connectSockets()
    }
  } catch (error) {
    console.error('[theme] initialization failed', error)
    elements.cardGroups.innerHTML = emptyMarkup(false)
    showError(error)
    updateConnectionState('error')
  }

  const refreshInterval = Math.max(15000, Number(state.config.refreshInterval) || DEFAULT_REFRESH_INTERVAL)
  state.refreshTimer = setInterval(() => refreshData(), refreshInterval)
  state.clockTimer = setInterval(() => {
    updateClock()
    recomputeStats()
    renderOverview()
  }, 1000)
}

init()
