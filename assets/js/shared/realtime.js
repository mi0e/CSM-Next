import { joinUrl } from './url.js'

export function realtimeUrl(base, subscription, token = '') {
  const url = new URL(joinUrl(base, '/api/ws'))
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('subscribe', subscription)
  // Same-origin cookies remain available; scoped JWT also supports legacy login.
  if (token && (url.protocol === 'wss:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    url.searchParams.set('token', token)
  }
  return url.href
}

/** One connection lifecycle; deliberate pauses never enter the retry loop. */
export function createRealtime({ url, subscribe, onMessage, onState = () => {}, onPause = () => {},
  beforeResume = async () => {}, timeoutMinutes = () => 0,
  page = document, Socket = WebSocket, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let socket = null
  let retryTimer, expiryTimer
  let destroyed = false, paused = false, attempts = 0, generation = 0
  const stop = () => {
    generation += 1
    clearTimer(retryTimer); clearTimer(expiryTimer)
    const old = socket
    socket = null
    old?.close()
    onState(false)
  }
  const pause = reason => {
    paused = true
    stop()
    onPause(reason)
  }
  const retry = () => {
    if (destroyed || paused || page.hidden) return
    retryTimer = setTimer(open, Math.min(30000, 1500 * 2 ** Math.min(++attempts, 4)))
  }
  const open = () => {
    if (destroyed || paused || page.hidden || socket) return
    clearTimer(retryTimer)
    try {
      const current = new Socket(url())
      socket = current
      current.addEventListener('open', () => {
        if (socket !== current) return
        attempts = 0
        const subscription = subscribe?.()
        if (subscription) current.send(JSON.stringify(subscription))
        onState(true)
        const minutes = Math.min(1440, Math.max(0, Number(timeoutMinutes()) || 0))
        if (minutes) expiryTimer = setTimer(() => pause('timeout'), minutes * 60000)
      })
      current.addEventListener('message', event => {
        if (socket !== current) return
        let message
        try { message = JSON.parse(event.data) } catch { return }
        onMessage(message)
      })
      current.addEventListener('close', event => {
        if (socket !== current) return
        socket = null
        clearTimer(expiryTimer)
        onState(false)
        if (event.code === 1008) pause('authorization')
        else retry()
      })
      current.addEventListener('error', () => { if (socket === current) current.close() })
    } catch { socket = null; retry() }
  }
  const restore = async () => {
    if (destroyed || paused || page.hidden) return
    const ticket = ++generation
    try { await beforeResume() } catch { /* polling reports the error */ }
    if (!destroyed && !paused && !page.hidden && ticket === generation) open()
  }
  const visibility = () => {
    if (page.hidden) stop()
    else void restore()
  }
  page.addEventListener('visibilitychange', visibility)
  open()
  return {
    get paused() { return paused },
    resume() { if (destroyed) return; paused = false; onPause(null); return restore() },
    destroy() { destroyed = true; stop(); page.removeEventListener?.('visibilitychange', visibility) }
  }
}
