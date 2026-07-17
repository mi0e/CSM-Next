import assert from 'node:assert/strict'
import test from 'node:test'

import worker from '../worker/index.js'

class MemoryKV {
  constructor() { this.values = new Map() }
  async get(key, type) {
    const record = this.values.get(key)
    if (record == null) return null
    return type === 'json' ? JSON.parse(record.value) : record.value
  }
  async getWithMetadata(key) {
    const record = this.values.get(key)
    return record ? { value: record.value, metadata: record.metadata || null } : { value: null, metadata: null }
  }
  async put(key, value, options = {}) {
    this.values.set(key, {
      value: value instanceof ArrayBuffer ? value.slice(0) : String(value),
      metadata: options.metadata || null
    })
  }
  async delete(key) { this.values.delete(key) }
}

const env = {
  CSM_API_BASE: 'https://one.example.workers.dev, https://two.example.workers.dev/',
  CSM_SITE_TITLE: 'Test Monitor',
  CSM_BACKGROUND_IMAGE: 'https://example.com/background.jpg',
  CSM_REFRESH_INTERVAL: '30000',
  THEME_SETTINGS: new MemoryKV(),
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
  assert.match(index.headers.get('content-security-policy'), /script-src 'self' https:\/\/challenges\.cloudflare\.com/)
  assert.doesNotMatch(index.headers.get('content-security-policy'), /script-src[^;]*'unsafe-inline'/)
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

test('Worker exposes public theme settings with environment fallbacks', async () => {
  const response = await worker.fetch(new Request('https://theme.example/api/theme-settings'), env)
  const data = await response.json()

  assert.equal(response.status, 200)
  assert.equal(data.success, true)
  assert.equal(data.settings.backgroundImage, 'https://example.com/background.jpg')
  assert.equal(data.settings.panelOpacity, 1)
  assert.equal(data.settings.customCss, '')
  assert.equal(data.storage, 'kv')
})

test('Worker requires a valid upstream login before writing theme settings', async () => {
  const unauthorized = await worker.fetch(new Request('https://theme.example/api/theme-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ panelOpacity: 0.75 })
  }), env)
  assert.equal(unauthorized.status, 401)

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'malformedRequest' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  })
  const unrelatedBadRequest = await worker.fetch(new Request('https://theme.example/api/theme-settings', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer rejected-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ panelOpacity: 0.75 })
  }), env)
  assert.equal(unrelatedBadRequest.status, 401)

  let verificationRequest
  globalThis.fetch = async (url, options) => {
    verificationRequest = { url, options }
    return new Response(JSON.stringify({ error: 'unknownAction' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  try {
    const saved = await worker.fetch(new Request('https://theme.example/api/theme-settings?site=1', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer site-two-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        backgroundImage: 'https://cdn.example.com/theme.webp',
        panelOpacity: 0.7,
        customCss: '.brand-title { letter-spacing: .08em; }'
      })
    }), env)
    const body = await saved.json()

    assert.equal(saved.status, 200)
    assert.equal(body.settings.panelOpacity, 0.7)
    assert.equal(verificationRequest.url, 'https://two.example.workers.dev/admin/api')
    assert.equal(verificationRequest.options.headers.Authorization, 'Bearer site-two-token')
    assert.deepEqual(JSON.parse(verificationRequest.options.body), { action: '__csm_theme_verify__' })

    const loaded = await worker.fetch(new Request('https://theme.example/api/theme-settings'), env)
    const loadedBody = await loaded.json()
    assert.equal(loadedBody.settings.backgroundImage, 'https://cdn.example.com/theme.webp')
    assert.equal(loadedBody.settings.customCss, '.brand-title { letter-spacing: .08em; }')

    const unsafe = await worker.fetch(new Request('https://theme.example/api/theme-settings', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer site-one-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ customCss: '@import "https://evil.example/style.css";' })
    }), env)
    assert.equal(unsafe.status, 400)
    assert.equal((await unsafe.json()).code, 'unsafe_custom_css')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Worker stores a small verified background image in the same KV namespace', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'unknownAction' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  })
  try {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    const uploaded = await worker.fetch(new Request('https://theme.example/api/theme-background', {
      method: 'PUT',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'image/png' },
      body: png
    }), env)
    const uploadedBody = await uploaded.json()
    assert.equal(uploaded.status, 200)
    assert.match(uploadedBody.url, /^https:\/\/theme\.example\/api\/theme-background\?v=\d+$/)

    const image = await worker.fetch(new Request(uploadedBody.url), env)
    assert.equal(image.status, 200)
    assert.equal(image.headers.get('content-type'), 'image/png')
    assert.deepEqual(new Uint8Array(await image.arrayBuffer()), png)

    const invalid = await worker.fetch(new Request('https://theme.example/api/theme-background', {
      method: 'PUT',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'image/png' },
      body: new Uint8Array([1, 2, 3, 4])
    }), env)
    assert.equal(invalid.status, 400)
    assert.equal((await invalid.json()).code, 'invalid_background_file')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Worker passes static assets through and rejects writes', async () => {
  const asset = await worker.fetch(new Request('https://theme.example/assets/css/main.css'), env)
  const rejected = await worker.fetch(new Request('https://theme.example/', { method: 'POST' }), env)

  assert.equal(await asset.text(), '/assets/css/main.css')
  assert.equal(rejected.status, 405)
})
