import { getJwt, setJwt } from './shared/auth.js'
import { isCustomAdminEnabled, originalAdminUrl, resolveAdminUrl } from './shared/admin.js'
import {
  state, elements, $, t, currentBase, showToast, showLoginError,
  applyTheme, applyTranslations, setSidebarOpen, setAuthedView,
  updatePageTitle, updateBrandTitle, closeModal, renderSiteSelect, buildSites, loadConfig,
  openConfirm, runConfirmAction, copyText
} from './admin/context.js'
import {
  postSystem, loadApiConfig, submitLogin, ensureLoginTurnstile, hooks
} from './admin/api.js'
import {
  loadServers, renderServers, filteredServers, addServer, saveEdit,
  fillCopyModalFields, buildUninstallCommand, confirmDelete, batchDelete,
  bindServerTableEvents
} from './admin/servers.js'
import {
  loadSettings, saveSettings, sendTestNotification, queryD1Usage
} from './admin/settings.js'

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

async function enterApp() {
  setAuthedView(true)
  applyTranslations()
  await Promise.all([loadServers(), loadSettings()])
}

hooks.enterApp = enterApp

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
    setJwt('', currentBase())
    setAuthedView(false)
    showToast(t('logout'))
  })
  elements.sidebarToggle.addEventListener('click', () => setSidebarOpen(true))
  elements.sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false))
  elements.siteSelect.addEventListener('change', async () => {
    state.siteIndex = Number(elements.siteSelect.value) || 0
    updateOriginalAdminLink()
    await loadApiConfig()
    if (getJwt(currentBase())) await enterApp()
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

function applyHomeLinks() {
  const href = state.preview ? './?preview=1' : './'
  document.querySelectorAll('a[href="./"], a[href="./?preview=1"], #topbarHomeLink').forEach(link => {
    link.href = href
  })
}

function updateOriginalAdminLink() {
  elements.originalAdminLink.href = originalAdminUrl(currentBase(), location.href)
}

async function init() {
  applyTheme()
  applyTranslations()

  state.config = await loadConfig()
  state.sites = buildSites(state.config)
  if (state.siteIndex >= state.sites.length) state.siteIndex = 0
  if (!state.preview && !isCustomAdminEnabled(state.config)) {
    location.replace(resolveAdminUrl(state.config, {
      siteBase: currentBase(),
      siteIndex: state.siteIndex,
      pageUrl: location.href
    }))
    return
  }
  bindEvents()
  updateBrandTitle()
  applyHomeLinks()
  updateOriginalAdminLink()
  renderSiteSelect()
  await loadApiConfig()

  if (state.preview) {
    setJwt('preview-token', currentBase())
    showToast(t('previewMode'))
    await enterApp()
    return
  }

  if (getJwt(currentBase())) {
    try {
      await enterApp()
      return
    } catch {
      setJwt('', currentBase())
    }
  }

  setAuthedView(false)
  await ensureLoginTurnstile().catch(() => showLoginError(t('loginTurnstile')))
}

init()
