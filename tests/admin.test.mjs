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
  for (const name of ['i18n.js', 'context.js', 'api.js', 'servers.js', 'settings.js']) {
    assert.ok(names.includes(name), `missing admin/${name}`)
  }
})

test('public pages point admin entry to theme admin.html', async () => {
  const dashboard = await readFile(resolve(root, 'src/assets/js/dashboard.js'), 'utf8')
  const detail = await readFile(resolve(root, 'src/assets/js/detail.js'), 'utf8')
  assert.match(dashboard, /admin\.html/)
  assert.doesNotMatch(dashboard, /#\/admin/)
  assert.match(detail, /admin\.html/)
  assert.doesNotMatch(detail, /#\/admin/)
})

test('dashboard admin link passes site query and uses shared getJwt', async () => {
  const dashboard = await readFile(resolve(root, 'src/assets/js/dashboard.js'), 'utf8')
  assert.match(dashboard, /from '\.\/shared\/auth\.js'/)
  assert.match(dashboard, /adminUrl\(siteIndex/)
  assert.match(dashboard, /searchParams\.set\('site'/)
  assert.match(dashboard, /getJwt\(site\?\.base/)
  assert.doesNotMatch(dashboard, /localStorage\.getItem\('jwt_token'\)/)
})

test('admin edit keeps node-level ping fields separate from effective install hosts', async () => {
  const servers = await readFile(resolve(root, 'src/assets/js/admin/servers.js'), 'utf8')
  assert.match(servers, /from '\.\.\/shared\/ping\.js'/)
  assert.match(servers, /export \{ nodePingField \}|nodePingField/)
  assert.match(servers, /function effectivePingNode/)
  assert.match(servers, /custom_ct: nodePingField\(/)
  assert.match(servers, /\$\('edit_custom_ct'\)\.value = nodePingField/)
})
