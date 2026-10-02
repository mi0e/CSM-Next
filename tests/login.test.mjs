import assert from 'node:assert/strict'
import test from 'node:test'

class MemoryStorage {
  constructor() { this.map = new Map() }
  getItem(key) { return this.map.get(key) ?? null }
  setItem(key, value) { this.map.set(String(key), String(value)) }
  removeItem(key) { this.map.delete(String(key)) }
  key(index) { return [...this.map.keys()][index] ?? null }
  get length() { return this.map.size }
}

globalThis.localStorage = new MemoryStorage()
globalThis.location = { origin: 'https://theme.example', href: 'https://theme.example/' }
globalThis.window = globalThis

const { getJwt } = await import('../src/assets/js/shared/auth.js')
const { loginTurnstileRequired, loginWithCredentials, loadTurnstileScript } = await import('../src/assets/js/shared/login.js')

test('login Turnstile follows either upstream login flag', () => {
  assert.equal(loginTurnstileRequired({}), false)
  assert.equal(loginTurnstileRequired({ turnstile_login_enabled: 'true' }), true)
  assert.equal(loginTurnstileRequired({ turnstile_enabled: true }), true)
})

test('login sends the upstream contract and stores a site-scoped token', async () => {
  let request
  globalThis.fetch = async (url, options) => {
    request = { url, options }
    return new Response(JSON.stringify({ data: { token: 'site-token' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const base = 'https://api.example.workers.dev'
  const token = await loginWithCredentials({
    base,
    username: 'admin',
    password: 'secret',
    turnstileToken: 'turnstile-token'
  })

  assert.equal(token, 'site-token')
  assert.equal(request.url, `${base}/admin/api`)
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.headers.get('X-Turnstile-Token'), 'turnstile-token')
  assert.deepEqual(JSON.parse(request.options.body), { action: 'login', username: 'admin', password: 'secret' })
  assert.equal(getJwt(base), 'site-token')
})

test('Turnstile load timeout removes the stalled script and allows retry', async () => {
  let script = null, appended = 0
  globalThis.document = {
    querySelector: () => script,
    head: { append: node => { script = node; appended += 1 } },
    createElement: () => ({ dataset: {}, listeners: new Map(),
      addEventListener(key, fn) { this.listeners.set(key, fn) },
      removeEventListener(key) { this.listeners.delete(key) },
      remove() { script = null } })
  }
  await assert.rejects(loadTurnstileScript({ timeoutMs: 10 }), /timed out/)
  assert.equal(script, null)
  const retry = loadTurnstileScript({ timeoutMs: 100 })
  globalThis.turnstile = { render() {} }
  script.listeners.get('load')()
  await retry
  assert.equal(appended, 2)
  delete globalThis.turnstile
})
