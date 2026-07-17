import assert from 'node:assert/strict'
import test from 'node:test'

import worker from '../worker/index.js'

const env = {
  CSM_API_BASE: 'https://one.example.workers.dev, https://two.example.workers.dev/',
  CSM_SITE_TITLE: 'Test Monitor',
  CSM_BACKGROUND_IMAGE: 'https://example.com/background.jpg',
  CSM_REFRESH_INTERVAL: '30000',
  ASSETS: {
    fetch: async request => new Response(new URL(request.url).pathname, { status: 200 })
  }
}

test('Worker maps public pages and sends admin to upstream by default', async () => {
  const index = await worker.fetch(new Request('https://theme.example/'), env)
  const detail = await worker.fetch(new Request('https://theme.example/detail.html?id=node-1'), env)
  const admin = await worker.fetch(new Request('https://theme.example/admin?site=1'), env)
  const directAdmin = await worker.fetch(new Request('https://theme.example/admin.html?site=1'), env)

  assert.equal(await index.text(), '/index.html')
  assert.equal(await detail.text(), '/detail.html')
  assert.equal(admin.status, 302)
  assert.equal(admin.headers.get('location'), 'https://two.example.workers.dev/#/admin')
  assert.equal(directAdmin.status, 302)
  assert.equal(directAdmin.headers.get('location'), 'https://two.example.workers.dev/#/admin')
})

test('Worker serves the custom admin only when explicitly enabled', async () => {
  const enabledEnv = { ...env, CSM_CUSTOM_ADMIN_ENABLED: 'true' }
  const admin = await worker.fetch(new Request('https://theme.example/admin?site=1'), enabledEnv)
  const direct = await worker.fetch(new Request('https://theme.example/admin.html?site=1'), enabledEnv)
  const preview = await worker.fetch(new Request('https://theme.example/admin?preview=1'), env)

  assert.equal(admin.status, 308)
  assert.equal(admin.headers.get('location'), 'https://theme.example/admin.html?site=1')
  assert.equal(await direct.text(), '/admin.html')
  assert.equal(preview.status, 308)
  assert.equal(preview.headers.get('location'), 'https://theme.example/admin.html?preview=1')
})

test('Worker redirects legacy pages paths to root routes', async () => {
  const index = await worker.fetch(new Request('https://theme.example/pages/?preview=1'), env)
  const detail = await worker.fetch(new Request('https://theme.example/pages/detail.html?id=node-1'), env)

  assert.equal(index.status, 308)
  assert.equal(index.headers.get('location'), 'https://theme.example/?preview=1')
  assert.equal(detail.status, 308)
  assert.equal(detail.headers.get('location'), 'https://theme.example/detail.html?id=node-1')
})

test('Worker exposes runtime frontend configuration', async () => {
  const response = await worker.fetch(new Request('https://theme.example/config.json'), env)
  const config = await response.json()

  assert.deepEqual(config.apiBase, ['https://one.example.workers.dev', 'https://two.example.workers.dev'])
  assert.equal(config.title, 'Test Monitor')
  assert.equal(config.backgroundImage, 'https://example.com/background.jpg')
  assert.equal(config.refreshInterval, 30000)
  assert.equal(config.customAdminEnabled, false)
  assert.equal(response.headers.get('cache-control'), 'no-store')

  const enabledResponse = await worker.fetch(new Request('https://theme.example/config.json'), {
    ...env,
    CSM_CUSTOM_ADMIN_ENABLED: 'true'
  })
  assert.equal((await enabledResponse.json()).customAdminEnabled, true)
})

test('Worker passes static assets through and rejects writes', async () => {
  const asset = await worker.fetch(new Request('https://theme.example/assets/css/main.css'), env)
  const rejected = await worker.fetch(new Request('https://theme.example/', { method: 'POST' }), env)

  assert.equal(await asset.text(), '/assets/css/main.css')
  assert.equal(rejected.status, 405)
})
