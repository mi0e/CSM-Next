import { getJwt, setJwt } from './shared/auth.js'
import { originalAdminUrl, resolveAdminUrl } from './shared/admin.js'
import { escapeHtml } from './shared/dom.js'
import { fetchJson } from './shared/http.js'
import {
  getLoginTurnstileToken, loginTurnstileRequired, loginWithCredentials,
  removeLoginTurnstile, renderLoginTurnstile
} from './shared/login.js'
import {
  applyThemeAppearance, loadThemeSettings, saveThemeSettings, uploadThemeBackground
} from './shared/theme.js'
import {
  normalizeThemeSettings, validateThemeSettings
} from './shared/theme-settings.js'
import {
  mergeProbeHistory, normalizeProbeHistory, PROBE_HISTORY_BUCKETS, PROBE_LINES,
  summarizeProbeHistory
} from './shared/probe-history.js'
import { resolveSiteTitle } from './shared/title.js'
import { joinUrl, normalizeBase } from './shared/url.js'

const ONLINE_THRESHOLD = 5 * 60 * 1000
const DEFAULT_REFRESH_INTERVAL = 60 * 1000
const MB = 1024 * 1024
const GB = 1024 * MB
const PROBE_HISTORY_CONCURRENCY = 4
const PROBE_HISTORY_CACHE_TTL = 2 * 60 * 1000

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
    themeCustomize: '主题自定义', themeSubtitle: '个性化外观', close: '关闭',
    themeLoginRequired: '登录后即可修改并保存全站主题。',
    themeAuthorized: '已登录，保存后将应用到所有访客。', themePreviewAuth: '预览模式：修改仅在当前页面生效。',
    themeBackground: '背景图片', themeBackgroundHint: '仅允许 HTTPS 图片地址；留空表示不使用背景图。',
    themeBackgroundUpload: '上传本地图片', themeUploadHint: '支持 JPG、PNG、WebP、GIF、AVIF，最大 2 MB；上传后自动设为背景。',
    themeTransparency: '界面透明化', themeTransparencyHint: '独立控制卡片和顶部栏的透明效果。',
    themeTransparencyMode: '透明方案',
    themeTransparencySoft: '柔和透明', themeTransparencySoftHint: '仅透明，不模糊后方内容。',
    themeTransparencyGlass: '毛玻璃', themeTransparencyGlassHint: '透明并模糊后方内容。',
    themeTransparencyIntensity: '透明强度', themeTransparencyIntensityHint: '数值越高，卡片和顶部栏越透明。',
    themeBlurIntensity: '毛玻璃强度', themeBlurIntensityHint: '只在毛玻璃方案下生效。',
    themeCustomCss: '自定义 CSS', themeCssHint: '不允许 @import、url() 或脚本；外部资源请使用背景图片设置。',
    restoreDefaults: '恢复默认', saveTheme: '保存主题', themeSaved: '主题设置已保存',
    themePreviewSaved: '预览样式已应用，刷新页面后恢复', themeSaveFailed: '主题设置保存失败',
    themeBackgroundInvalid: '背景图片必须是完整的 HTTPS 地址',
    themeOpacityInvalid: '透明强度必须在 0% 到 80% 之间', themeBlurInvalid: '毛玻璃强度必须在 0px 到 30px 之间',
    themeCssUnsafe: '自定义 CSS 不能加载外部资源或包含危险指令',
    themeFileInvalid: '请选择 2 MB 以内的 JPG、PNG、WebP、GIF 或 AVIF 图片',
    themeUploadPreview: '本地预览无法保存上传图片，请部署后再试',
    authorize: '登录授权',
    loginTitle: '登录授权',
    loginMessage: '登录后可查看非公开站点、隐藏节点和长历史数据。',
    authorizedMessage: '当前站点已授权，可重新登录或退出。',
    site: '站点', username: '用户名', password: '密码', login: '登录', logout: '退出登录', cancel: '取消',
    openOriginalAdmin: '打开原站后台', loginSuccess: '登录成功，正在刷新私有内容',
    logoutSuccess: '已退出当前站点', loginFailed: '登录失败，请检查账号密码',
    loginMissing: '请输入用户名和密码', loginTurnstile: '请先完成安全验证',
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
    unauthorized: '当前站点需要在主题中授权后才能查看。',
    privateSitesTitle: '部分站点需要登录',
    privateSites: '有 {count} 个站点尚未授权；登录后会自动补充私有节点。',
    verifyTitle: '需要完成安全验证',
    verifyMessage: '验证完成后将自动载入监控数据。',
    verifyingSite: '正在验证站点 {current}/{total}',
    verifyFailed: '安全验证失败，请刷新页面重试。',
    loading: '正在载入数据',
    netSpeed: '网络速度',
    traffic: '流量',
    pingStats: '探针状态',
    latency: '延迟',
    loss: '丢包',
    lossHistoryHint: '基于最近 1 小时 CT/CU/CM/BD 四线路历史采样计算',
    lastHour: '最近 1 小时',
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
    themeCustomize: 'Customize theme', themeSubtitle: 'Personalize appearance', close: 'Close',
    themeLoginRequired: 'Sign in to customize and save the site-wide theme.',
    themeAuthorized: 'Signed in. Saved changes will apply to every visitor.', themePreviewAuth: 'Preview mode: changes apply to this page only.',
    themeBackground: 'Background image', themeBackgroundHint: 'HTTPS image URLs only. Leave empty for no background.',
    themeBackgroundUpload: 'Upload local image', themeUploadHint: 'JPG, PNG, WebP, GIF, or AVIF up to 2 MB. The upload becomes the background.',
    themeTransparency: 'Interface transparency', themeTransparencyHint: 'Controls transparency for cards and the top bar independently.',
    themeTransparencyMode: 'Transparency style',
    themeTransparencySoft: 'Soft', themeTransparencySoftHint: 'Transparent without blurring content behind it.',
    themeTransparencyGlass: 'Glass', themeTransparencyGlassHint: 'Transparent with background blur.',
    themeTransparencyIntensity: 'Transparency intensity', themeTransparencyIntensityHint: 'Higher values make cards and the top bar more transparent.',
    themeBlurIntensity: 'Glass blur intensity', themeBlurIntensityHint: 'Only applies to the Glass style.',
    themeCustomCss: 'Custom CSS', themeCssHint: '@import, url(), and scripts are blocked. Use the background field for external images.',
    restoreDefaults: 'Restore defaults', saveTheme: 'Save theme', themeSaved: 'Theme settings saved',
    themePreviewSaved: 'Preview styles applied until the page is refreshed.', themeSaveFailed: 'Unable to save theme settings',
    themeBackgroundInvalid: 'The background image must be a complete HTTPS URL',
    themeOpacityInvalid: 'Transparency intensity must be between 0% and 80%', themeBlurInvalid: 'Glass blur must be between 0px and 30px',
    themeCssUnsafe: 'Custom CSS cannot load external resources or contain unsafe directives',
    themeFileInvalid: 'Choose a JPG, PNG, WebP, GIF, or AVIF image no larger than 2 MB',
    themeUploadPreview: 'Local preview cannot save uploaded images. Try again after deployment.',
    authorize: 'Authorize',
    loginTitle: 'Sign in',
    loginMessage: 'Sign in to view private sites, hidden nodes, and longer history.',
    authorizedMessage: 'This site is authorized. You can sign in again or log out.',
    site: 'Site', username: 'Username', password: 'Password', login: 'Sign in', logout: 'Log out', cancel: 'Cancel',
    openOriginalAdmin: 'Open original admin', loginSuccess: 'Signed in. Refreshing private content…',
    logoutSuccess: 'Signed out of this site', loginFailed: 'Sign-in failed. Check your credentials.',
    loginMissing: 'Enter username and password', loginTurnstile: 'Complete the security check first',
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
    unauthorized: 'This site requires authorization in the theme before it can be viewed.',
    privateSitesTitle: 'Some sites require sign-in',
    privateSites: '{count} site(s) are not authorized. Private nodes will appear after sign-in.',
    verifyTitle: 'Security verification required',
    verifyMessage: 'Monitoring data will load automatically after verification.',
    verifyingSite: 'Verifying site {current} of {total}',
    verifyFailed: 'Verification failed. Refresh the page to try again.',
    loading: 'Loading data',
    netSpeed: 'Net Spd',
    traffic: 'Traffic',
    pingStats: 'Probe Stats',
    latency: 'Latency',
    loss: 'Loss',
    lossHistoryHint: 'Calculated from CT/CU/CM/BD samples reported during the last hour',
    lastHour: 'Last hour',
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
  clockTimer: null,
  loginSiteIndex: 0,
  loginBusy: false,
  loginTurnstileWidgetId: null,
  unauthorizedSiteIndexes: [],
  upstreamTitle: '',
  themeSettings: normalizeThemeSettings(),
  themeSettingsLoaded: false,
  themeSettingsBusy: false,
  themeDrawerOpen: false,
  probeHistories: new Map(),
  probeHistoryLoads: new Set(),
  probeHistoryQueue: [],
  probeHistoryQueued: new Set(),
  probeHistoryActive: 0,
  probeObserver: null
}

