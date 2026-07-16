const translations = {
  zh: {
    adminPanel: '管理后台', loginTitle: '管理后台登录',
    loginMessage: 'JWT 保存在当前站点域名下，与公开页共用登录状态。',
    username: '用户名', password: '密码', login: '登录', logout: '退出',
    backHome: '返回前台', menu: '菜单', theme: '切换主题', language: 'Switch to English',
    servers: '服务器', settings: '设置', database: '数据库', nodeList: '节点列表',
    searchServers: '查找服务器', serverName: '节点名称', groupName: '分组',
    addServer: '添加节点', batchDelete: '批量删除', name: '名称', group: '分组',
    tags: '标签', note: '备注', price: '价格', expire: '到期', traffic: '流量',
    status: '状态', actions: '操作', online: '在线', offline: '离线', noServers: '暂无服务器，请先添加节点。',
    editServer: '编辑节点', save: '保存', cancel: '取消', copy: '复制', confirm: '确认',
    confirmDelete: '确认删除', installCommand: '安装命令',
    installCommandHint: '复制安装命令，在目标服务器上执行即可完成探针部署',
    uninstallCommand: '卸载命令',
    targetOs: '目标系统', tagsPlaceholder: '逗号分隔', notePlaceholder: '仅后台可见',
    trafficLimit: '流量限额 (GB)', trafficCalcType: '流量计算', trafficCalcTotal: '总计',
    trafficCalcUl: '仅上传', trafficCalcDl: '仅下载', trafficResetDay: '流量重置日',
    collectInterval: '采集间隔（秒）', reportInterval: '上报间隔（秒）', pingMode: 'Ping 方式',
    customCt: '中国电信测试节点', customCu: '中国联通测试节点', customCm: '中国移动测试节点', customBd: 'BD测试节点',
    rxCorrection: '下行校正 (GB)', txCorrection: '上行校正 (GB)',
    hideFromPublic: '对未登录用户隐藏', disableOfflineNotify: '禁用该节点离线通知',
    appearance: '外观', siteTitle: '站点标题', bgImage: '背景图 URL',
    customHead: '自定义 <head>', customScript: '自定义脚本', cspStatic: 'CSP 静态域名', cspApi: 'CSP API 域名',
    displayOptions: '显示选项', publicAccess: '公开访问', showPrice: '显示价格',
    showExpire: '显示到期', showTf: '显示流量配额', showTime: '显示时间', showLongHistory: '显示更长历史',
    notifications: '通知', offlineAlert: '离线告警', expireReminder: '到期提醒',
    disabled: '关闭', notifyOffline: '离线 5 分钟后通知', notifyExpire: '到期前 7 天提醒',
    telegramToken: '通知 Token / Webhook', chatId: 'Chat ID', sendTestNotification: '发送测试通知',
    securitySettings: '安全设置', enableTurnstile: '启用 Turnstile（公开页）',
    enableTurnstileLogin: '启用 Turnstile（登录）', turnstileSiteKey: 'Turnstile Site Key',
    turnstileSecretKey: 'Turnstile Secret Key', jwtSecret: 'JWT Secret',
    cloudflareSettings: 'Cloudflare', cloudflareAccountId: 'Account ID', queryD1Quota: '查询 D1 / Workers 用量',
    adminLoginSettings: '管理员账号', changePassword: '修改密码', cancelPasswordChange: '取消修改密码',
    confirmPassword: '确认密码', apiSecretTip: 'API_SECRET 仍使用 Worker 环境变量，不在此修改。',
    pingNodes: 'Ping 节点', saveConfig: '保存配置', saving: '保存中…',
    upgradeDatabase: '升级数据库', upgradeDesc: '将数据库结构迁移到最新版本。不会改动主题侧逻辑。',
    clearHistory: '清空历史数据', clearHistoryDesc: '删除全部监控历史，保留服务器列表与设置。此操作不可恢复。',
    loginSuccess: '登录成功', loginFailed: '登录失败，请检查账号密码', loginMissing: '请输入用户名和密码',
    loginTurnstile: '请先完成安全验证', unauthorized: '登录已过期，请重新登录',
    loadFailed: '无法连接管理 API，请检查 apiBase 与 CORS 设置。',
    serverAdded: '节点已添加', serverUpdated: '节点已更新', serverDeleted: '节点已删除',
    batchDeleted: '批量删除完成', orderSaved: '排序已保存', settingsSaved: '配置已保存',
    copied: '已复制', enterServerName: '请输入节点名称', selectServers: '请先选择要删除的节点',
    confirmDeleteServers: '确认删除选中的 {count} 个节点？此操作不可恢复。',
    confirmClearHistory: '确认清空全部历史数据？服务器列表与设置会保留，此操作不可恢复。',
    confirmUpgradeDb: '确认执行数据库升级？',
    passwordMismatch: '两次输入的密码不一致', usernameRequired: '用户名不能为空',
    jwtSecretMinLength: 'JWT Secret 至少 32 个字符', jwtSecretNoWhitespace: 'JWT Secret 不能包含空白字符',
    turnstileRequired: '启用 Turnstile 时必须填写 Site Key 与 Secret Key',
    tgTokenRequired: '启用通知时必须填写 Bot Token',
    operationSuccess: '操作成功', operationFailed: '操作失败',
    d1RowsRead: 'D1 读行', d1RowsWritten: 'D1 写行', workersRequests: 'Workers 请求',
    today: '今日', last24h: '近 24 小时', previewMode: '预览模式'
  },
  en: {
    adminPanel: 'Admin', loginTitle: 'Admin Sign In',
    loginMessage: 'JWT is stored for this origin and shared with public pages.',
    username: 'Username', password: 'Password', login: 'Sign in', logout: 'Log out',
    backHome: 'Back to site', menu: 'Menu', theme: 'Toggle theme', language: '切换到中文',
    servers: 'Servers', settings: 'Settings', database: 'Database', nodeList: 'Node list',
    searchServers: 'Search servers', serverName: 'Server name', groupName: 'Group',
    addServer: 'Add node', batchDelete: 'Batch delete', name: 'Name', group: 'Group',
    tags: 'Tags', note: 'Note', price: 'Price', expire: 'Expire', traffic: 'Traffic',
    status: 'Status', actions: 'Actions', online: 'Online', offline: 'Offline', noServers: 'No servers yet. Add a node first.',
    editServer: 'Edit node', save: 'Save', cancel: 'Cancel', copy: 'Copy', confirm: 'Confirm',
    confirmDelete: 'Confirm delete', installCommand: 'Install command',
    installCommandHint: 'Copy the install command and run it on the target server',
    uninstallCommand: 'Uninstall command',
    targetOs: 'Target OS', tagsPlaceholder: 'Comma separated', notePlaceholder: 'Admin only',
    trafficLimit: 'Traffic limit (GB)', trafficCalcType: 'Traffic calc', trafficCalcTotal: 'Total',
    trafficCalcUl: 'Upload only', trafficCalcDl: 'Download only', trafficResetDay: 'Traffic reset day',
    collectInterval: 'Collect interval (s)', reportInterval: 'Report interval (s)', pingMode: 'Ping mode',
    customCt: 'China Telecom node', customCu: 'China Unicom node', customCm: 'China Mobile node', customBd: 'BD node',
    rxCorrection: 'RX correction (GB)', txCorrection: 'TX correction (GB)',
    hideFromPublic: 'Hide from public users', disableOfflineNotify: 'Disable offline notify for this node',
    appearance: 'Appearance', siteTitle: 'Site title', bgImage: 'Background image URL',
    customHead: 'Custom <head>', customScript: 'Custom script', cspStatic: 'CSP static domains', cspApi: 'CSP API domains',
    displayOptions: 'Display options', publicAccess: 'Public access', showPrice: 'Show price',
    showExpire: 'Show expiration', showTf: 'Show traffic quota', showTime: 'Show time', showLongHistory: 'Show longer history',
    notifications: 'Notifications', offlineAlert: 'Offline alert', expireReminder: 'Expiration reminder',
    disabled: 'Disabled', notifyOffline: 'Notify after 5 min offline', notifyExpire: 'Remind within 7 days',
    telegramToken: 'Notify token / webhook', chatId: 'Chat ID', sendTestNotification: 'Send test notification',
    securitySettings: 'Security', enableTurnstile: 'Enable Turnstile (public)',
    enableTurnstileLogin: 'Enable Turnstile (login)', turnstileSiteKey: 'Turnstile Site Key',
    turnstileSecretKey: 'Turnstile Secret Key', jwtSecret: 'JWT Secret',
    cloudflareSettings: 'Cloudflare', cloudflareAccountId: 'Account ID', queryD1Quota: 'Query D1 / Workers usage',
    adminLoginSettings: 'Admin account', changePassword: 'Change password', cancelPasswordChange: 'Cancel password change',
    confirmPassword: 'Confirm password', apiSecretTip: 'API_SECRET still comes from Worker env and is not edited here.',
    pingNodes: 'Ping nodes', saveConfig: 'Save configuration', saving: 'Saving…',
    upgradeDatabase: 'Upgrade database', upgradeDesc: 'Migrate database schema to the latest version. Theme logic is untouched.',
    clearHistory: 'Clear history', clearHistoryDesc: 'Delete all monitoring history. Servers and settings are kept. Irreversible.',
    loginSuccess: 'Signed in', loginFailed: 'Sign-in failed. Check credentials.', loginMissing: 'Enter username and password',
    loginTurnstile: 'Complete the security check first', unauthorized: 'Session expired. Sign in again.',
    loadFailed: 'Cannot reach admin API. Check apiBase and CORS.',
    serverAdded: 'Server added', serverUpdated: 'Server updated', serverDeleted: 'Server deleted',
    batchDeleted: 'Batch delete complete', orderSaved: 'Order saved', settingsSaved: 'Settings saved',
    copied: 'Copied', enterServerName: 'Enter a server name', selectServers: 'Select servers to delete first',
    confirmDeleteServers: 'Delete {count} selected servers? This cannot be undone.',
    confirmClearHistory: 'Clear all history data? Servers and settings are kept. Irreversible.',
    confirmUpgradeDb: 'Run database upgrade?',
    passwordMismatch: 'Passwords do not match', usernameRequired: 'Username is required',
    jwtSecretMinLength: 'JWT Secret must be at least 32 characters', jwtSecretNoWhitespace: 'JWT Secret cannot contain whitespace',
    turnstileRequired: 'Site Key and Secret Key are required when Turnstile is enabled',
    tgTokenRequired: 'Bot token is required when notifications are enabled',
    operationSuccess: 'Operation successful', operationFailed: 'Operation failed',
    d1RowsRead: 'D1 rows read', d1RowsWritten: 'D1 rows written', workersRequests: 'Workers requests',
    today: 'Today', last24h: 'Last 24h', previewMode: 'Preview mode'
  }
}

