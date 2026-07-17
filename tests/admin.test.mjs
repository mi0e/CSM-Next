import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function readAdminSources() {
  const entry = await readFile(resolve(root, 'src/assets/js/admin.js'), 'utf8')
  const dir = resolve(root, 'src/assets/js/admin')
  const files = await readdir(dir)
  const modules = await Promise.all(
    files.filter(name => name.endsWith('.js')).map(name => readFile(join(dir, name), 'utf8'))
  )
  return [entry, ...modules].join('\n')
}

test('admin page shell exposes login, nav tabs and server table', async () => {
  const html = await readFile(resolve(root, 'src/admin.html'), 'utf8')
  assert.match(html, /id="loginView"/)
  assert.match(html, /id="appView"/)
  assert.match(html, /data-tab="servers"/)
  assert.match(html, /data-tab="settings"/)
  assert.match(html, /data-tab="database"/)
  assert.match(html, /id="serverTableBody"/)
  assert.match(html, /id="settingsForm"/)
  assert.match(html, /id="upgradeDbButton"/)
  assert.match(html, /id="topbarHomeLink"/)
  assert.match(html, /data-i18n="backHome"/)
  assert.match(html, /assets\/js\/admin\.js/)
  assert.match(html, /assets\/css\/admin\.css/)
})

test('home and admin footers link to the upstream and theme repositories', async () => {
  const home = await readFile(resolve(root, 'src/index.html'), 'utf8')
  const admin = await readFile(resolve(root, 'src/admin.html'), 'utf8')
  for (const html of [home, admin]) {
    assert.match(html, /href="https:\/\/github\.com\/huilang-me\/CF-Server-Monitor"/)
    assert.match(html, /href="https:\/\/github\.com\/mi0e\/CSM-Next"/)
    assert.match(html, /target="_blank" rel="noopener noreferrer"/)
  }
  assert.match(home, /id="versionText"/)
  assert.match(admin, /class="admin-page-footer"/)
})

test('home toolbar opens theme customization and keeps authorization rightmost', async () => {
  const home = await readFile(resolve(root, 'src/index.html'), 'utf8')
  const settingsIndex = home.indexOf('id="themeSettingsButton"')
  const authIndex = home.indexOf('id="authButton"')
  assert.ok(settingsIndex > 0 && authIndex > settingsIndex)
  assert.doesNotMatch(home, /id="adminLink"/)
  assert.match(home, /id="themeDrawer"/)
  assert.match(home, /id="themeBackgroundUpload"[^>]+type="file"/)
  assert.match(home, /id="themePanelOpacity"[^>]+type="range"/)
  assert.match(home, /id="themeCustomCss"/)
  assert.doesNotMatch(home, /id="themeOriginalAdminLink"/)
  assert.doesNotMatch(home, /class="theme-drawer-footer"/)
})

test('top action bars use locally inlined Lucide icons', async () => {
  const home = await readFile(resolve(root, 'src/index.html'), 'utf8')
  const detail = await readFile(resolve(root, 'src/detail.html'), 'utf8')
  const admin = await readFile(resolve(root, 'src/admin.html'), 'utf8')
  for (const name of ['refresh-cw', 'sun-moon', 'languages', 'palette', 'circle-user-round']) {
    assert.match(home, new RegExp(`data-lucide="${name}"`))
  }
  for (const name of ['layout-dashboard', 'refresh-cw', 'sun-moon', 'languages', 'settings']) {
    assert.match(detail, new RegExp(`data-lucide="${name}"`))
  }
  for (const name of ['menu', 'sun-moon', 'languages']) {
    assert.match(admin, new RegExp(`data-lucide="${name}"`))
  }
  assert.doesNotMatch(home, /<span>文<\/span><small>A<\/small>/)
})

test('admin modules cover core admin API actions', async () => {
  const js = await readAdminSources()
  for (const action of [
    'login', 'list', 'add', 'edit', 'delete', 'batch_delete', 'save_order',
    'get_settings', 'save_settings', 'd1_usage', 'send_test_notification'
  ]) {
    assert.match(js, new RegExp(`action:\\s*'${action}'|action:\\s*"${action}"|action === '${action}'`))
  }
  assert.match(js, /\/updateDatabase/)
  assert.match(js, /\/clearHistory/)
  assert.match(js, /from '\.\/shared\/auth\.js'|from '\.\.\/shared\/auth\.js'/)
  assert.match(js, /getJwt\(currentBase\(\)\)/)
  assert.match(js, /install\.sh/)
  const auth = await readFile(resolve(root, 'src/assets/js/shared/auth.js'), 'utf8')
  assert.match(auth, /csm-next-jwt/)
})