const elements = {
  brandTitle: document.querySelector('#brandTitle'),
  siteEyebrow: document.querySelector('#siteEyebrow'),
  footerAdminLink: document.querySelector('#footerAdminLink'),
  refreshButton: document.querySelector('#refreshButton'),
  themeButton: document.querySelector('#themeButton'),
  languageButton: document.querySelector('#languageButton'),
  authButton: document.querySelector('#authButton'),
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
  loginModal: document.querySelector('#loginModal'),
  loginForm: document.querySelector('#loginForm'),
  loginSiteField: document.querySelector('#loginSiteField'),
  loginSiteSelect: document.querySelector('#loginSiteSelect'),
  loginUsername: document.querySelector('#loginUsername'),
  loginPassword: document.querySelector('#loginPassword'),
  loginError: document.querySelector('#loginError'),
  loginMessage: document.querySelector('#loginMessage'),
  loginSubmit: document.querySelector('#loginSubmit'),
  loginCancel: document.querySelector('#loginCancel'),
  loginLogout: document.querySelector('#loginLogout'),
  loginTurnstile: document.querySelector('#loginTurnstile'),
  loginAdminLink: document.querySelector('#loginAdminLink'),
  themeSettingsButton: document.querySelector('#themeSettingsButton'),
  themeDrawer: document.querySelector('#themeDrawer'),
  themeDrawerBackdrop: document.querySelector('#themeDrawerBackdrop'),
  themeDrawerClose: document.querySelector('#themeDrawerClose'),
  themeSettingsAuth: document.querySelector('#themeSettingsAuth'),
  themeSettingsAuthText: document.querySelector('#themeSettingsAuthText'),
  themeSettingsLogin: document.querySelector('#themeSettingsLogin'),
  themeSettingsForm: document.querySelector('#themeSettingsForm'),
  themeSettingsFields: document.querySelector('#themeSettingsFields'),
  themeBackgroundImage: document.querySelector('#themeBackgroundImage'),
  themeBackgroundUpload: document.querySelector('#themeBackgroundUpload'),
  themeTransparencyEnabled: document.querySelector('#themeTransparencyEnabled'),
  themeTransparencyOptions: document.querySelector('#themeTransparencyOptions'),
  themeTransparencySoft: document.querySelector('#themeTransparencySoft'),
  themeTransparencyGlass: document.querySelector('#themeTransparencyGlass'),
  themeTransparencyIntensity: document.querySelector('#themeTransparencyIntensity'),
  themeTransparencyOutput: document.querySelector('#themeTransparencyOutput'),
  themeBlurField: document.querySelector('#themeBlurField'),
  themePanelBlur: document.querySelector('#themePanelBlur'),
  themeBlurOutput: document.querySelector('#themeBlurOutput'),
  themeCustomCss: document.querySelector('#themeCustomCss'),
  themeSettingsError: document.querySelector('#themeSettingsError'),
  themeSettingsReset: document.querySelector('#themeSettingsReset'),
  themeSettingsSave: document.querySelector('#themeSettingsSave'),
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

function detailUrl(server) {
  const url = new URL('./detail.html', location.href)
  url.search = ''
  url.searchParams.set('id', server.id)
  url.searchParams.set('site', String(server._siteIndex || 0))
  if (state.preview) url.searchParams.set('preview', '1')
  return url.href
}

function adminUrl(siteIndex = 0) {
  const configured = Array.isArray(state.config.apiBase)
    ? state.config.apiBase[siteIndex]
    : state.config.apiBase
  const siteBase = state.sites[siteIndex]?.base || normalizeBase(configured || '')
  return resolveAdminUrl(state.config, {
    siteBase,
    siteIndex,
    pageUrl: location.href,
    preview: state.preview
  })
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
  updateAuthButton()
  updateThemeDrawerAuthState()
  if (elements.loginModal && !elements.loginModal.hidden) updateLoginModalState({ refreshTurnstile: false })
}

function applyConfig() {
  const title = resolveSiteTitle(state.config, state.upstreamTitle)
  document.title = title
  elements.brandTitle.textContent = title
  elements.siteEyebrow.textContent = String(title).toUpperCase()
  const appearance = state.themeSettingsLoaded
    ? state.themeSettings
    : normalizeThemeSettings({}, { backgroundImage: state.config.backgroundImage, panelOpacity: 1 })
  state.themeSettings = applyThemeAppearance(appearance)
  const link = adminUrl()
  elements.footerAdminLink.href = link
  const external = new URL(link, location.href).origin !== location.origin
  elements.footerAdminLink.target = external ? '_blank' : ''
  elements.footerAdminLink.rel = external ? 'noopener noreferrer' : ''
  elements.authButton.hidden = state.preview
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
    return { apiBase: [], title: 'CF-Server-Monitor', backgroundImage: '', customAdminEnabled: false }
  }
}