const params = new URLSearchParams(location.search)
const state = {
  config: {},
  sites: [],
  siteIndex: Number(params.get('site') || 0) || 0,
  preview: params.get('preview') === '1',
  language: localStorage.getItem('csm-next-language') || (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'),
  theme: localStorage.getItem('csm-next-theme') || 'light',
  tab: 'servers',
  servers: [],
  selected: new Set(),
  search: '',
  apiConfig: {},
  apiSecret: '',
  settings: {},
  changePassword: false,
  loginBusy: false,
  turnstileWidgetId: null,
  dragId: null,
  copyServer: null,
  deleteId: null,
  confirmAction: null,
  busy: false
}

const $ = id => document.getElementById(id)

const elements = {
  loginView: $('loginView'),
  appView: $('appView'),
  loginForm: $('loginForm'),
  loginUsername: $('loginUsername'),
  loginPassword: $('loginPassword'),
  loginError: $('loginError'),
  loginSubmit: $('loginSubmit'),
  loginTurnstile: $('loginTurnstile'),
  brandTitle: $('brandTitle'),
  pageTitle: $('pageTitle'),
  siteSelect: $('siteSelect'),
  themeButton: $('themeButton'),
  languageButton: $('languageButton'),
  logoutButton: $('logoutButton'),
  sidebarToggle: $('sidebarToggle'),
  sidebarBackdrop: $('sidebarBackdrop'),
  serverSearch: $('serverSearch'),
  newServerName: $('newServerName'),
  newServerGroup: $('newServerGroup'),
  groupList: $('groupList'),
  addServerButton: $('addServerButton'),
  batchDeleteButton: $('batchDeleteButton'),
  selectAll: $('selectAll'),
  serverTableBody: $('serverTableBody'),
  serversEmpty: $('serversEmpty'),
  settingsForm: $('settingsForm'),
  settingsError: $('settingsError'),
  saveSettingsButton: $('saveSettingsButton'),
  togglePasswordChange: $('togglePasswordChange'),
  passwordChangeFields: $('passwordChangeFields'),
  testNotifyButton: $('testNotifyButton'),
  queryD1Button: $('queryD1Button'),
  d1UsageBox: $('d1UsageBox'),
  upgradeDbButton: $('upgradeDbButton'),
  clearHistoryButton: $('clearHistoryButton'),
  editModal: $('editModal'),
  editForm: $('editForm'),
  offlineNotifyWrap: $('offlineNotifyWrap'),
  copyModal: $('copyModal'),
  copyModalTitle: $('copyModalTitle'),
  copyTargetOs: $('copyTargetOs'),
  installCommandText: $('installCommandText'),
  copyInstallButton: $('copyInstallButton'),
  deleteModal: $('deleteModal'),
  deleteMessage: $('deleteMessage'),
  deleteTargetOs: $('deleteTargetOs'),
  uninstallCommandText: $('uninstallCommandText'),
  copyUninstallButton: $('copyUninstallButton'),
  confirmDeleteButton: $('confirmDeleteButton'),
  confirmModal: $('confirmModal'),
  confirmTitle: $('confirmTitle'),
  confirmMessage: $('confirmMessage'),
  confirmActionButton: $('confirmActionButton'),
  toast: $('toast'),
  themeColor: document.querySelector('meta[name="theme-color"]')
}

function t(key, values = {}) {
  let text = translations[state.language]?.[key] ?? translations.en[key] ?? key
  for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value))
  return text
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function joinUrl(base, path) {
  return `${String(base).replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`
}

