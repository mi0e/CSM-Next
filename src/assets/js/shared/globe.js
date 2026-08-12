import createGlobe from '../../vendor/cobe-2.0.1/index.esm.js'
import { COUNTRY_COORDINATES } from './globe-data.js'

const DEG = Math.PI / 180
const ONLINE_THRESHOLD = 5 * 60 * 1000
const MIN_ZOOM = 0.72
const MAX_ZOOM = 1.38

export function normalizeCountryCode(value) {
  const code = String(value || '').trim().toUpperCase()
  return COUNTRY_COORDINATES[code] ? code : 'XX'
}

function timestampMs(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return number < 10_000_000_000 ? number * 1000 : number
}

export function serverIsOnline(server, now = Date.now(), threshold = ONLINE_THRESHOLD) {
  const timestamp = timestampMs(server?.report_timestamp ?? server?.last_updated)
  return Boolean(timestamp && now - timestamp < threshold)
}

export function aggregateServerCountries(servers, now = Date.now()) {
  const countries = new Map()
  for (const server of Array.isArray(servers) ? servers : []) {
    const code = normalizeCountryCode(server?.region)
    const current = countries.get(code) || { code, count: 0, online: 0, position: COUNTRY_COORDINATES[code] || null }
    current.count += 1
    if (serverIsOnline(server, now)) current.online += 1
    countries.set(code, current)
  }
  const entries = [...countries.values()].sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
  const placed = entries.filter(entry => entry.position)
  return {
    countries: entries,
    placed,
    unplacedCount: entries.filter(entry => !entry.position).reduce((sum, entry) => sum + entry.count, 0),
    hub: placed[0] || null
  }
}

export function projectGlobePoint(latitude, longitude, rotation = {}) {
  const phi = Number(latitude) * DEG
  const lambda = (Number(longitude) - (Number(rotation.longitude) || 0)) * DEG
  const phi0 = (Number(rotation.latitude) || 0) * DEG
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosPhi0 = Math.cos(phi0)
  const sinPhi0 = Math.sin(phi0)
  const z = sinPhi0 * sinPhi + cosPhi0 * cosPhi * Math.cos(lambda)
  return {
    x: cosPhi * Math.sin(lambda),
    y: cosPhi0 * sinPhi - sinPhi0 * cosPhi * Math.cos(lambda),
    z,
    visible: z >= 0
  }
}

function vector(latitude, longitude) {
  const phi = latitude * DEG
  const lambda = longitude * DEG
  return [Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi)]
}