function requestHeaders(site, extra = {}) {
  const headers = new Headers(extra)
  const jwt = getJwt(site?.base || location.origin)
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`)
  if (site?.verifiedCredential) headers.set('X-Turnstile-Verified', site.verifiedCredential)
  return headers
}

async function requestJson(site, path, options = {}) {
  const { response, data } = await fetchJson(joinUrl(site.base, path), {
    ...options,
    headers: requestHeaders(site, options.headers)
  })
  const verified = response.headers.get('X-Turnstile-Verified')
  if (verified) site.verifiedCredential = verified
  if (data?.turnstile_verified) site.verifiedCredential = data.turnstile_verified
  if (!response.ok) {
    if (response.status === 401 && getJwt(site?.base || location.origin)) {
      setJwt('', site?.base || location.origin)
      updateAuthButton()
    }
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
  state.upstreamTitle = state.sites.map(site => site.config?.site_title).find(Boolean) || ''
  applyConfig()
  updateAuthButton()
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

function loginSite() {
  return state.sites[state.loginSiteIndex] || state.sites[0] || null
}

function siteLabel(site) {
  if (!site) return ''
  try { return new URL(site.base).host || site.base }
  catch { return site.base || `Site ${site.index + 1}` }
}

function showLoginError(message = '') {
  elements.loginError.textContent = message
  elements.loginError.hidden = !message
}

function destroyLoginTurnstile() {
  removeLoginTurnstile(state.loginTurnstileWidgetId, elements.loginTurnstile)
  state.loginTurnstileWidgetId = null
}

async function ensureLoginTurnstile() {
  destroyLoginTurnstile()
  const site = loginSite()
  if (!site) return
  state.loginTurnstileWidgetId = await renderLoginTurnstile({
    config: site.config,
    container: elements.loginTurnstile,
    theme: state.theme
  })
}

function updateAuthButton() {
  if (!elements.authButton) return
  const authorized = state.sites.some(site => Boolean(getJwt(site.base)))
  elements.authButton.classList.toggle('is-authorized', authorized)
  const label = authorized ? t('authorizedMessage') : t('authorize')
  elements.authButton.title = label
  elements.authButton.setAttribute('aria-label', label)
  updateThemeDrawerAuthState()
}

function themeSettingsAuthSite() {
  return state.sites.find(site => Boolean(getJwt(site.base))) || null
}

function canEditThemeSettings() {
  return state.preview || Boolean(themeSettingsAuthSite())
}

function setThemeSettingsError(message = '') {
  if (!elements.themeSettingsError) return
  elements.themeSettingsError.textContent = message
  elements.themeSettingsError.hidden = !message
}

function updateThemeTransparencyControls({ initializeIntensity = false } = {}) {
  const enabled = Boolean(elements.themeTransparencyEnabled?.checked)
  let intensity = Math.round(clamp(elements.themeTransparencyIntensity?.value, 0, 80))
  if (enabled && initializeIntensity && intensity === 0) {
    intensity = 35
    elements.themeTransparencyIntensity.value = String(intensity)
  }
  if (!elements.themeTransparencySoft.checked && !elements.themeTransparencyGlass.checked) {
    elements.themeTransparencySoft.checked = true
  }
  const glass = Boolean(elements.themeTransparencyGlass.checked)
  elements.themeTransparencyOptions.hidden = !enabled
  elements.themeBlurField.hidden = !enabled || !glass
  elements.themeTransparencyOutput.textContent = `${intensity}%`
  elements.themeBlurOutput.textContent = `${Math.round(clamp(elements.themePanelBlur?.value, 0, 30))}px`
}

function populateThemeSettingsForm() {
  if (!elements.themeSettingsForm) return
  elements.themeBackgroundImage.value = state.themeSettings.backgroundImage || ''
  elements.themeBackgroundUpload.value = ''
  elements.themeTransparencyEnabled.checked = Boolean(state.themeSettings.transparencyEnabled)
  elements.themeTransparencyGlass.checked = state.themeSettings.transparencyMode === 'glass'
  elements.themeTransparencySoft.checked = !elements.themeTransparencyGlass.checked
  elements.themeTransparencyIntensity.value = String(Math.round((1 - (state.themeSettings.panelOpacity ?? 1)) * 100))
  elements.themePanelBlur.value = String(state.themeSettings.panelBlur ?? 18)
  elements.themeCustomCss.value = state.themeSettings.customCss || ''
  updateThemeTransparencyControls()
  setThemeSettingsError('')
}

function updateThemeDrawerAuthState() {
  if (!elements.themeSettingsAuth) return
  const editable = canEditThemeSettings()
  elements.themeSettingsAuth.classList.toggle('is-authorized', editable)
  elements.themeSettingsAuthText.textContent = t(state.preview ? 'themePreviewAuth' : editable ? 'themeAuthorized' : 'themeLoginRequired')
  elements.themeSettingsLogin.hidden = editable
  elements.themeSettingsFields.disabled = !editable || state.themeSettingsBusy
  elements.themeSettingsReset.disabled = !editable || state.themeSettingsBusy
  elements.themeSettingsSave.disabled = !editable || state.themeSettingsBusy
}

function openThemeDrawer() {
  state.themeDrawerOpen = true
  populateThemeSettingsForm()
  updateThemeDrawerAuthState()
  elements.themeDrawer.classList.add('is-open')
  elements.themeDrawerBackdrop.classList.add('is-open')
  elements.themeDrawer.setAttribute('aria-hidden', 'false')
  elements.themeDrawerBackdrop.setAttribute('aria-hidden', 'false')
  document.body.classList.add('theme-drawer-open')
  const target = canEditThemeSettings() ? elements.themeBackgroundImage : elements.themeSettingsLogin
  const focus = () => target?.focus?.()
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focus)
  else setTimeout(focus, 0)
}

function closeThemeDrawer() {
  state.themeDrawerOpen = false
  elements.themeDrawer.classList.remove('is-open')
  elements.themeDrawerBackdrop.classList.remove('is-open')
  elements.themeDrawer.setAttribute('aria-hidden', 'true')
  elements.themeDrawerBackdrop.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('theme-drawer-open')
  setThemeSettingsError('')
}

function themeSettingsFromForm() {
  const transparencyIntensity = clamp(elements.themeTransparencyIntensity.value, 0, 80)
  return {
    backgroundImage: elements.themeBackgroundImage.value.trim(),
    transparencyEnabled: Boolean(elements.themeTransparencyEnabled.checked),
    transparencyMode: elements.themeTransparencyGlass.checked ? 'glass' : 'soft',
    panelOpacity: Number((1 - transparencyIntensity / 100).toFixed(2)),
    panelBlur: clamp(elements.themePanelBlur.value, 0, 30),
    customCss: elements.themeCustomCss.value
  }
}

function themeSettingsErrorMessage(error) {
  if (error?.code === 'invalid_background_image') return t('themeBackgroundInvalid')
  if (error?.code === 'invalid_panel_opacity') return t('themeOpacityInvalid')
  if (error?.code === 'invalid_panel_blur') return t('themeBlurInvalid')
  if (error?.code === 'unsafe_custom_css' || error?.code === 'invalid_custom_css') return t('themeCssUnsafe')
  if (error?.code === 'invalid_background_file' || error?.code === 'background_file_too_large') return t('themeFileInvalid')
  return error?.message || t('themeSaveFailed')
}

async function submitThemeSettings(event) {
  event?.preventDefault?.()
  if (state.themeSettingsBusy) return
  if (!canEditThemeSettings()) {
    openLoginModal(preferredLoginSiteIndex())
    return
  }

  state.themeSettingsBusy = true
  updateThemeDrawerAuthState()
  setThemeSettingsError('')
  try {
    let input = validateThemeSettings(themeSettingsFromForm())
    const backgroundFile = elements.themeBackgroundUpload.files?.[0]
    if (state.preview) {
      if (backgroundFile) throw Object.assign(new Error(t('themeUploadPreview')), { code: 'preview_upload_unavailable' })
      state.themeSettings = { ...input, updatedAt: '', storage: 'preview' }
      state.themeSettingsLoaded = true
      applyThemeAppearance(state.themeSettings)
      showToast(t('themePreviewSaved'))
      return
    }

    const site = themeSettingsAuthSite()
    const token = site ? getJwt(site.base) : ''
    if (backgroundFile) {
      const backgroundImage = await uploadThemeBackground(backgroundFile, {
        token,
        siteIndex: site?.index || 0
      })
      input = validateThemeSettings({ ...input, backgroundImage })
    }
    state.themeSettings = await saveThemeSettings(input, {
      token,
      siteIndex: site?.index || 0
    })
    state.themeSettingsLoaded = true
    applyThemeAppearance(state.themeSettings)
    populateThemeSettingsForm()
    showToast(t('themeSaved'))
  } catch (error) {
    if (error?.status === 401) {
      const site = themeSettingsAuthSite()
      if (site) setJwt('', site.base)
      updateAuthButton()
      openLoginModal(site?.index ?? preferredLoginSiteIndex())
    }
    setThemeSettingsError(themeSettingsErrorMessage(error))
  } finally {
    state.themeSettingsBusy = false
    updateThemeDrawerAuthState()
  }
}

async function loadPersistedThemeSettings() {
  const fallback = { backgroundImage: state.config.backgroundImage || '', panelOpacity: 1 }
  state.themeSettings = state.preview
    ? { ...normalizeThemeSettings({}, fallback), storage: 'preview', updatedAt: '' }
    : await loadThemeSettings(fallback)
  state.themeSettingsLoaded = true
  applyThemeAppearance(state.themeSettings)
  populateThemeSettingsForm()
}

function renderLoginSites() {
  elements.loginSiteField.hidden = state.sites.length <= 1
  elements.loginSiteSelect.innerHTML = state.sites.map(site => (
    `<option value="${site.index}" ${site.index === state.loginSiteIndex ? 'selected' : ''}>${escapeHtml(siteLabel(site))}</option>`
  )).join('')
  elements.loginSiteSelect.value = String(state.loginSiteIndex)
}

function updateLoginModalState({ refreshTurnstile = true } = {}) {
  const site = loginSite()
  if (!site) return
  const authorized = Boolean(getJwt(site.base))
  elements.loginLogout.hidden = !authorized
  elements.loginMessage.textContent = t(authorized ? 'authorizedMessage' : 'loginMessage')
  elements.loginAdminLink.href = originalAdminUrl(site.base, location.href)
  if (refreshTurnstile) ensureLoginTurnstile().catch(() => showLoginError(t('loginTurnstile')))
}

function preferredLoginSiteIndex() {
  return state.unauthorizedSiteIndexes[0]
    ?? state.sites.find(site => !getJwt(site.base))?.index
    ?? state.sites[0]?.index
    ?? 0
}

function openLoginModal(siteIndex = preferredLoginSiteIndex()) {
  if (!state.sites.length || state.preview) return
  state.loginSiteIndex = Math.max(0, Math.min(state.sites.length - 1, Number(siteIndex) || 0))
  renderLoginSites()
  showLoginError('')
  elements.loginModal.hidden = false
  updateLoginModalState()
  const focus = () => elements.loginUsername?.focus()
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focus)
  else setTimeout(focus, 0)
}

function closeLoginModal() {
  elements.loginModal.hidden = true
  destroyLoginTurnstile()
  showLoginError('')
  elements.loginPassword.value = ''
  state.loginBusy = false
  elements.loginSubmit.disabled = false
}

async function submitLogin(event) {
  event?.preventDefault?.()
  if (state.loginBusy || state.preview) return
  const site = loginSite()
  const username = elements.loginUsername.value.trim()
  const password = elements.loginPassword.value
  if (!site || !username || !password) {
    showLoginError(t('loginMissing'))
    return
  }
  const turnstileToken = getLoginTurnstileToken(site.config, state.loginTurnstileWidgetId)
  if (loginTurnstileRequired(site.config) && !turnstileToken) {
    showLoginError(t('loginTurnstile'))
    return
  }

  state.loginBusy = true
  elements.loginSubmit.disabled = true
  showLoginError('')
  try {
    await loginWithCredentials({ base: site.base, username, password, turnstileToken })
    site.config.authorization = true
    state.unauthorizedSiteIndexes = state.unauthorizedSiteIndexes.filter(index => index !== site.index)
    closeLoginModal()
    updateAuthButton()
    showToast(t('loginSuccess'))
    await refreshData()
    if (state.servers.length) connectSockets()
  } catch (error) {
    if (state.loginTurnstileWidgetId != null) window.turnstile?.reset?.(state.loginTurnstileWidgetId)
    showLoginError(error.message || t('loginFailed'))
  } finally {
    state.loginBusy = false
    elements.loginSubmit.disabled = false
  }
}

async function logoutCurrentSite() {
  const site = loginSite()
  if (!site) return
  setJwt('', site.base)
  site.config.authorization = false
  closeLoginModal()
  updateAuthButton()
  showToast(t('logoutSuccess'))
  await refreshData()
  if (state.servers.length) connectSockets()
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

function previewProbeHistory(server, seed = 0) {
  const now = Date.now()
  const latest = toTimestamp(server.last_updated) || now
  return Array.from({ length: 60 }, (_, index) => {
    const sampleTime = now - (59 - index) * 60_000
    if (sampleTime > latest) return null
    const row = { timestamp: sampleTime }
    PROBE_LINES.forEach((line, lineIndex) => {
      const ping = server[line.ping] === null || server[line.ping] === undefined || server[line.ping] === ''
        ? null
        : Number(server[line.ping])
      const loss = server[line.loss] === null || server[line.loss] === undefined || server[line.loss] === ''
        ? null
        : Number(server[line.loss])
      if (Number.isFinite(ping) && ping >= 0) {
        row[line.ping] = Math.max(1, ping + Math.sin((index + seed * 3 + lineIndex) / 6) * (5 + lineIndex * 2))
      }
      if (Number.isFinite(loss) && loss >= 0) {
        const spike = (index + seed + lineIndex * 4) % 23 === 0 ? Math.max(2, loss * 0.8) : 0
        row[line.loss] = Math.min(100, Math.max(0, loss * 0.45 + Math.sin((index + lineIndex) / 8) * loss * 0.25 + spike))
      }
    })
    return row
  }).filter(Boolean)
}

function storeProbeSamples(key, incoming, patch = {}) {
  if (!key) return
  const current = state.probeHistories.get(key) || { rows: [], loaded: false, retryAt: 0 }
  state.probeHistories.set(key, {
    ...current,
    ...patch,
    rows: mergeProbeHistory(current.rows, incoming)
  })
}

function currentProbeSample(server) {
  return {
    timestamp: toTimestamp(server.report_timestamp ?? server.last_updated) || Date.now(),
    ...Object.fromEntries(PROBE_LINES.flatMap(line => [
      [line.ping, server[line.ping]],
      [line.loss, server[line.loss]]
    ]))
  }
}

function seedCurrentProbeSamples(servers = state.servers) {
  servers.forEach(server => storeProbeSamples(server._sourceKey, [currentProbeSample(server)]))
}

function pruneProbeHistories() {
  const activeKeys = new Set(state.servers.map(server => server._sourceKey))
  for (const key of state.probeHistories.keys()) {
    if (!activeKeys.has(key)) state.probeHistories.delete(key)
  }
  state.probeHistoryQueue = state.probeHistoryQueue.filter(server => activeKeys.has(server._sourceKey))
  state.probeHistoryQueued = new Set(state.probeHistoryQueue.map(server => server._sourceKey))
}

function probeHistoryCacheKey(site, server) {
  return `csm-next-probe-history:${encodeURIComponent(site.base || location.origin)}:${server.id}`
}

function readCachedProbeHistory(site, server) {
  try {
    if (typeof sessionStorage === 'undefined') return null
    const key = probeHistoryCacheKey(site, server)
    const cached = JSON.parse(sessionStorage.getItem(key) || 'null')
    if (!cached || Date.now() - Number(cached.savedAt) > PROBE_HISTORY_CACHE_TTL) {
      sessionStorage.removeItem(key)
      return null
    }
    return normalizeProbeHistory(cached.rows)
  } catch {
    return null
  }
}

function cacheProbeHistory(site, server, rows) {
  try {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem(probeHistoryCacheKey(site, server), JSON.stringify({
      savedAt: Date.now(),
      rows: normalizeProbeHistory(rows)
    }))
  } catch { /* storage may be disabled or full */ }
}

async function loadProbeHistory(server) {
  const key = server?._sourceKey
  const site = state.sites[server?._siteIndex]
  if (!key || !site || state.probeHistoryLoads.has(key)) return
  state.probeHistoryLoads.add(key)
  try {
    const cached = readCachedProbeHistory(site, server)
    if (cached) {
      storeProbeSamples(key, cached, { loaded: true, retryAt: 0 })
      scheduleRender()
      return
    }
    const data = await requestJson(site, `/api/history/all?id=${encodeURIComponent(server.id)}&hours=1`)
    if (!findServer(key)) return
    const rows = normalizeProbeHistory(data)
    storeProbeSamples(key, rows, { loaded: true, retryAt: 0 })
    cacheProbeHistory(site, server, rows)
    scheduleRender()
  } catch (error) {
    const current = state.probeHistories.get(key) || { rows: [], loaded: false }
    state.probeHistories.set(key, { ...current, loaded: false, retryAt: Date.now() + 60_000 })
    console.warn(`[probe-history] unable to load ${key}`, error)
  } finally {
    state.probeHistoryLoads.delete(key)
  }
}

function pumpProbeHistoryQueue() {
  while (state.probeHistoryActive < PROBE_HISTORY_CONCURRENCY && state.probeHistoryQueue.length) {
    const server = state.probeHistoryQueue.shift()
    const key = server?._sourceKey
    state.probeHistoryQueued.delete(key)
    if (!key || !findServer(key)) continue
    state.probeHistoryActive += 1
    loadProbeHistory(server).finally(() => {
      state.probeHistoryActive = Math.max(0, state.probeHistoryActive - 1)
      pumpProbeHistoryQueue()
    })
  }
}

function queueProbeHistory(server) {
  const key = server?._sourceKey
  const entry = state.probeHistories.get(key)
  if (!key || state.preview || entry?.loaded || (entry?.retryAt || 0) > Date.now()) return
  if (state.probeHistoryLoads.has(key) || state.probeHistoryQueued.has(key)) return
  state.probeHistoryQueued.add(key)
  state.probeHistoryQueue.push(server)
  pumpProbeHistoryQueue()
}

function observeVisibleProbeCards() {
  state.probeObserver?.disconnect?.()
  state.probeObserver = null
  if (state.preview) return
  const cards = [...document.querySelectorAll('.server-card[data-server-key]')]
  if (!cards.length) return
  if (typeof IntersectionObserver !== 'function') {
    cards.forEach(card => queueProbeHistory(findServer(card.dataset.serverKey)))
    return
  }
  state.probeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      queueProbeHistory(findServer(entry.target.dataset.serverKey))
      state.probeObserver?.unobserve?.(entry.target)
    })
  }, { rootMargin: '240px 0px' })
  cards.forEach(card => {
    const history = state.probeHistories.get(card.dataset.serverKey)
    if (!history?.loaded) state.probeObserver.observe(card)
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
      state.probeHistories.clear()
      state.servers.forEach((server, index) => {
        storeProbeSamples(server._sourceKey, previewProbeHistory(server, index), { loaded: true, retryAt: 0 })
      })
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
    const failures = results.flatMap((result, index) => (
      result.status === 'rejected' ? [{ error: result.reason, site: state.sites[index] }] : []
    ))
    const unauthorized = failures.filter(item => item.error?.status === 401)
    state.unauthorizedSiteIndexes = unauthorized.map(item => item.site.index)
    updateAuthButton()
    if (!successful.length) throw failures[0]?.error || new Error(t('loadFailed'))

    state.servers = successful.flatMap(result => result.servers)
    pruneProbeHistories()
    seedCurrentProbeSamples()
    state.siteConfigs = []
    successful.forEach(result => {
      state.siteConfigs[result.siteIndex] = result.sysConfig
    })
    const version = successful.map(result => result.version).find(Boolean)
    elements.versionText.textContent = version ? `CF-Server-Monitor ${version}` : 'CF-Server-Monitor Theme'
    state.upstreamTitle = successful.map(result => result.sysConfig?.site_title).find(Boolean)
      || state.sites.map(site => site.config?.site_title).find(Boolean)
      || ''
    applyConfig()

    recomputeStats()
    renderAll()
    if (unauthorized.length) showAuthorizationNotice(unauthorized.length)
    else hideError()
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
  if (value === null || value === undefined || value === '') return 'missing'
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return 'missing'
  if (type === 'latency') return number >= 180 ? 'bad' : number >= 90 ? 'warn' : ''
  return number >= 10 ? 'bad' : number >= 2 ? 'warn' : ''
}

function formatProbeTime(value) {
  return new Date(value).toLocaleTimeString(state.language === 'zh' ? 'zh-CN' : 'en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false
  })
}

function formatProbeValue(value, type) {
  if (value === null || value === undefined || value === '') return 'N/A'
  if (!Number.isFinite(Number(value))) return 'N/A'
  return type === 'latency' ? `${Number(value).toFixed(0)} ms` : `${Number(value).toFixed(1)}%`
}

function renderProbeTimeline(buckets, type) {
  return buckets.map((bucket, index) => {
    const routeValues = PROBE_LINES.flatMap(line => {
      const value = bucket.probes?.[line.id]
      return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
        ? [`${line.id} ${formatProbeValue(value, type)}`]
        : []
    })
    const label = [
      `${formatProbeTime(bucket.start)}–${formatProbeTime(bucket.end)}`,
      formatProbeValue(bucket.value, type),
      ...routeValues
    ].join(' · ')
    return `<span class="probe-bar ${probeClass(bucket.value, type)}" data-probe-bucket="${index}" title="${escapeHtml(label)}"></span>`
  }).join('')
}

function renderCurrentProbeBars(values, type) {
  return PROBE_LINES.map((line, index) => {
    const value = values[index]
    const label = `${line.id} ${formatProbeValue(value, type)}`
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
  const history = state.probeHistories.get(server._sourceKey)
  const historyReady = Boolean(history?.loaded)
  const probeSummary = historyReady
    ? summarizeProbeHistory(history.rows, { bucketCount: PROBE_HISTORY_BUCKETS })
    : null
  const pingAverage = historyReady ? probeSummary.latency.average : average(pingValues)
  const lossAverage = historyReady ? probeSummary.loss.average : average(lossValues)
  const pingBars = historyReady
    ? renderProbeTimeline(probeSummary.latency.buckets, 'latency')
    : renderCurrentProbeBars(pingValues, 'latency')
  const lossBars = historyReady
    ? renderProbeTimeline(probeSummary.loss.buckets, 'loss')
    : renderCurrentProbeBars(lossValues, 'loss')
  const probeSource = historyReady ? 'history' : 'current'
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
        <section class="probe-section" data-probe-source="${probeSource}">
          <div class="probe-heading"><span>${t('pingStats')}</span><small>${t(historyReady ? 'lastHour' : 'currentSamples')}</small></div>
          <div class="probe-grid">
            <div class="probe-box"><div class="probe-box-head"><span>${t('latency')}</span><strong>${pingAverage === null ? t('timeout') : `${pingAverage.toFixed(0)} ms`}</strong></div><div class="probe-bars">${pingBars}</div></div>
            <div class="probe-box"><div class="probe-box-head"><span title="${escapeHtml(t('lossHistoryHint'))}">${t('loss')}</span><strong>${lossAverage === null ? '—' : `${lossAverage.toFixed(1)}%`}</strong></div><div class="probe-bars">${lossBars}</div></div>
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
    state.probeObserver?.disconnect?.()
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
  observeVisibleProbeCards()
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
  elements.statusTitle.textContent = t(unauthorized ? 'loginTitle' : 'loadFailedTitle')
  elements.statusMessage.textContent = unauthorized ? t('unauthorized') : t('loadFailed')
  elements.retryButton.dataset.action = unauthorized ? 'login' : 'retry'
  elements.retryButton.textContent = t(unauthorized ? 'login' : 'retry')
  elements.statusBanner.hidden = false
}

function showAuthorizationNotice(count) {
  elements.statusTitle.textContent = t('privateSitesTitle')
  elements.statusMessage.textContent = t('privateSites', { count })
  elements.retryButton.dataset.action = 'login'
  elements.retryButton.textContent = t('login')
  elements.statusBanner.hidden = false
}

function hideError() {
  elements.statusBanner.hidden = true
  elements.retryButton.dataset.action = 'retry'
  elements.retryButton.textContent = t('retry')
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
    const key = `${site.index}:${update.serverId}`
    const index = state.servers.findIndex(server => server._sourceKey === key)
    if (index < 0) continue
    const samples = Array.isArray(update.samples) && update.samples.length
      ? update.samples.flatMap(sample => {
          const data = sample?.data || sample?.payload || sample?.metrics
          return data ? [{ data, timestamp: sample.ts ?? update.ts ?? message.ts }] : []
        })
      : update.data ? [{ data: update.data, timestamp: update.ts ?? message.ts }] : []
    if (!samples.length) continue
    storeProbeSamples(key, samples.map(sample => ({ ...sample.data, timestamp: sample.timestamp })))
    const latest = samples[samples.length - 1]
    const data = latest.data
    state.servers[index] = {
      ...state.servers[index],
      ...data,
      id: update.serverId,
      report_timestamp: latest.timestamp ?? data.report_timestamp ?? data.last_updated,
      last_updated: latest.timestamp ?? data.last_updated,
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
  elements.retryButton.addEventListener('click', () => {
    if (elements.retryButton.dataset.action === 'login') openLoginModal()
    else refreshData()
  })
  elements.authButton.addEventListener('click', () => openLoginModal())
  elements.themeSettingsButton.addEventListener('click', openThemeDrawer)
  elements.themeDrawerClose.addEventListener('click', closeThemeDrawer)
  elements.themeDrawerBackdrop.addEventListener('click', closeThemeDrawer)
  elements.themeSettingsLogin.addEventListener('click', () => openLoginModal(preferredLoginSiteIndex()))
  elements.themeSettingsForm.addEventListener('submit', submitThemeSettings)
  elements.themeTransparencyEnabled.addEventListener('change', () => {
    updateThemeTransparencyControls({ initializeIntensity: true })
  })
  elements.themeTransparencySoft.addEventListener('change', updateThemeTransparencyControls)
  elements.themeTransparencyGlass.addEventListener('change', updateThemeTransparencyControls)
  elements.themeTransparencyIntensity.addEventListener('input', updateThemeTransparencyControls)
  elements.themePanelBlur.addEventListener('input', updateThemeTransparencyControls)
  elements.themeSettingsReset.addEventListener('click', () => {
    elements.themeBackgroundImage.value = ''
    elements.themeBackgroundUpload.value = ''
    elements.themeTransparencyEnabled.checked = false
    elements.themeTransparencySoft.checked = true
    elements.themeTransparencyGlass.checked = false
    elements.themeTransparencyIntensity.value = '0'
    elements.themePanelBlur.value = '18'
    elements.themeCustomCss.value = ''
    updateThemeTransparencyControls()
    setThemeSettingsError('')
  })
  elements.themeButton.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('csm-next-theme', state.theme)
    applyTheme()
    if (!elements.loginModal.hidden) updateLoginModalState()
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
  elements.loginForm.addEventListener('submit', submitLogin)
  elements.loginCancel.addEventListener('click', closeLoginModal)
  elements.loginLogout.addEventListener('click', logoutCurrentSite)
  elements.loginSiteSelect.addEventListener('change', () => {
    state.loginSiteIndex = Number(elements.loginSiteSelect.value) || 0
    showLoginError('')
    updateLoginModalState()
  })
  elements.loginModal.addEventListener('click', event => {
    if (event.target === elements.loginModal) closeLoginModal()
  })
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    if (!elements.loginModal.hidden) closeLoginModal()
    else if (state.themeDrawerOpen) closeThemeDrawer()
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
  await loadPersistedThemeSettings()

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