function normalizeBase(value) {
  if (!value) return location.origin
  try { return new URL(String(value), location.href).href.replace(/\/$/, '') } catch { return String(value).replace(/\/$/, '') }
}

function currentBase() {
  return state.sites[state.siteIndex]?.base || location.origin
}

function jwtStorageKey(base = currentBase()) {
  return `csm-next-jwt:${normalizeBase(base)}`
}

function getJwt() {
  return localStorage.getItem(jwtStorageKey()) || localStorage.getItem('jwt_token') || ''
}

function setJwt(token) {
  const scoped = jwtStorageKey()
  if (token) {
    localStorage.setItem(scoped, token)
    localStorage.setItem('jwt_token', token)
    return
  }
  localStorage.removeItem(scoped)
  localStorage.removeItem('jwt_token')
}

function truthy(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function showToast(message) {
  elements.toast.textContent = message
  elements.toast.classList.add('show')
  clearTimeout(showToast.timer)
  showToast.timer = setTimeout(() => elements.toast.classList.remove('show'), 2200)
}

function showLoginError(message) {
  elements.loginError.textContent = message
  elements.loginError.hidden = !message
}

function showSettingsError(message) {
  elements.settingsError.textContent = message
  elements.settingsError.hidden = !message
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
    const label = t(node.dataset.i18nTitle)
    node.title = label
    node.setAttribute('aria-label', label)
  })
  elements.languageButton.querySelector('span').textContent = state.language === 'zh' ? '文' : 'A'
  elements.languageButton.querySelector('small').textContent = state.language === 'zh' ? 'A' : '文'
  updatePageTitle()
  if (state.changePassword) elements.togglePasswordChange.textContent = t('cancelPasswordChange')
}

