import { translations } from './i18n.js'
import { escapeHtml } from '../shared/dom.js'
import { createTranslator } from '../shared/i18n.js'
import { resolveSiteTitle } from '../shared/title.js'
import { normalizeBase } from '../shared/url.js'

const params = new URLSearchParams(location.search)
export const state = {
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

export const $ = id => document.getElementById(id)

export const elements = {
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
  originalAdminLink: $('originalAdminLink'),
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

export const t = createTranslator(translations, () => state.language)

export function currentBase() {
  return state.sites[state.siteIndex]?.base || location.origin
}

export function truthy(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

export function showToast(message) {
  elements.toast.textContent = message
  elements.toast.classList.add('show')
  clearTimeout(showToast.timer)
  showToast.timer = setTimeout(() => elements.toast.classList.remove('show'), 2200)
}

export function showLoginError(message) {
  elements.loginError.textContent = message
  elements.loginError.hidden = !message
}

export function showSettingsError(message) {
  elements.settingsError.textContent = message
  elements.settingsError.hidden = !message
}

export function applyTheme() {
  document.documentElement.dataset.theme = state.theme
  elements.themeColor?.setAttribute('content', state.theme === 'dark' ? '#101216' : '#f8f9fb')
}

export function updatePageTitle() {
  const titles = { servers: 'nodeList', settings: 'settings', database: 'database' }
  elements.pageTitle.textContent = t(titles[state.tab] || 'nodeList')
}

export function updateBrandTitle() {
  const title = resolveSiteTitle(state.config, state.settings, state.apiConfig)
  elements.brandTitle.textContent = title
  document.title = `${t('adminPanel')} · ${title}`
}

export function openModal(id) {
  const node = $(id)
  if (node) node.hidden = false
}

export function closeModal(id) {
  const node = $(id)
  if (node) node.hidden = true
}

export function setSidebarOpen(open) {
  document.querySelector('.admin-app')?.classList.toggle('sidebar-open', open)
  elements.sidebarBackdrop.hidden = !open
}

export function setAuthedView(authed) {
  elements.loginView.hidden = authed
  elements.appView.hidden = !authed
}

export function applyTranslations() {
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
  updatePageTitle()
  if (state.changePassword) elements.togglePasswordChange.textContent = t('cancelPasswordChange')
}

export async function loadConfig() {
  try {
    const response = await fetch('./config.json', { cache: 'no-store' })
    if (!response.ok) throw new Error(`config.json: ${response.status}`)
    return await response.json()
  } catch {
    return { apiBase: [], title: 'CF-Server-Monitor', backgroundImage: '' }
  }
}

export function buildSites(config) {
  const list = Array.isArray(config.apiBase) ? config.apiBase : [config.apiBase]
  const bases = list.map(normalizeBase).filter(Boolean)
  if (!bases.length) bases.push(location.origin)
  return bases.map((base, index) => ({ base, index, label: new URL(base).host || base }))
}

export function renderSiteSelect() {
  if (state.sites.length <= 1) {
    elements.siteSelect.hidden = true
    return
  }
  elements.siteSelect.hidden = false
  elements.siteSelect.innerHTML = state.sites.map((site, index) => (
    `<option value="${index}" ${index === state.siteIndex ? 'selected' : ''}>${escapeHtml(site.label)}</option>`
  )).join('')
}

export async function copyText(value) {
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

export function openConfirm(title, message, action) {
  state.confirmAction = action
  elements.confirmTitle.textContent = title
  elements.confirmMessage.textContent = message
  openModal('confirmModal')
}

export async function runConfirmAction() {
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
