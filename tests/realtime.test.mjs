import assert from 'node:assert/strict'
import test from 'node:test'
import { createRealtime, realtimeUrl } from '../src/assets/js/shared/realtime.js'
import { getJwt, setJwt } from '../src/assets/js/shared/auth.js'

function fixture(options = {}) {
  const sockets = [], timers = new Map(), events = new Map(), states = [], pauses = []
  let id = 0
  const page = { hidden: false, addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key) }
  class Socket {
    handlers = new Map()
    sent = []
    constructor(url) { this.url = url; sockets.push(this) }
    addEventListener(key, fn) { this.handlers.set(key, fn) }
    emit(key, data = {}) { this.handlers.get(key)?.(data) }
    send(value) { this.sent.push(JSON.parse(value)) }
    close() { this.closed = true; this.emit('close', { code: 1000 }) }
  }
  const client = createRealtime({
    url: () => 'wss://api.example/api/ws?subscribe=all',
    subscribe: () => ({ type: 'subscribe', scope: 'all', ids: ['node-1'] }),
    onMessage: () => {}, onState: value => states.push(value), onPause: reason => pauses.push(reason),
    page, Socket, setTimer: (fn, ms) => { timers.set(++id, { fn, ms }); return id }, clearTimer: key => timers.delete(key),
    ...options
  })
  const run = ms => {
    const [key, timer] = [...timers].find(([, value]) => value.ms === ms) || []
    assert.ok(timer, `Missing timer ${ms}`)
    timers.delete(key); timer.fn()
  }
  const visibility = async hidden => { page.hidden = hidden; events.get('visibilitychange')?.(); await Promise.resolve(); await Promise.resolve() }
  return { client, sockets, timers, states, pauses, run, visibility, events }
}

test('secure WebSocket uses the matching site token and retains subscription', () => {
  const values = new Map()
  globalThis.location = { origin: 'https://theme.example', href: 'https://theme.example/' }
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value),
    key: index => [...values.keys()][index], get length() { return values.size } }
  setJwt('token-a', 'https://a.example')
  setJwt('token-b', 'https://b.example')
  const url = new URL(realtimeUrl('https://a.example', 'node-1', getJwt('https://a.example')))
  assert.equal(url.protocol, 'wss:')
  assert.equal(url.searchParams.get('token'), 'token-a')
  assert.equal(url.searchParams.get('subscribe'), 'node-1')
  assert.equal(new URL(realtimeUrl('https://c.example', 'all', getJwt('https://c.example'))).searchParams.has('token'), false)
  assert.equal(new URL(realtimeUrl('http://public.example', 'all', 'secret')).searchParams.has('token'), false)
})

test('hiding stops the connection; showing refetches before resubscribing', async () => {
  let refreshed = 0
  const f = fixture({ beforeResume: async () => { refreshed += 1 } })
  f.sockets[0].emit('open')
  assert.deepEqual(f.sockets[0].sent[0].ids, ['node-1'])
  await f.visibility(true)
  assert.equal(f.sockets[0].closed, true)
  assert.equal(f.timers.size, 0)
  await f.visibility(false)
  assert.equal(refreshed, 1)
  assert.equal(f.sockets.length, 2)
  f.sockets[1].emit('open')
  assert.equal(f.sockets[1].sent[0].type, 'subscribe')
  f.client.destroy()
  assert.equal(f.events.size, 0)
})

test('timeout stays paused across visibility changes until explicit resume', async () => {
  const f = fixture({ timeoutMinutes: () => 1 })
  f.sockets[0].emit('open'); f.run(60000)
  assert.equal(f.client.paused, true)
  assert.deepEqual(f.pauses, ['timeout'])
  assert.equal(f.timers.size, 0)
  await f.visibility(true); await f.visibility(false)
  assert.equal(f.sockets.length, 1)
  await f.client.resume()
  assert.equal(f.sockets.length, 2)
  f.sockets[1].emit('open')
  assert.ok([...f.timers.values()].some(timer => timer.ms === 60000))
  f.client.destroy()
})

test('network failures back off but policy failures do not loop', () => {
  const f = fixture()
  f.sockets[0].emit('close', { code: 1006 }); f.run(3000)
  assert.equal(f.sockets.length, 2)
  f.sockets[1].emit('close', { code: 1008 })
  assert.equal(f.client.paused, true)
  assert.equal(f.timers.size, 0)
  f.client.destroy()
})

test('destroy while REST resume is pending never resurrects the connection', async () => {
  let finish
  const f = fixture({ beforeResume: () => new Promise(resolve => { finish = resolve }) })
  await f.visibility(true); await f.visibility(false)
  f.client.destroy(); finish(); await Promise.resolve()
  assert.equal(f.sockets.length, 1)
  assert.equal(f.timers.size, 0)
})
