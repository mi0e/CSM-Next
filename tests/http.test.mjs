import assert from 'node:assert/strict'
import test from 'node:test'

const { unwrap, fetchJson, readJsonSafe } = await import('../src/assets/js/shared/http.js')

test('unwrap merges nested data envelope', () => {
  assert.deepEqual(unwrap({ success: true, data: { token: 'abc', ok: 1 } }), {
    success: true,
    data: { token: 'abc', ok: 1 },
    token: 'abc',
    ok: 1
  })
  assert.equal(unwrap(null), null)
  assert.deepEqual(unwrap({ a: 1 }), { a: 1 })
  assert.deepEqual(unwrap({ data: [1, 2] }), { data: [1, 2] })
})

test('readJsonSafe returns null on invalid json body', async () => {
  const bad = { json: async () => { throw new Error('nope') } }
  assert.equal(await readJsonSafe(bad), null)
  const good = { json: async () => ({ ok: true }) }
  assert.deepEqual(await readJsonSafe(good), { ok: true })
})

test('fetchJson returns response and parsed data', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ hello: 'world' })
  })
  try {
    const { response, data } = await fetchJson('https://example.test/api')
    assert.equal(response.status, 200)
    assert.deepEqual(data, { hello: 'world' })
  } finally {
    globalThis.fetch = original
  }
})

test('timeout aborts both a stalled fetch and a stalled response body', async () => {
  const original = globalThis.fetch
  try {
    let signal
    globalThis.fetch = (_url, options) => { signal = options.signal; return new Promise(() => {}) }
    await assert.rejects(fetchJson('https://example.test', { timeoutMs: 10 }), { name: 'TimeoutError' })
    assert.equal(signal.aborted, true)
    globalThis.fetch = async () => ({ json: () => new Promise(() => {}) })
    await assert.rejects(fetchJson('https://example.test', { timeoutMs: 10 }), { name: 'TimeoutError' })
  } finally { globalThis.fetch = original }
})

test('caller cancellation is preserved and longer request budgets are configurable', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = () => new Promise(() => {})
    const controller = new AbortController()
    const request = fetchJson('https://example.test', { signal: controller.signal, timeoutMs: 0 })
    controller.abort()
    await assert.rejects(request, { name: 'AbortError' })
  } finally { globalThis.fetch = original }
})
