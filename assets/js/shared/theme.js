import { applyBackgroundImage } from './url.js'
import {
  normalizeThemeSettings, validateThemeSettings
} from './theme-settings.js'

/**
 * Theme settings live in two layers:
 *
 * 1. Site layer — the site owner exports a snippet from the drawer and pastes
 *    it into the upstream admin "custom script" box. The upstream Worker
 *    injects it into every page as `window.__CSM_THEME__`, so all visitors
 *    receive the owner's defaults. Standalone static deploys can ship the
 *    same snippet in a <script> tag.
 * 2. Visitor layer — the drawer saves personal overrides to localStorage,
 *    which take precedence over the site layer on this browser only.
 */

export const THEME_SETTINGS_STORAGE_KEY = 'csm-next-theme-settings'
export const SITE_THEME_GLOBAL = '__CSM_THEME__'

export function siteThemeDefaults(scope = typeof window !== 'undefined' ? window : null) {
  const injected = scope?.[SITE_THEME_GLOBAL]
  if (!injected || typeof injected !== 'object' || Array.isArray(injected)) return {}
  return injected
}

function readLocalThemeSettings(storage) {
  try {
    const raw = storage.getItem(THEME_SETTINGS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Resolve effective settings: visitor localStorage > site defaults > fallback.
 * Kept awaitable-compatible: callers may `await` the returned value.
 */
export function loadThemeSettings(fallback = {}, {
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
  scope = typeof window !== 'undefined' ? window : null
} = {}) {
  const siteDefaults = normalizeThemeSettings(siteThemeDefaults(scope), fallback)
  const local = storage ? readLocalThemeSettings(storage) : null
  if (!local) {
    return { ...siteDefaults, storage: 'site' }
  }
  return { ...normalizeThemeSettings(local, siteDefaults), storage: 'local' }
}

/** Persist visitor overrides to this browser. Throws on invalid input. */
export function saveThemeSettings(settings, {
  storage = typeof localStorage !== 'undefined' ? localStorage : null
} = {}) {
  const value = validateThemeSettings(settings)
  storage?.setItem(THEME_SETTINGS_STORAGE_KEY, JSON.stringify(value))
  return { ...value, storage: 'local' }
}

/** Drop visitor overrides so the site defaults apply again. */
export function clearThemeSettings({
  storage = typeof localStorage !== 'undefined' ? localStorage : null
} = {}) {
  storage?.removeItem(THEME_SETTINGS_STORAGE_KEY)
}

/**
 * Build the snippet a site owner pastes into the upstream admin
 * appearance settings ("custom script") to apply settings site-wide.
 */
export function exportSiteThemeSnippet(settings) {
  const value = validateThemeSettings(settings)
  const compact = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== '' && entry !== undefined && entry !== null) compact[key] = entry
  }
  return `window.${SITE_THEME_GLOBAL} = ${JSON.stringify(compact)};`
}

export function applyThemeAppearance(settings, {
  root = typeof document !== 'undefined' ? document.documentElement : null,
  body = typeof document !== 'undefined' ? document.body : null,
  customStyle = typeof document !== 'undefined' ? document.querySelector('#themeCustomStyle') : null
} = {}) {
  const value = normalizeThemeSettings(settings)
  applyBackgroundImage(value.backgroundImage, body)
  const opacity = value.transparencyEnabled ? Math.round(value.panelOpacity * 100) : 100
  const blur = value.transparencyEnabled && value.transparencyMode === 'glass'
    ? Math.round(value.panelBlur)
    : 0
  root?.style?.setProperty?.('--panel-opacity', `${opacity}%`)
  root?.style?.setProperty?.('--topbar-opacity', `${value.transparencyEnabled ? Math.round(opacity * 0.92) : 100}%`)
  root?.style?.setProperty?.('--background-overlay', `${value.transparencyEnabled ? Math.round(opacity * 0.84) : 84}%`)
  root?.style?.setProperty?.('--panel-blur', `${blur}px`)
  root?.style?.setProperty?.('--panel-blur-strong', `${blur ? Math.min(36, blur + 6) : 0}px`)
  root?.style?.setProperty?.('--background-blur', `${blur ? Math.min(12, Math.round(blur * 0.45)) : 0}px`)
  if (customStyle) customStyle.textContent = value.customCss
  return value
}