function updatePageTitle() {
  const titles = { servers: 'nodeList', settings: 'settings', database: 'database' }
  elements.pageTitle.textContent = t(titles[state.tab] || 'nodeList')
}

function openModal(id) {
  const node = $(id)
  if (node) node.hidden = false
}

function closeModal(id) {
  const node = $(id)
  if (node) node.hidden = true
}

function setSidebarOpen(open) {
  document.querySelector('.admin-app')?.classList.toggle('sidebar-open', open)
  elements.sidebarBackdrop.hidden = !open
}

function setAuthedView(authed) {
  elements.loginView.hidden = authed
  elements.appView.hidden = !authed
}

function switchTab(tab) {
  state.tab = tab
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.tab === tab)
  })
  $('tabServers').hidden = tab !== 'servers'
  $('tabServers').classList.toggle('is-active', tab === 'servers')
  $('tabSettings').hidden = tab !== 'settings'
  $('tabSettings').classList.toggle('is-active', tab === 'settings')
  $('tabDatabase').hidden = tab !== 'database'
  $('tabDatabase').classList.toggle('is-active', tab === 'database')
  updatePageTitle()
  setSidebarOpen(false)
  if (tab === 'settings' && !Object.keys(state.settings).length) loadSettings()
}

async function loadConfig() {
  try {
    const response = await fetch('./config.json', { cache: 'no-store' })
    if (!response.ok) throw new Error(`config.json: ${response.status}`)
    return await response.json()
  } catch {
    return { apiBase: [], title: 'CF-Server-Monitor', backgroundImage: '' }
  }
}

function buildSites(config) {
  const list = Array.isArray(config.apiBase) ? config.apiBase : [config.apiBase]
  const bases = list.map(normalizeBase).filter(Boolean)
  if (!bases.length) bases.push(location.origin)
  return bases.map((base, index) => ({ base, index, label: new URL(base).host || base }))
}

function renderSiteSelect() {
  if (state.sites.length <= 1) {
    elements.siteSelect.hidden = true
    return
  }
  elements.siteSelect.hidden = false
  elements.siteSelect.innerHTML = state.sites.map((site, index) => (
    `<option value="${index}" ${index === state.siteIndex ? 'selected' : ''}>${escapeHtml(site.label)}</option>`
  )).join('')
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store', ...options })
  const data = await response.json().catch(() => null)
  return { response, data }
}

function unwrap(data) {
  if (!data || typeof data !== 'object') return data
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return { ...data, ...data.data }
  }
  return data
}

async function adminApi(payload, { auth = true } = {}) {
  if (state.preview) return previewAdminApi(payload)
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (auth) {
    const token = getJwt()
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
    setJwt('')
    setAuthedView(false)
    throw new Error(body?.error || t('unauthorized'))
  }
  if (!response.ok || body?.error) {
    throw new Error(body?.error || body?.message || t('operationFailed'))
  }
  return body
}

async function postSystem(path) {
  if (state.preview) return { success: true, message: 'ok' }
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const token = getJwt()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const { response, data } = await fetchJson(joinUrl(currentBase(), path), {
    method: 'POST',
    headers,
    body: '{}'
  })
  const body = unwrap(data)
  if (response.status === 401) {
    setJwt('')
    setAuthedView(false)
    throw new Error(t('unauthorized'))
  }
  if (!response.ok || body?.error) throw new Error(body?.error || body?.message || t('operationFailed'))
  return body
}

