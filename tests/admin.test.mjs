import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
  assert.match(html, /assets\/js\/admin\.js/)
  assert.match(html, /assets\/css\/admin\.css/)
})

test('admin script covers core admin API actions', async () => {
  const js = await readFile(resolve(root, 'src/assets/js/admin.js'), 'utf8')
  for (const action of [
    'login', 'list', 'add', 'edit', 'delete', 'batch_delete', 'save_order',
    'get_settings', 'save_settings', 'd1_usage', 'send_test_notification'
  ]) {
    assert.match(js, new RegExp(`action:\\s*'${action}'|action:\\s*"${action}"|action === '${action}'`))
  }
  assert.match(js, /\/updateDatabase/)
  assert.match(js, /\/clearHistory/)
  assert.match(js, /csm-next-jwt/)
  assert.match(js, /install\.sh/)
})

test('public pages point admin entry to theme admin.html', async () => {
  const dashboard = await readFile(resolve(root, 'src/assets/js/dashboard.js'), 'utf8')
  const detail = await readFile(resolve(root, 'src/assets/js/detail.js'), 'utf8')
  assert.match(dashboard, /admin\.html/)
  assert.doesNotMatch(dashboard, /#\/admin/)
  assert.match(detail, /admin\.html/)
  assert.doesNotMatch(detail, /#\/admin/)
})
