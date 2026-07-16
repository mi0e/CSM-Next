import { escapeHtml } from '../shared/dom.js'
import { effectivePingNode as resolvePingNode, nodePingField } from '../shared/ping.js'
import {
  state, elements, $, t, currentBase, truthy, showToast,
  openModal, closeModal, openConfirm, copyText
} from './context.js'
import { adminApi } from './api.js'
import { loadSettings } from './settings.js'

export { nodePingField }

/** Effective host: node field, else global settings for that key. */
export function effectivePingNode(serverValue, settingsKey) {
  return resolvePingNode(serverValue, state.settings?.[settingsKey])
}

export function splitTags(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean)
}

export function formatTrafficLimit(value) {
  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  if (amount >= 1024) return `${Number((amount / 1024).toFixed(amount >= 10240 ? 0 : 1))} TB`
  return `${amount} GB`
}

export function filteredServers() {
  const query = state.search.trim().toLowerCase()
  if (!query) return state.servers
  return state.servers.filter(server => {
    const haystack = [server.name, server.server_group, server.tags, server.note, server.price]
      .map(item => String(item || '').toLowerCase())
      .join(' ')
    return haystack.includes(query)
  })
}

export function renderServers() {
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

export async function loadServers() {
  try {
    const data = await adminApi({ action: 'list' })
    state.servers = Array.isArray(data.servers) ? data.servers : []
    state.selected = new Set([...state.selected].filter(id => state.servers.some(item => item.id === id)))
    renderServers()
  } catch (error) {
    showToast(error.message || t('loadFailed'))
  }
}

export async function addServer() {
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

export async function ensureSettingsLoaded() {
  if (state.settings && Object.keys(state.settings).length) return
  await loadSettings()
}

export async function openEditModal(server) {
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
  // Inputs store node-level only; placeholders show global inheritance hint.
  $('edit_custom_ct').value = nodePingField(server.custom_ct)
  $('edit_custom_cu').value = nodePingField(server.custom_cu)
  $('edit_custom_cm').value = nodePingField(server.custom_cm)
  $('edit_custom_bd').value = nodePingField(server.custom_bd)
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

export async function saveEdit(event) {
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
    custom_ct: nodePingField($('edit_custom_ct').value),
    custom_cu: nodePingField($('edit_custom_cu').value),
    custom_cm: nodePingField($('edit_custom_cm').value),
    custom_bd: nodePingField($('edit_custom_bd').value),
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

export function hasCorrectionValue(value) {
  return value !== null && value !== undefined && value !== ''
}

export function buildInstallCommand(server, targetOs) {
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

export function buildUninstallCommand(targetOs) {
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

export function fillCopyModalFields(server) {
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

export async function openCopyModal(server) {
  await ensureSettingsLoaded()
  state.copyServer = server
  elements.copyModalTitle.textContent = server.name || t('installCommand')
  elements.copyTargetOs.value = 'linux'
  fillCopyModalFields(server)
  openModal('copyModal')
}

export function openDeleteModal(id) {
  state.deleteId = id
  const server = state.servers.find(item => item.id === id)
  elements.deleteMessage.textContent = `${t('confirmDelete')}: ${server?.name || id}`
  elements.deleteTargetOs.value = 'linux'
  elements.uninstallCommandText.value = buildUninstallCommand('linux')
  openModal('deleteModal')
}


export async function confirmDelete() {
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

export async function batchDelete() {
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

export async function saveOrder(orders) {
  try {
    await adminApi({ action: 'save_order', orders })
    showToast(t('orderSaved'))
    await loadServers()
  } catch (error) {
    showToast(error.message || t('operationFailed'))
    await loadServers()
  }
}

export function bindServerTableEvents() {
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

