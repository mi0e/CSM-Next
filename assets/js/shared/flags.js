import { escapeHtml } from './dom.js'
import { joinUrl } from './url.js'

/**
 * Region flags come from the upstream Worker's static assets
 * (`/flags/<lowercase-code>.svg`), per the theme-store convention that themes
 * must not bundle flag files. Same-origin in theme-store mode; standalone
 * deploys point at an API base origin (plain <img>, no CORS involved).
 * A hidden text code follows the image so the existing global error handler
 * can fall back when a flag file is missing.
 */
export function flagMarkup(region, base = '') {
  const code = String(region || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX') return '<span class="flag-code">--</span>'
  const origin = base || (typeof location !== 'undefined' ? location.origin : '')
  const src = joinUrl(origin, `/flags/${code.toLowerCase()}.svg`)
  return `<img class="region-flag" src="${escapeHtml(src)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="flag-code" hidden>${escapeHtml(code)}</span>`
}