export function greatCirclePoints(from, to, segments = 48) {
  const start = vector(Number(from?.[0]) || 0, Number(from?.[1]) || 0)
  const end = vector(Number(to?.[0]) || 0, Number(to?.[1]) || 0)
  const dot = Math.max(-1, Math.min(1, start[0] * end[0] + start[1] * end[1] + start[2] * end[2]))
  const omega = Math.acos(dot)
  const sinOmega = Math.sin(omega)
  if (omega < 1e-6 || Math.abs(sinOmega) < 1e-6) return [from, to]
  const points = []
  for (let index = 0; index <= Math.max(2, segments); index += 1) {
    const ratio = index / Math.max(2, segments)
    const a = Math.sin((1 - ratio) * omega) / sinOmega
    const b = Math.sin(ratio * omega) / sinOmega
    const x = a * start[0] + b * end[0]
    const y = a * start[1] + b * end[1]
    const z = a * start[2] + b * end[2]
    points.push([Math.asin(z) / DEG, Math.atan2(y, x) / DEG])
  }
  return points
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function globeStrings(language, unavailable = false) {
  if (language === 'en') return {
    title: 'Server globe',
    help: unavailable
      ? 'Interactive globe unavailable in this browser. Green means online; red means offline. Country positions are representative, not server cities.'
      : 'Drag to rotate; scroll or use +/− to zoom. Green means online; red means offline. Positions are representative, not server cities.',
    canvas: 'Interactive server distribution globe. Use arrow keys to rotate and plus or minus to zoom.',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset globe view', controls: 'Globe controls',
    summary: ({ countries, nodes, online, unplaced }) => `${unavailable ? 'Interactive globe unavailable · ' : ''}${countries} countries · ${online}/${nodes} online${unplaced ? ` · ${unplaced} unplaced` : ''}`,
    marker: entry => `${entry.code}: ${entry.online}/${entry.count} online`
  }
  return {
    title: '服务器地球仪',
    help: unavailable
      ? '此浏览器不支持交互式地球仪。绿点表示在线，红点表示离线；国家位置仅为代表点，并非服务器所在城市。'
      : '拖动旋转，滚轮或 +/− 缩放。绿点表示在线，红点表示离线；位置仅为国家代表点。',
    canvas: '交互式服务器分布地球仪。方向键旋转，加号或减号缩放。',
    zoomIn: '放大', zoomOut: '缩小', reset: '重置地球仪视角', controls: '地球仪控制',
    summary: ({ countries, nodes, online, unplaced }) => `${unavailable ? '交互式地球仪不可用 · ' : ''}${countries} 个国家/地区 · ${online}/${nodes} 在线${unplaced ? ` · ${unplaced} 个无法定位` : ''}`,
    marker: entry => `${entry.code}：${entry.online}/${entry.count} 在线`
  }
}

function globeControls(root) {
  return {
    zoomIn: root?.querySelector?.('[data-globe-action="zoom-in"]'),
    zoomOut: root?.querySelector?.('[data-globe-action="zoom-out"]'),
    reset: root?.querySelector?.('[data-globe-action="reset"]'),
    group: root?.querySelector?.('.globe-controls'),
    status: root?.querySelector?.('[data-globe-status]'),
    title: root?.querySelector?.('[data-globe-title]'),
    help: root?.querySelector?.('[data-globe-help]')
  }
}

function totalsFor(aggregate) {
  return aggregate.countries.reduce((summary, entry) => ({
    nodes: summary.nodes + entry.count,
    online: summary.online + entry.online
  }), { nodes: 0, online: 0 })
}

export function buildGlobeMarkers(aggregate, activeRegion = 'all', theme = 'light') {
  const colors = theme === 'dark'
    ? { online: [0.18, 0.88, 0.58], offline: [1, 0.28, 0.3] }
    : { online: [0.04, 0.68, 0.4], offline: [0.94, 0.16, 0.2] }
  const markers = []
  for (const entry of aggregate?.placed || []) {
    const selected = activeRegion === entry.code
    const baseSize = Math.min(0.11, 0.025 + Math.sqrt(entry.count) * 0.012 + (selected ? 0.025 : 0))
    const offline = Math.max(0, entry.count - entry.online)
    if (entry.online > 0) {
      markers.push({
        location: entry.position,
        size: baseSize,
        color: colors.online,
        id: `${entry.code.toLowerCase()}-online`
      })
    }
    if (offline > 0) {
      markers.push({
        location: entry.position,
        size: entry.online > 0 ? baseSize * 0.48 : baseSize,
        color: colors.offline,
        id: `${entry.code.toLowerCase()}-offline`
      })
    }
  }
  return markers
}

function mountFallback({ canvas, controls }) {
  let destroyed = false
  let servers = []
  let language = 'zh'
  let now
  if (canvas) {
    canvas.hidden = true
    canvas.setAttribute?.('aria-hidden', 'true')
  }
  if (controls.group) controls.group.hidden = true
  for (const button of [controls.zoomIn, controls.zoomOut, controls.reset]) if (button) button.disabled = true

  function render() {
    if (destroyed) return
    const aggregate = aggregateServerCountries(servers, now)
    const copy = globeStrings(language, true)
    if (controls.title) controls.title.textContent = copy.title
    if (controls.help) controls.help.textContent = copy.help
    if (controls.status) controls.status.textContent = copy.summary({
      countries: aggregate.placed.length,
      ...totalsFor(aggregate),
      unplaced: aggregate.unplacedCount
    })
  }
  render()
  return {
    update(next = {}) {
      if (Array.isArray(next.servers)) servers = next.servers
      if (next.language) language = next.language
      if (next.now !== undefined) now = next.now
      render()
    },
    destroy() { destroyed = true }
  }
}

export function restoreCobeCanvas(canvas, originalParent, originalNextSibling) {
  if (!canvas || !originalParent) return
  const wrapper = canvas.parentNode && canvas.parentNode !== originalParent ? canvas.parentNode : null
  const nextIsUsable = originalNextSibling
    && originalNextSibling !== canvas
    && originalNextSibling.parentNode === originalParent
  try {
    if (nextIsUsable && typeof originalParent.insertBefore === 'function') {
      originalParent.insertBefore(canvas, originalNextSibling)
    } else if (typeof originalParent.append === 'function') {
      originalParent.append(canvas)
    } else {
      originalParent.appendChild?.(canvas)
    }
  } catch { /* detached dashboard during route change */ }
  if (!wrapper || wrapper === originalParent || canvas.parentNode !== originalParent) return
  try {
    if (typeof wrapper.remove === 'function') wrapper.remove()
    else wrapper.parentNode?.removeChild?.(wrapper)
  } catch { /* wrapper may already have been detached by route cleanup */ }
}

export function mountServerGlobe(options = {}) {
  const root = options.root
  const canvas = options.canvas || root?.querySelector?.('canvas')
  const controls = globeControls(root)
  const originalParent = canvas?.parentNode || null
  const originalNextSibling = canvas?.nextSibling || null
  let webgl = null
  try { webgl = canvas?.getContext?.('webgl2') || canvas?.getContext?.('webgl') || null } catch { /* unsupported WebGL */ }
  if (!root || !canvas || !webgl) return mountFallback({ canvas, controls })

  const state = {
    aggregate: aggregateServerCountries([]), language: 'zh', theme: 'light', activeRegion: 'all',
    phi: -0.2, theta: 0.18, zoom: 1, width: 0, height: 0,
    dragging: false, pointerId: null, pointerX: 0, pointerY: 0, moved: false,
    reducedMotion: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
    destroyed: false, frame: 0, renderer: null
  }
  const listeners = []

  function listen(target, type, handler, listenerOptions) {
    target?.addEventListener?.(type, handler, listenerOptions)
    if (target?.removeEventListener) listeners.push([target, type, handler, listenerOptions])
  }

  function palette() {
    return state.theme === 'dark' ? {
      dark: 1, baseColor: [0.22, 0.3, 0.42], markerColor: [0.2, 0.78, 0.55],
      glowColor: [0.08, 0.13, 0.22], arcColor: [0.25, 0.55, 1]
    } : {
      dark: 0, baseColor: [0.56, 0.64, 0.75], markerColor: [0.05, 0.62, 0.42],
      glowColor: [0.88, 0.93, 1], arcColor: [0.18, 0.42, 0.95]
    }
  }

  function visualData() {
    const markers = buildGlobeMarkers(state.aggregate, state.activeRegion, state.theme)
    const arcs = state.aggregate.hub
      ? state.aggregate.placed.filter(entry => entry.code !== state.aggregate.hub.code).map(entry => ({
          from: state.aggregate.hub.position, to: entry.position, id: `${state.aggregate.hub.code}-${entry.code}`.toLowerCase()
        }))
      : []
    return { markers, arcs }
  }

  function rendererOptions() {
    const ratio = Math.min(2, globalThis.devicePixelRatio || 1)
    return {
      devicePixelRatio: ratio, width: state.width, height: state.height,
      phi: state.phi, theta: state.theta, scale: state.zoom,
      diffuse: 1.3, mapSamples: 16000, mapBrightness: state.theme === 'dark' ? 7 : 5.5,
      mapBaseBrightness: state.theme === 'dark' ? 0.04 : 0.02, opacity: 0.94,
      arcWidth: 0.65, arcHeight: 0.22, markerElevation: 0.035,
      context: { alpha: true, antialias: true, powerPreference: 'high-performance' },
      ...palette(), ...visualData()
    }
  }

  function updateLabels() {
    const copy = globeStrings(state.language)
    if (controls.title) controls.title.textContent = copy.title
    if (controls.help) controls.help.textContent = copy.help
    canvas.setAttribute?.('aria-label', copy.canvas)
    controls.group?.setAttribute?.('aria-label', copy.controls)
    for (const [button, label] of [[controls.zoomIn, copy.zoomIn], [controls.zoomOut, copy.zoomOut], [controls.reset, copy.reset]]) {
      button?.setAttribute?.('aria-label', label)
      button?.setAttribute?.('title', label)
    }
    if (controls.status) controls.status.textContent = copy.summary({
      countries: state.aggregate.placed.length,
      ...totalsFor(state.aggregate),
      unplaced: state.aggregate.unplacedCount
    })
  }

  function resize() {
    if (state.destroyed) return
    const rect = canvas.getBoundingClientRect?.() || { width: root.clientWidth || 560, height: root.clientHeight || 340 }
    const width = Math.max(1, Math.round(rect.width || root.clientWidth || 560))
    const height = Math.max(1, Math.round(rect.height || root.clientHeight || 340))
    if (width === state.width && height === state.height) return
    state.width = width
    state.height = height
    state.renderer?.update({ width, height })
  }

  function renderFrame() {
    if (state.destroyed) return
    if (!state.dragging && !state.reducedMotion) state.phi += 0.0012
    state.renderer?.update({ phi: state.phi, theta: state.theta, scale: state.zoom })
    state.frame = globalThis.requestAnimationFrame?.(renderFrame) || setTimeout(renderFrame, 16)
  }

  function zoom(delta) {
    state.zoom = clamp(state.zoom + delta, MIN_ZOOM, MAX_ZOOM)
    state.renderer?.update({ scale: state.zoom })
  }

  function reset() {
    state.phi = -0.2
    state.theta = 0.18
    state.zoom = 1
    state.renderer?.update({ phi: state.phi, theta: state.theta, scale: state.zoom })
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect?.() || { left: 0, top: 0, width: state.width, height: state.height }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width || state.width, height: rect.height || state.height }
  }

  function hitCountry(point) {
    const radius = Math.min(point.width, point.height) * 0.4 * state.zoom
    const rotation = { longitude: state.phi / DEG, latitude: state.theta / DEG }
    return state.aggregate.placed.map(entry => {
      const projected = projectGlobePoint(entry.position[0], entry.position[1], rotation)
      return { entry, projected, distance: Math.hypot(point.width / 2 + projected.x * radius - point.x, point.height / 2 - projected.y * radius - point.y) }
    }).filter(item => item.projected.visible && item.distance < 16).sort((a, b) => a.distance - b.distance)[0]?.entry
  }

  listen(canvas, 'pointerdown', event => {
    const point = pointerPosition(event)
    state.dragging = true; state.pointerId = event.pointerId; state.pointerX = point.x; state.pointerY = point.y; state.moved = false
    canvas.setPointerCapture?.(event.pointerId)
  })
  listen(canvas, 'pointermove', event => {
    if (!state.dragging || (state.pointerId !== null && event.pointerId !== state.pointerId)) return
    const point = pointerPosition(event)
    const dx = point.x - state.pointerX
    const dy = point.y - state.pointerY
    if (Math.abs(dx) + Math.abs(dy) > 2) state.moved = true
    state.phi += dx * 0.006 / state.zoom
    state.theta = clamp(state.theta + dy * 0.005 / state.zoom, -1.15, 1.15)
    state.pointerX = point.x; state.pointerY = point.y
  })
  const finishPointer = event => {
    if (!state.dragging) return
    if (!state.moved) {
      const hit = hitCountry(pointerPosition(event))
      if (hit) {
        options.onCountrySelect?.(hit.code)
        if (controls.status) controls.status.textContent = globeStrings(state.language).marker(hit)
      }
    }
    state.dragging = false; state.pointerId = null
    canvas.releasePointerCapture?.(event.pointerId)
  }
  listen(canvas, 'pointerup', finishPointer)
  listen(canvas, 'pointercancel', finishPointer)
  listen(canvas, 'wheel', event => { event.preventDefault?.(); zoom(event.deltaY < 0 ? 0.08 : -0.08) }, { passive: false })
  listen(canvas, 'keydown', event => {
    let handled = true
    if (event.key === 'ArrowLeft') state.phi -= 0.12
    else if (event.key === 'ArrowRight') state.phi += 0.12
    else if (event.key === 'ArrowUp') state.theta = clamp(state.theta - 0.1, -1.15, 1.15)
    else if (event.key === 'ArrowDown') state.theta = clamp(state.theta + 0.1, -1.15, 1.15)
    else if (event.key === '+' || event.key === '=') zoom(0.08)
    else if (event.key === '-' || event.key === '_') zoom(-0.08)
    else if (event.key === '0' || event.key === 'Home') reset()
    else handled = false
    if (handled) event.preventDefault?.()
  })
  listen(controls.zoomIn, 'click', () => zoom(0.1))
  listen(controls.zoomOut, 'click', () => zoom(-0.1))
  listen(controls.reset, 'click', reset)

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
  observer?.observe(root)
  listen(globalThis, 'resize', resize)
  resize()
  try {
    state.renderer = createGlobe(canvas, rendererOptions())
  } catch {
    observer?.disconnect()
    for (const [target, type, handler, listenerOptions] of listeners) target.removeEventListener(type, handler, listenerOptions)
    restoreCobeCanvas(canvas, originalParent, originalNextSibling)
    return mountFallback({ canvas, controls })
  }
  updateLabels()
  renderFrame()

  return {
    update(next = {}) {
      if (Array.isArray(next.servers)) state.aggregate = aggregateServerCountries(next.servers, next.now)
      if (next.language) state.language = next.language
      if (next.theme) state.theme = next.theme
      if (next.activeRegion) state.activeRegion = next.activeRegion
      state.renderer?.update({ ...palette(), ...visualData(), mapBrightness: state.theme === 'dark' ? 7 : 5.5 })
      updateLabels()
    },
    destroy() {
      state.destroyed = true
      observer?.disconnect()
      for (const [target, type, handler, listenerOptions] of listeners) target.removeEventListener(type, handler, listenerOptions)
      listeners.length = 0
      if (state.frame) (globalThis.cancelAnimationFrame || clearTimeout)(state.frame)
      state.renderer?.destroy?.()
      state.renderer = null
      restoreCobeCanvas(canvas, originalParent, originalNextSibling)
    }
  }
}
