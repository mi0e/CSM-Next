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

test('Worker maps public page routes to source HTML', async () => {
  const index = await worker.fetch(new Request('https://theme.example/'), env)
  const detail = await worker.fetch(new Request('https://theme.example/detail.html?id=node-1'), env)

  assert.equal(await index.text(), '/pages/index.html')
  assert.equal(await detail.text(), '/pages/detail.html')
})

test('Worker exposes runtime frontend configuration', async () => {
  const response = await worker.fetch(new Request('https://theme.example/config.json'), env)
  const config = await response.json()

  assert.deepEqual(config.apiBase, ['https://one.example.workers.dev', 'https://two.example.workers.dev'])
  assert.equal(config.title, 'Test Monitor')
  assert.equal(config.backgroundImage, 'https://example.com/background.jpg')
  assert.equal(config.refreshInterval, 30000)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('Worker passes static assets through and rejects writes', async () => {
  const asset = await worker.fetch(new Request('https://theme.example/assets/css/main.css'), env)
  const rejected = await worker.fetch(new Request('https://theme.example/', { method: 'POST' }), env)

  assert.equal(await asset.text(), '/assets/css/main.css')
  assert.equal(rejected.status, 405)
})
