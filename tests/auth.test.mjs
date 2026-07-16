import assert from 'node:assert/strict'
import test from 'node:test'

class MemoryStorage {
  constructor() {
    this.map = new Map()
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null
  }

  setItem(key, value) {
    this.map.set(String(key), String(value))
  }

  removeItem(key) {
    this.map.delete(String(key))
  }

  key(index) {
    return [...this.map.keys()][index] ?? null
  }

  get length() {
    return this.map.size
  }

  clear() {
    this.map.clear()
  }
}

globalThis.localStorage = new MemoryStorage()
globalThis.location = {
  origin: 'https://theme.example',
  href: 'https://theme.example/'
}

const { getJwt, setJwt, jwtStorageKey, isLoggedIn } = await import('../src/assets/js/shared/auth.js')

const siteA = 'https://api-a.example.workers.dev'
const siteB = 'https://api-b.example.workers.dev'

test('jwt keys are site-scoped', () => {
  localStorage.clear()
  assert.equal(jwtStorageKey(siteA), `csm-next-jwt:${siteA}`)
  assert.notEqual(jwtStorageKey(siteA), jwtStorageKey(siteB))
})

test('setJwt/getJwt keep tokens isolated per apiBase', () => {
  localStorage.clear()
  setJwt('token-a', siteA)
  setJwt('token-b', siteB)
  assert.equal(getJwt(siteA), 'token-a')
  assert.equal(getJwt(siteB), 'token-b')
  assert.equal(isLoggedIn(siteA), true)
})

test('getJwt does not cross-use another site token via legacy key', () => {
  localStorage.clear()
  setJwt('token-a', siteA)
  // Site B has no scoped token; must not fall back to site A's mirrored jwt_token.
  assert.equal(getJwt(siteB), '')
})

test('legacy jwt_token is used only when no other scoped tokens exist', () => {
  localStorage.clear()
  localStorage.setItem('jwt_token', 'legacy-only')
  assert.equal(getJwt(siteA), 'legacy-only')

  setJwt('scoped-b', siteB)
  assert.equal(getJwt(siteA), '')
  assert.equal(getJwt(siteB), 'scoped-b')
})

test('clearing one site keeps other site tokens and drops legacy when none remain', () => {
  localStorage.clear()
  setJwt('token-a', siteA)
  setJwt('token-b', siteB)
  setJwt('', siteA)
  assert.equal(getJwt(siteA), '')
  assert.equal(getJwt(siteB), 'token-b')
  assert.equal(localStorage.getItem('jwt_token'), 'token-b')

  setJwt('', siteB)
  assert.equal(getJwt(siteB), '')
  assert.equal(localStorage.getItem('jwt_token'), null)
})
