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
