import { escapeHtml } from './dom.js'

/**
 * komari-next NodeMapView (dashboard world map) for CSM-Next.
 * Region resolution and status rules follow komari's utils/mapRegions.ts;
 * the projected country paths are generated once by scripts/generate-world-map.mjs.
 */

// komari regionMetaOverridesByFlagCode
const REGION_OVERRIDES = {
  US: { label: 'United States', mapName: 'United States of America' },
  TR: { label: 'Turkey', mapName: 'Turkey' },
  MO: { label: 'Macau', mapName: 'Macao' },
  HK: { label: 'Hong Kong', mapName: 'Hong Kong' }
}

const englishRegionNames = typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null

const HOVER_CARD_GAP = 12
const HOVER_CARD_MAX_WIDTH = 320
const HOVER_CARD_FALLBACK_HEIGHT = 124
const HOVER_CARD_EDGE_PADDING = 8

// komari resolves anything that is not a two-letter code to "UN" (unmapped);
// CSM's own "unknown" sentinel is XX, so it is treated the same way.
export function resolveMapRegion(region) {
  const code = String(region || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code) || code === 'UN' || code === 'XX') return null
  let displayName = ''
  try {
    displayName = englishRegionNames?.of(code)?.trim() || ''
  } catch {
    return null
  }
  if (!displayName) return null
  const overrides = REGION_OVERRIDES[code]
  return {
    key: code,
    label: overrides?.label ?? displayName,
    mapName: overrides?.mapName ?? displayName,
    flagCode: code
  }
}

export function regionStatus(online, offline) {
  if (online === 0) return 'offline'
  if (offline === 0) return 'online'
  return 'partial'
}

// komari buildMapViewSummary
export function buildMapSummary(servers = [], isOnline = () => false) {
  const regionMap = new Map()
  const unmapped = []
  let online = 0
  for (const server of servers) {
    const up = Boolean(isOnline(server))
    if (up) online += 1
    const meta = resolveMapRegion(server.region)
    if (!meta) {
      unmapped.push(server)
      continue
    }
    const entry = regionMap.get(meta.key) ?? { ...meta, total: 0, online: 0, offline: 0, status: 'offline' }
    entry.total += 1
    if (up) entry.online += 1
    else entry.offline += 1
    entry.status = regionStatus(entry.online, entry.offline)
    regionMap.set(meta.key, entry)
  }
  const regions = [...regionMap.values()].sort((left, right) =>
    (right.total - left.total) || (right.online - left.online) || left.label.localeCompare(right.label))
  return { regions, total: servers.length, online, offline: servers.length - online, unmapped }
}

// komari places the hover card on whichever side of the pointer has room.
export function hoverPlacement(x, y, bounds, card) {
  const width = card.width || Math.min(HOVER_CARD_MAX_WIDTH, Math.max(0, bounds.width - HOVER_CARD_EDGE_PADDING * 2))
  const height = card.height || HOVER_CARD_FALLBACK_HEIGHT
  const spaceRight = bounds.width - x - HOVER_CARD_GAP
  const spaceLeft = x - HOVER_CARD_GAP
  const spaceBelow = bounds.height - y - HOVER_CARD_GAP
  const spaceAbove = y - HOVER_CARD_GAP
  return {
    horizontal: spaceRight >= width || spaceRight >= spaceLeft ? 'right' : 'left',
    vertical: spaceBelow >= height || spaceBelow >= spaceAbove ? 'below' : 'above'
  }
}

/**
 * Renders the static map once; update() only toggles country classes and
 * redraws the (few) small-region markers, legend extras and hover card.
 * `t` and `flag` are read on every update so language changes apply.
 */