function previewAdminApi(payload) {
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

function previewServers() {
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

function loginTurnstileRequired() {
  return truthy(state.apiConfig?.turnstile_login_enabled) || truthy(state.apiConfig?.turnstile_enabled)
}

function getLoginTurnstileToken() {
  if (!loginTurnstileRequired()) return ''
  return window.turnstile?.getResponse?.(state.turnstileWidgetId) || ''
}

async function ensureLoginTurnstile() {
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

function loadTurnstileScript() {
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

async function loadApiConfig() {
  if (state.preview) {
    state.apiConfig = { turnstile_login_enabled: false, version: 'preview' }
    return
  }
  try {
    const { response, data } = await fetchJson(joinUrl(currentBase(), '/api/config'))
    if (response.ok) state.apiConfig = unwrap(data) || data || {}
  } catch {
    state.apiConfig = {}
  }
}

async function submitLogin(event) {
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
    setJwt(token)
    showToast(t('loginSuccess'))
    await enterApp()
  } catch (error) {
    if (state.turnstileWidgetId != null && window.turnstile?.reset) window.turnstile.reset(state.turnstileWidgetId)
    showLoginError(error.message || t('loginFailed'))
  } finally {
    state.loginBusy = false
    elements.loginSubmit.disabled = false
  }
}

async function enterApp() {
  setAuthedView(true)
  applyTranslations()
  await Promise.all([loadServers(), loadSettings()])
}

function splitTags(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean)
}

function formatTrafficLimit(value) {
  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  if (amount >= 1024) return `${Number((amount / 1024).toFixed(amount >= 10240 ? 0 : 1))} TB`
  return `${amount} GB`
}

function filteredServers() {
  const query = state.search.trim().toLowerCase()
  if (!query) return state.servers
  return state.servers.filter(server => {
    const haystack = [server.name, server.server_group, server.tags, server.note, server.price]
      .map(item => String(item || '').toLowerCase())
      .join(' ')
    return haystack.includes(query)
  })
}

function renderServers() {
  const servers = filteredServers()
  elements.serversEmpty.hidden = servers.length > 0
  elements.serverTableBody.innerHTML = servers.map(server => {
    const online = truthy(server.is_online)
    const tags = splitTags(server.tags).map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('') || '—'
    const selected = state.selected.has(server.id)
    return `<tr data-id="${escapeHtml(server.id)}" draggable="true">
      <td class="col-drag"><span class="drag-handle" title="Drag">⋮⋮</span></td>
      <td class="col-check"><input type="checkbox" data-select="${escapeHtml(server.id)}" ${selected ? 'checked' : ''}></td>
      <td>
        <div class="server-name-cell">
          <span class="status-dot ${online ? 'online' : ''}"></span>
          <span class="name">${escapeHtml(server.name || '—')}</span>
        </div>
      </td>
      <td>${server.server_group ? `<span class="group-chip">${escapeHtml(server.server_group)}</span>` : '—'}</td>
      <td>${tags}</td>
      <td><span class="note-text" title="${escapeHtml(server.note || '')}">${escapeHtml(server.note || '—')}</span></td>
      <td>${server.price ? `<span class="bill-chip">${escapeHtml(server.price)}</span>` : '—'}</td>
      <td>${server.expire_date ? `<span class="bill-chip expire">${escapeHtml(server.expire_date)}</span>` : '—'}</td>
      <td>${escapeHtml(formatTrafficLimit(server.traffic_limit))}</td>
      <td>${online ? t('online') : t('offline')}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-button" data-action="copy" data-id="${escapeHtml(server.id)}" title="${escapeHtml(t('copy'))}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button type="button" class="icon-button" data-action="edit" data-id="${escapeHtml(server.id)}" title="${escapeHtml(t('editServer'))}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button type="button" class="icon-button danger" data-action="delete" data-id="${escapeHtml(server.id)}" title="${escapeHtml(t('confirmDelete'))}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </td>
    </tr>`
  }).join('')

  const groups = [...new Set(state.servers.map(item => item.server_group).filter(Boolean))]
  elements.groupList.innerHTML = groups.map(group => `<option value="${escapeHtml(group)}"></option>`).join('')
  elements.selectAll.checked = servers.length > 0 && servers.every(item => state.selected.has(item.id))
}

async function loadServers() {
  try {
    const data = await adminApi({ action: 'list' })
    state.servers = Array.isArray(data.servers) ? data.servers : []
    state.selected = new Set([...state.selected].filter(id => state.servers.some(item => item.id === id)))
    renderServers()
  } catch (error) {
    showToast(error.message || t('loadFailed'))
  }
}

async function addServer() {
  const name = elements.newServerName.value.trim()
  if (!name) {
    showToast(t('enterServerName'))
    return
  }
  const server_group = elements.newServerGroup.value.trim() || 'Default'
  try {
    await adminApi({ action: 'add', name, server_group })
    elements.newServerName.value = ''
    showToast(t('serverAdded'))
    await loadServers()
  } catch (error) {
    showToast(error.message || t('operationFailed'))
  }
}

// Only use node-level value, then site settings from /admin/api — no hardcoded hosts.
function effectivePingNode(serverValue, settingsKey) {
  return String(serverValue || state.settings?.[settingsKey] || '').trim()
}

async function ensureSettingsLoaded() {
  if (state.settings && Object.keys(state.settings).length) return
  await loadSettings()
}

async function openEditModal(server) {
  await ensureSettingsLoaded()
  $('edit_id').value = server.id
  $('edit_name').value = server.name || ''
  $('edit_server_group').value = server.server_group || ''
  $('edit_tags').value = server.tags || ''
  $('edit_note').value = server.note || ''
  $('edit_price').value = server.price || ''
  $('edit_expire_date').value = server.expire_date || ''
  $('edit_traffic_limit').value = server.traffic_limit || ''
  $('edit_traffic_calc_type').value = server.traffic_calc_type || 'total'
  $('edit_reset_day').value = server.reset_day ?? 1
  $('edit_collect_interval').value = String(server.collect_interval ?? 0)
  $('edit_report_interval').value = String(server.report_interval || 60)
  $('edit_ping_mode').value = server.ping_mode || 'http'
  // Prefer node-level value, otherwise global settings from get_settings.
  $('edit_custom_ct').value = effectivePingNode(server.custom_ct, 'custom_ct')
  $('edit_custom_cu').value = effectivePingNode(server.custom_cu, 'custom_cu')
  $('edit_custom_cm').value = effectivePingNode(server.custom_cm, 'custom_cm')
  $('edit_custom_bd').value = effectivePingNode(server.custom_bd, 'custom_bd')
  $('edit_custom_ct').placeholder = state.settings.custom_ct || ''
  $('edit_custom_cu').placeholder = state.settings.custom_cu || ''
  $('edit_custom_cm').placeholder = state.settings.custom_cm || ''
  $('edit_custom_bd').placeholder = state.settings.custom_bd || ''
  $('edit_rx_correction').value = server.rx_correction ?? ''
  $('edit_tx_correction').value = server.tx_correction ?? ''
  $('edit_is_hidden').checked = truthy(server.is_hidden)
  $('edit_offline_notify_disabled').checked = truthy(server.offline_notify_disabled)
  const showOffline = state.settings.tg_notify === 'true' && state.settings.tg_bot_token
  elements.offlineNotifyWrap.hidden = !showOffline
  openModal('editModal')
}

async function saveEdit(event) {
  event.preventDefault()
  const payload = {
    action: 'edit',
    id: $('edit_id').value,
    name: $('edit_name').value.trim(),
    server_group: $('edit_server_group').value.trim() || 'Default',
    tags: $('edit_tags').value,
    note: $('edit_note').value,
    price: $('edit_price').value,
    expire_date: $('edit_expire_date').value,
    traffic_limit: $('edit_traffic_limit').value,
    traffic_calc_type: $('edit_traffic_calc_type').value,
    reset_day: Number($('edit_reset_day').value || 0),
    collect_interval: Number($('edit_collect_interval').value || 0),
    report_interval: Number($('edit_report_interval').value || 60),
    ping_mode: $('edit_ping_mode').value,
    custom_ct: $('edit_custom_ct').value,
    custom_cu: $('edit_custom_cu').value,
    custom_cm: $('edit_custom_cm').value,
    custom_bd: $('edit_custom_bd').value,
    rx_correction: $('edit_rx_correction').value,
    tx_correction: $('edit_tx_correction').value,
    is_hidden: $('edit_is_hidden').checked ? '1' : '0',
    offline_notify_disabled: $('edit_offline_notify_disabled').checked ? '1' : '0'
  }
  try {
    await adminApi(payload)
    closeModal('editModal')
    showToast(t('serverUpdated'))
    await loadServers()
  } catch (error) {
    showToast(error.message || t('operationFailed'))
  }
}

function hasCorrectionValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function buildInstallCommand(server, targetOs) {
  const host = currentBase()
  const secret = state.apiSecret || ''
  const collectInterval = server?.collect_interval ?? 0
  const reportInterval = server?.report_interval || 60
  const pingMode = server?.ping_mode || 'http'
  const resetDay = server?.reset_day ?? 1
  const customCt = effectivePingNode(server?.custom_ct, 'custom_ct')
  const customCu = effectivePingNode(server?.custom_cu, 'custom_cu')
  const customCm = effectivePingNode(server?.custom_cm, 'custom_cm')
  const customBd = effectivePingNode(server?.custom_bd, 'custom_bd')
  const rx = server?.rx_correction
  const tx = server?.tx_correction
  const id = server?.id || ''

  if (targetOs === 'windows') {
    const params = [
      'install',
      `-Id '${id}'`,
      `-Secret '${secret}'`,
      `-Url '${host}/update'`,
      `-CollectInterval ${collectInterval}`,
      `-ReportInterval ${reportInterval}`,
      `-PingType ${pingMode}`,
      `-ResetDay ${resetDay}`
    ]
    if (customCt) params.push(`-CtNode '${customCt}'`)
    if (customCu) params.push(`-CuNode '${customCu}'`)
    if (customCm) params.push(`-CmNode '${customCm}'`)
    if (customBd) params.push(`-BdNode '${customBd}'`)
    if (hasCorrectionValue(rx)) params.push(`-RxCorrection ${rx}`)
    if (hasCorrectionValue(tx)) params.push(`-TxCorrection ${tx}`)
    return `irm ${host}/cf-server-monitor.ps1 -OutFile cf-server-monitor.ps1; powershell -ExecutionPolicy Bypass -File .\\cf-server-monitor.ps1 ${params.join(' ')}`
  }

  const shell = targetOs === 'alpine' || targetOs === 'openwrt' ? 'sh' : 'bash'
  const sudoPrefix = targetOs === 'mac' ? 'sudo ' : ''
  const script = targetOs === 'alpine' ? 'install-alpine.sh'
    : targetOs === 'openwrt' ? 'install-openwrt.sh'
      : targetOs === 'mac' ? 'install-mac.sh'
        : 'install.sh'
  let cmd = `curl -sL ${host}/${script} | ${sudoPrefix}${shell} -s install -id=${id} -secret='${secret}' -url=${host}/update -collect_interval=${collectInterval} -interval=${reportInterval} -ping=${pingMode} -reset_day=${resetDay}`
  if (customCt) cmd += ` -ct=${customCt}`
  if (customCu) cmd += ` -cu=${customCu}`
  if (customCm) cmd += ` -cm=${customCm}`
  if (customBd) cmd += ` -bd=${customBd}`
  if (hasCorrectionValue(rx)) cmd += ` -rx_correction=${rx}`
  if (hasCorrectionValue(tx)) cmd += ` -tx_correction=${tx}`
  return cmd
}

function buildUninstallCommand(targetOs) {
  const host = currentBase()
  if (targetOs === 'windows') {
    return `irm ${host}/cf-server-monitor.ps1 -OutFile cf-server-monitor.ps1; powershell -ExecutionPolicy Bypass -File .\\cf-server-monitor.ps1 uninstall`
  }
  const shell = targetOs === 'alpine' || targetOs === 'openwrt' ? 'sh' : 'bash'
  const sudoPrefix = targetOs === 'mac' ? 'sudo ' : ''
  const script = targetOs === 'alpine' ? 'install-alpine.sh'
    : targetOs === 'openwrt' ? 'install-openwrt.sh'
      : targetOs === 'mac' ? 'install-mac.sh'
        : 'install.sh'
  return `curl -sL ${host}/${script} | ${sudoPrefix}${shell} -s uninstall`
}

function fillCopyModalFields(server) {
  const collectInterval = server?.collect_interval ?? 0
  const reportInterval = server?.report_interval || 60
  const pingMode = server?.ping_mode || 'http'
  const resetDay = server?.reset_day ?? 1
  $('copy_custom_ct').value = effectivePingNode(server?.custom_ct, 'custom_ct')
  $('copy_custom_cu').value = effectivePingNode(server?.custom_cu, 'custom_cu')
  $('copy_custom_cm').value = effectivePingNode(server?.custom_cm, 'custom_cm')
  $('copy_custom_bd').value = effectivePingNode(server?.custom_bd, 'custom_bd')
  $('copy_collect_interval').value = String(collectInterval)
  $('copy_report_interval').value = String(reportInterval)
  $('copy_ping_mode').value = String(pingMode).toUpperCase()
  $('copy_reset_day').value = String(resetDay)
  $('copy_rx_correction').value = hasCorrectionValue(server?.rx_correction) ? String(server.rx_correction) : '0'
  $('copy_tx_correction').value = hasCorrectionValue(server?.tx_correction) ? String(server.tx_correction) : '0'
  elements.installCommandText.value = buildInstallCommand(server, elements.copyTargetOs.value || 'linux')
}

async function openCopyModal(server) {
  await ensureSettingsLoaded()
  state.copyServer = server
  elements.copyModalTitle.textContent = server.name || t('installCommand')
  elements.copyTargetOs.value = 'linux'
  fillCopyModalFields(server)
  openModal('copyModal')
}

function openDeleteModal(id) {
  state.deleteId = id
  const server = state.servers.find(item => item.id === id)
  elements.deleteMessage.textContent = `${t('confirmDelete')}: ${server?.name || id}`
  elements.deleteTargetOs.value = 'linux'
  elements.uninstallCommandText.value = buildUninstallCommand('linux')
  openModal('deleteModal')
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const input = document.createElement('textarea')
    input.value = value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    input.remove()
  }
  showToast(t('copied'))
}

async function confirmDelete() {
  if (!state.deleteId) return
  try {
    await adminApi({ action: 'delete', id: state.deleteId })
    closeModal('deleteModal')
    state.deleteId = null
    showToast(t('serverDeleted'))
    await loadServers()
  } catch (error) {
    showToast(error.message || t('operationFailed'))
  }
}

function openConfirm(title, message, action) {
  state.confirmAction = action
  elements.confirmTitle.textContent = title
  elements.confirmMessage.textContent = message
  openModal('confirmModal')
}

async function runConfirmAction() {
  const action = state.confirmAction
  state.confirmAction = null
  closeModal('confirmModal')
  if (!action) return
  try {
    await action()
  } catch (error) {
    showToast(error.message || t('operationFailed'))
  }
}

async function batchDelete() {
  const ids = [...state.selected]
  if (!ids.length) {
    showToast(t('selectServers'))
    return
  }
  openConfirm(t('batchDelete'), t('confirmDeleteServers', { count: ids.length }), async () => {
    await adminApi({ action: 'batch_delete', ids })
    state.selected.clear()
    showToast(t('batchDeleted'))
    await loadServers()
  })
}

async function saveOrder(orders) {
  try {
    await adminApi({ action: 'save_order', orders })
    showToast(t('orderSaved'))
    await loadServers()
  } catch (error) {
    showToast(error.message || t('operationFailed'))
    await loadServers()
  }
}

function fillSettingsForm(settings) {
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

async function loadSettings() {
  try {
    const data = await adminApi({ action: 'get_settings' })
    state.apiSecret = data.api_secret || ''
    fillSettingsForm(data.settings || {})
  } catch (error) {
    showToast(error.message || t('loadFailed'))
  }
}

function collectSettingsPayload() {
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

async function saveSettings(event) {
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

async function sendTestNotification() {
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

function usagePercent(value, limit) {
  if (!limit) return 0
  return Math.min(100, Math.round((Number(value) || 0) / limit * 100))
}

function renderD1Usage(usage) {
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

async function queryD1Usage() {
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

function bindServerTableEvents() {
  elements.serverTableBody.addEventListener('change', event => {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    if (target.matches('[data-select]')) {
      const id = target.dataset.select
      if (target.checked) state.selected.add(id)
      else state.selected.delete(id)
      renderServers()
    }
  })

  elements.serverTableBody.addEventListener('click', event => {
    const button = event.target.closest('[data-action]')
    if (!button) return
    const id = button.dataset.id
    const server = state.servers.find(item => item.id === id)
    if (!server) return
    if (button.dataset.action === 'edit') openEditModal(server)
    if (button.dataset.action === 'copy') openCopyModal(server)
    if (button.dataset.action === 'delete') openDeleteModal(id)
  })

  elements.serverTableBody.addEventListener('dragstart', event => {
    const row = event.target.closest('tr[data-id]')
    if (!row) return
    state.dragId = row.dataset.id
    event.dataTransfer?.setData('text/plain', state.dragId)
  })

  elements.serverTableBody.addEventListener('dragover', event => {
    event.preventDefault()
  })

  elements.serverTableBody.addEventListener('drop', event => {
    event.preventDefault()
    const row = event.target.closest('tr[data-id]')
    if (!row || !state.dragId || state.dragId === row.dataset.id) return
    const orders = state.servers.map(item => item.id)
    const from = orders.indexOf(state.dragId)
    const to = orders.indexOf(row.dataset.id)
    if (from < 0 || to < 0) return
    orders.splice(to, 0, orders.splice(from, 1)[0])
    state.dragId = null
    saveOrder(orders)
  })
}

function bindEvents() {
  elements.loginForm.addEventListener('submit', submitLogin)
  elements.themeButton.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('csm-next-theme', state.theme)
    applyTheme()
  })
  elements.languageButton.addEventListener('click', () => {
    state.language = state.language === 'zh' ? 'en' : 'zh'
    localStorage.setItem('csm-next-language', state.language)
    applyTranslations()
    renderServers()
  })
  elements.logoutButton.addEventListener('click', () => {
    setJwt('')
    setAuthedView(false)
    showToast(t('logout'))
  })
  elements.sidebarToggle.addEventListener('click', () => setSidebarOpen(true))
  elements.sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false))
  elements.siteSelect.addEventListener('change', async () => {
    state.siteIndex = Number(elements.siteSelect.value) || 0
    await loadApiConfig()
    if (getJwt()) await enterApp()
    else {
      setAuthedView(false)
      await ensureLoginTurnstile()
    }
  })

  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab))
  })

  elements.serverSearch.addEventListener('input', () => {
    state.search = elements.serverSearch.value
    renderServers()
  })
  elements.addServerButton.addEventListener('click', addServer)
  elements.newServerName.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addServer()
    }
  })
  elements.batchDeleteButton.addEventListener('click', batchDelete)
  elements.selectAll.addEventListener('change', () => {
    const servers = filteredServers()
    if (elements.selectAll.checked) servers.forEach(item => state.selected.add(item.id))
    else servers.forEach(item => state.selected.delete(item.id))
    renderServers()
  })

  elements.editForm.addEventListener('submit', saveEdit)
  elements.copyTargetOs.addEventListener('change', () => {
    if (state.copyServer) fillCopyModalFields(state.copyServer)
  })
  elements.copyInstallButton.addEventListener('click', () => copyText(elements.installCommandText.value))
  elements.deleteTargetOs.addEventListener('change', () => {
    elements.uninstallCommandText.value = buildUninstallCommand(elements.deleteTargetOs.value)
  })
  elements.copyUninstallButton.addEventListener('click', () => copyText(elements.uninstallCommandText.value))
  elements.confirmDeleteButton.addEventListener('click', confirmDelete)
  elements.confirmActionButton.addEventListener('click', runConfirmAction)

  document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => closeModal(button.dataset.close))
  })

  elements.settingsForm.addEventListener('submit', saveSettings)
  elements.togglePasswordChange.addEventListener('click', () => {
    state.changePassword = !state.changePassword
    elements.passwordChangeFields.hidden = !state.changePassword
    elements.togglePasswordChange.textContent = state.changePassword ? t('cancelPasswordChange') : t('changePassword')
    if (!state.changePassword) {
      $('set_password').value = ''
      $('set_confirm_password').value = ''
    }
  })
  elements.testNotifyButton.addEventListener('click', sendTestNotification)
  elements.queryD1Button.addEventListener('click', queryD1Usage)
  elements.upgradeDbButton.addEventListener('click', () => {
    openConfirm(t('upgradeDatabase'), t('confirmUpgradeDb'), async () => {
      await postSystem('/updateDatabase')
      showToast(t('operationSuccess'))
    })
  })
  elements.clearHistoryButton.addEventListener('click', () => {
    openConfirm(t('clearHistory'), t('confirmClearHistory'), async () => {
      await postSystem('/clearHistory')
      showToast(t('operationSuccess'))
    })
  })

  bindServerTableEvents()
}

async function init() {
  applyTheme()
  applyTranslations()
  bindEvents()

  state.config = await loadConfig()
  state.sites = buildSites(state.config)
  if (state.siteIndex >= state.sites.length) state.siteIndex = 0
  elements.brandTitle.textContent = state.config.title || 'CSM-Next'
  document.title = `${t('adminPanel')} · ${state.config.title || 'CSM-Next'}`
  renderSiteSelect()
  await loadApiConfig()

  if (state.preview) {
    setJwt('preview-token')
    showToast(t('previewMode'))
    await enterApp()
    return
  }

  if (getJwt()) {
    try {
      await enterApp()
      return
    } catch {
      setJwt('')
    }
  }

  setAuthedView(false)
  await ensureLoginTurnstile().catch(() => showLoginError(t('loginTurnstile')))
}

init()