test('admin is split into domain modules', async () => {
  const entry = await readFile(resolve(root, 'src/assets/js/admin.js'), 'utf8')
  assert.match(entry, /from '\.\/admin\/context\.js'/)
  assert.match(entry, /from '\.\/admin\/api\.js'/)
  assert.match(entry, /from '\.\/admin\/servers\.js'/)
  assert.match(entry, /from '\.\/admin\/settings\.js'/)
  const names = await readdir(resolve(root, 'src/assets/js/admin'))
  for (const name of ['i18n.js', 'context.js', 'api.js', 'contract.js', 'servers.js', 'settings.js']) {
    assert.ok(names.includes(name), `missing admin/${name}`)
  }
})

test('public pages resolve admin entry through the shared feature flag', async () => {
  const dashboard = await readFile(resolve(root, 'src/assets/js/dashboard.js'), 'utf8')
  const detail = await readFile(resolve(root, 'src/assets/js/detail.js'), 'utf8')
  assert.match(dashboard, /from '\.\/shared\/admin\.js'/)
  assert.match(detail, /from '\.\/shared\/admin\.js'/)
  assert.match(dashboard, /resolveAdminUrl\(/)
  assert.match(detail, /resolveAdminUrl\(/)
})

test('dashboard supports site-scoped authorization independently from admin UI', async () => {
  const dashboard = await readFile(resolve(root, 'src/assets/js/dashboard.js'), 'utf8')
  const html = await readFile(resolve(root, 'src/index.html'), 'utf8')
  assert.match(dashboard, /from '\.\/shared\/auth\.js'/)
  assert.match(dashboard, /adminUrl\(siteIndex/)
  assert.match(dashboard, /getJwt\(site\?\.base/)
  assert.match(dashboard, /loginWithCredentials\(/)
  assert.match(dashboard, /setJwt\('', site\.base\)/)
  assert.match(html, /id="authButton"/)
  assert.match(html, /id="loginModal"/)
  assert.doesNotMatch(dashboard, /localStorage\.getItem\('jwt_token'\)/)
})

test('custom admin page redirects itself when the feature is disabled', async () => {
  const admin = await readFile(resolve(root, 'src/assets/js/admin.js'), 'utf8')
  assert.match(admin, /isCustomAdminEnabled\(state\.config\)/)
  assert.match(admin, /location\.replace\(resolveAdminUrl/)
  assert.match(admin, /originalAdminUrl\(currentBase\(\)/)
})

test('admin install commands still resolve node and global ping hosts', async () => {
  const servers = await readFile(resolve(root, 'src/assets/js/admin/servers.js'), 'utf8')
  assert.match(servers, /from '\.\.\/shared\/ping\.js'/)
  assert.match(servers, /function effectivePingNode/)
  assert.match(servers, /effectivePingNode\(server\?\.custom_ct, 'custom_ct'\)/)
})

test('admin edit payload matches the current upstream API contract', async () => {
  const { createServerEditPayload } = await import('../src/assets/js/admin/contract.js')
  const payload = createServerEditPayload({
    id: 'server-id',
    name: '  Edge 1  ',
    server_group: '',
    price: '¥10/月',
    expire_date: '2026-12-31',
    bandwidth: '1 Gbps',
    traffic_limit: '1024',
    traffic_calc_type: 'total',
    reset_day: '15',
    report_interval: '60',
    ping_mode: 'tcp',
    is_hidden: true,
    tags: 'ignored',
    note: 'ignored',
    collect_interval: 5,
    custom_ct: 'ignored.example',
    rx_correction: 1,
    offline_notify_disabled: true
  })

  assert.deepEqual(Object.keys(payload), [
    'action', 'id', 'name', 'server_group', 'price', 'expire_date',
    'bandwidth', 'traffic_limit', 'traffic_calc_type', 'reset_day',
    'report_interval', 'ping_mode', 'is_hidden'
  ])
  assert.equal(payload.name, 'Edge 1')
  assert.equal(payload.server_group, 'Default')
  assert.equal(payload.bandwidth, '1 Gbps')
  assert.equal(payload.reset_day, 15)
  assert.equal(payload.report_interval, 60)
  assert.equal(payload.is_hidden, '1')
})

test('admin edit form only exposes fields persisted by upstream', async () => {
  const html = await readFile(resolve(root, 'src/admin.html'), 'utf8')
  const servers = await readFile(resolve(root, 'src/assets/js/admin/servers.js'), 'utf8')
  assert.match(html, /id="edit_bandwidth"/)
  assert.match(servers, /\$\('edit_bandwidth'\)\.value = server\.bandwidth/)
  assert.match(servers, /bandwidth: \$\('edit_bandwidth'\)\.value/)
  for (const id of [
    'edit_tags', 'edit_note', 'edit_collect_interval', 'edit_custom_ct',
    'edit_custom_cu', 'edit_custom_cm', 'edit_custom_bd',
    'edit_rx_correction', 'edit_tx_correction', 'edit_offline_notify_disabled'
  ]) {
    assert.doesNotMatch(html, new RegExp(`id="${id}"`))
  }
})