export async function mountServerMap({ root, t, flag, isOnline }) {
  const { default: map } = await import('../../data/world-map.js')
  const surface = root.querySelector('.node-map-view__surface')
  const empty = root.querySelector('.node-map-view__empty')
  const unmappedCard = root.querySelector('[data-map-unmapped]')
  const hoverCard = root.querySelector('.node-map-view__hover-card')
  const markersByName = new Map(map.countries.filter(item => item.length > 2).map(([name, , x, y]) => [name, [x, y]]))

  const svgHost = root.querySelector('[data-map-svg]')
  svgHost.innerHTML = `<svg viewBox="0 0 ${map.width} ${map.height}" class="node-map-view__svg" role="img">`
    + `<path d="${map.sphere}" class="node-map-view__ocean"/><path d="${map.graticule}" class="node-map-view__graticule"/>`
    + `<g class="node-map-view__country-layer">${map.countries.map(([name, d]) => `<path d="${d}" class="node-map-view__country" data-map-name="${escapeHtml(name)}"/>`).join('')}</g>`
    + '<g class="node-map-view__marker-layer"></g></svg>'
  const svg = svgHost.querySelector('svg')
  const markerLayer = svgHost.querySelector('.node-map-view__marker-layer')
  const paths = new Map([...svgHost.querySelectorAll('.node-map-view__country')].map(path => [path.dataset.mapName, path]))
  const pathClasses = new Map()

  let summary = buildMapSummary()
  let byName = new Map()
  let hovered = null
  let markerMarkup = ''
  let unmappedMarkup = ''

  function renderHover() {
    const region = hovered && summary.regions.find(item => item.key === hovered.key)
    hoverCard.hidden = !region
    if (!region) return
    hoverCard.innerHTML = `<div class="node-map-view__hover-header">
      <div class="node-map-view__detail-heading">
        <span class="node-map-view__detail-flag flag" aria-hidden="true">${flag(region.flagCode)}</span>
        <div class="node-map-view__hover-text">
          <div class="node-map-view__hover-code">${escapeHtml(region.flagCode)}</div>
          <h3 class="node-map-view__hover-name">${escapeHtml(region.label)}</h3>
          <div class="node-map-view__hover-count-line">
            <span class="node-map-view__hover-count-total">${region.total}<span>${escapeHtml(t('mapNodes'))}</span></span>
            <span class="node-map-view__hover-status-counts">
              <span class="node-map-view__hover-count node-map-view__hover-count--online">${region.online} ${escapeHtml(t('online'))}</span>
              <span class="node-map-view__hover-count node-map-view__hover-count--offline">${region.offline} ${escapeHtml(t('offline'))}</span>
            </span>
          </div>
        </div>
      </div>
      <span class="node-map-view__badge status-${region.status}">${escapeHtml(t(`mapStatus_${region.status}`))}</span>
    </div>`
    placeHover()
  }

  function placeHover() {
    if (!hovered || hoverCard.hidden) return
    const bounds = surface.getBoundingClientRect()
    const { horizontal, vertical } = hoverPlacement(hovered.x, hovered.y, bounds, { width: hoverCard.offsetWidth, height: hoverCard.offsetHeight })
    hoverCard.style.setProperty('--node-map-hover-x', `${hovered.x}px`)
    hoverCard.style.setProperty('--node-map-hover-y', `${hovered.y}px`)
    hoverCard.dataset.horizontal = horizontal
    hoverCard.dataset.vertical = vertical
  }

  function renderShapes() {
    const selected = hovered?.key
    for (const [name, path] of paths) {
      const region = byName.get(name)
      const className = `node-map-view__country${region ? ` is-active status-${region.status}` : ''}${region && region.key === selected ? ' is-selected' : ''}`
      if (pathClasses.get(name) === className) continue
      pathClasses.set(name, className)
      path.setAttribute('class', className)
    }
    const markup = summary.regions.map(region => {
      const point = paths.has(region.mapName) && markersByName.get(region.mapName)
      if (!point) return ''
      return `<g class="node-map-view__marker status-${region.status}${region.key === selected ? ' is-selected' : ''}" data-map-name="${escapeHtml(region.mapName)}">`
        + `<circle cx="${point[0]}" cy="${point[1]}" r="9" class="node-map-view__marker-halo"/>`
        + `<circle cx="${point[0]}" cy="${point[1]}" r="4.2" class="node-map-view__marker-dot"/></g>`
    }).join('')
    if (markup !== markerMarkup) {
      markerMarkup = markup
      markerLayer.innerHTML = markup
    }
  }

  function renderUnmapped() {
    unmappedCard.hidden = !summary.unmapped.length
    if (!summary.unmapped.length) return
    const markup = `<div class="node-map-view__legend-unmapped-header">
      <span>${escapeHtml(t('mapUnmappedRegions'))}</span>
      <span class="node-map-view__badge status-partial">${escapeHtml(t('mapUnmappedCount', { count: summary.unmapped.length }))}</span>
    </div>
    <div class="node-map-view__legend-unmapped-list">${summary.unmapped.map(server => {
      const code = String(server.region || '').trim()
      const label = code && code.toUpperCase() !== 'XX' ? code : t('mapRegionUnknown')
      return `<div class="node-map-view__legend-unmapped-item"><span class="node-map-view__legend-unmapped-region">${escapeHtml(label)}</span><span class="node-map-view__legend-unmapped-node">${escapeHtml(server.name || '')}</span></div>`
    }).join('')}</div>`
    // Skip identical rewrites so the per-second refresh keeps the list's scroll position.
    if (markup !== unmappedMarkup) unmappedCard.innerHTML = unmappedMarkup = markup
  }

  function onPointer(event) {
    const name = event.target?.closest?.('[data-map-name]')?.dataset.mapName
    const region = name && byName.get(name)
    const previous = hovered?.key
    if (!region) {
      if (!hovered) return
      hovered = null
    } else {
      const rect = surface.getBoundingClientRect()
      hovered = { key: region.key, x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    if (hovered?.key !== previous) {
      renderShapes()
      renderHover()
    } else placeHover()
  }
  const onLeave = () => {
    if (!hovered) return
    hovered = null
    renderShapes()
    renderHover()
  }
  svg.addEventListener('pointermove', onPointer)
  svg.addEventListener('pointerover', onPointer)
  svg.addEventListener('pointerleave', onLeave)

  function update(servers = []) {
    summary = buildMapSummary(servers, isOnline)
    byName = new Map(summary.regions.map(region => [region.mapName, region]))
    if (hovered && !summary.regions.some(region => region.key === hovered.key)) hovered = null
    empty.hidden = summary.total > 0
    surface.hidden = summary.total === 0
    svg.setAttribute('aria-label', t('mapAriaLabel'))
    renderShapes()
    renderUnmapped()
    renderHover()
  }

  return {
    update,
    destroy() {
      svg.removeEventListener('pointermove', onPointer)
      svg.removeEventListener('pointerover', onPointer)
      svg.removeEventListener('pointerleave', onLeave)
      svgHost.innerHTML = ''
      hoverCard.hidden = true
    }
  }
}
