export const THEME_SETTINGS_DEFAULTS = Object.freeze({
  backgroundImage: '',
  globeEnabled: false,
  transparencyEnabled: false,
  transparencyMode: 'soft',
  panelOpacity: 1,
  panelBlur: 18,
  customCss: ''
})

export const THEME_CSS_MAX_LENGTH = 20000
export const THEME_OPACITY_MIN = 0.2
export const THEME_OPACITY_MAX = 1
export const THEME_BLUR_MIN = 0
export const THEME_BLUR_MAX = 30
export const THEME_TRANSPARENCY_MODES = Object.freeze(['soft', 'glass'])

const unsafeCssPattern = /\\|@import\b|@namespace\b|url\s*\(|image-set\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding|<\/?style\b/i
const transparencyModes = new Set(THEME_TRANSPARENCY_MODES)

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function safeThemeBackground(value) {
  const raw = text(value)
  if (!raw || raw.length > 2048) return ''
  try {
    const url = new URL(raw)
    const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    return (url.protocol === 'https:' || localHttp) && url.hostname ? url.href : ''
  } catch {
    return ''
  }
}

export function safeCustomCss(value) {
  const css = typeof value === 'string' ? value.trim() : ''
  if (!css || css.length > THEME_CSS_MAX_LENGTH || unsafeCssPattern.test(css)) return ''
  return css
}

export function normalizeThemeSettings(value = {}, fallback = {}) {
  const fallbackBackground = safeThemeBackground(fallback.backgroundImage)
  const rawBackground = typeof value?.backgroundImage === 'string' ? value.backgroundImage.trim() : null
  const backgroundImage = rawBackground === '' ? '' : safeThemeBackground(rawBackground) || fallbackBackground
  const fallbackHasOpacity = Number.isFinite(Number(fallback.panelOpacity))
  const fallbackOpacity = fallbackHasOpacity
    ? Math.min(THEME_OPACITY_MAX, Math.max(THEME_OPACITY_MIN, Number(fallback.panelOpacity)))
    : THEME_SETTINGS_DEFAULTS.panelOpacity
  const parsedOpacity = Number(value?.panelOpacity)
  const hasOpacity = Number.isFinite(parsedOpacity)
  const panelOpacity = hasOpacity
    ? Math.min(THEME_OPACITY_MAX, Math.max(THEME_OPACITY_MIN, parsedOpacity))
    : fallbackOpacity
  const fallbackTransparencyEnabled = typeof fallback?.transparencyEnabled === 'boolean'
    ? fallback.transparencyEnabled
    : fallbackHasOpacity && fallbackOpacity < THEME_OPACITY_MAX
  const transparencyEnabled = typeof value?.transparencyEnabled === 'boolean'
    ? value.transparencyEnabled
    : hasOpacity ? panelOpacity < THEME_OPACITY_MAX : fallbackTransparencyEnabled
  const fallbackMode = transparencyModes.has(fallback?.transparencyMode)
    ? fallback.transparencyMode
    : fallbackTransparencyEnabled ? 'glass' : THEME_SETTINGS_DEFAULTS.transparencyMode
  const transparencyMode = transparencyModes.has(value?.transparencyMode)
    ? value.transparencyMode
    : hasOpacity && panelOpacity < THEME_OPACITY_MAX && typeof value?.transparencyEnabled !== 'boolean'
      ? 'glass'
      : fallbackMode
  const fallbackBlur = Number.isFinite(Number(fallback.panelBlur))
    ? Math.min(THEME_BLUR_MAX, Math.max(THEME_BLUR_MIN, Number(fallback.panelBlur)))
    : THEME_SETTINGS_DEFAULTS.panelBlur
  const parsedBlur = Number(value?.panelBlur)
  const panelBlur = Number.isFinite(parsedBlur)
    ? Math.min(THEME_BLUR_MAX, Math.max(THEME_BLUR_MIN, parsedBlur))
    : fallbackBlur
  const fallbackGlobeEnabled = typeof fallback?.globeEnabled === 'boolean'
    ? fallback.globeEnabled
    : THEME_SETTINGS_DEFAULTS.globeEnabled
  const globeEnabled = typeof value?.globeEnabled === 'boolean'
    ? value.globeEnabled
    : fallbackGlobeEnabled
  return {
    backgroundImage,
    globeEnabled,
    transparencyEnabled,
    transparencyMode,
    panelOpacity,
    panelBlur,
    customCss: safeCustomCss(value?.customCss)
  }
}

export function validateThemeSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Theme settings must be an object')
    error.code = 'invalid_theme_settings'
    throw error
  }

  const backgroundImage = typeof value.backgroundImage === 'string' ? value.backgroundImage.trim() : ''
  if (backgroundImage && !safeThemeBackground(backgroundImage)) {
    const error = new Error('Background image must be an absolute HTTPS URL')
    error.code = 'invalid_background_image'
    throw error
  }

  const panelOpacity = Number(value.panelOpacity)
  if (!Number.isFinite(panelOpacity) || panelOpacity < THEME_OPACITY_MIN || panelOpacity > THEME_OPACITY_MAX) {
    const error = new Error(`Panel opacity must be between ${THEME_OPACITY_MIN} and ${THEME_OPACITY_MAX}`)
    error.code = 'invalid_panel_opacity'
    throw error
  }

  if (Object.hasOwn(value, 'transparencyEnabled') && typeof value.transparencyEnabled !== 'boolean') {
    const error = new Error('Transparency enabled must be a boolean')
    error.code = 'invalid_transparency_enabled'
    throw error
  }

  if (Object.hasOwn(value, 'globeEnabled') && typeof value.globeEnabled !== 'boolean') {
    const error = new Error('Globe enabled must be a boolean')
    error.code = 'invalid_globe_enabled'
    error.field = 'globeEnabled'
    throw error
  }

  if (Object.hasOwn(value, 'transparencyMode') && !transparencyModes.has(value.transparencyMode)) {
    const error = new Error(`Transparency mode must be one of: ${THEME_TRANSPARENCY_MODES.join(', ')}`)
    error.code = 'invalid_transparency_mode'
    throw error
  }

  if (Object.hasOwn(value, 'panelBlur')) {
    const panelBlur = Number(value.panelBlur)
    if (!Number.isFinite(panelBlur) || panelBlur < THEME_BLUR_MIN || panelBlur > THEME_BLUR_MAX) {
      const error = new Error(`Panel blur must be between ${THEME_BLUR_MIN} and ${THEME_BLUR_MAX}`)
      error.code = 'invalid_panel_blur'
      throw error
    }
  }

  if (typeof value.customCss !== 'string' || value.customCss.length > THEME_CSS_MAX_LENGTH) {
    const error = new Error(`Custom CSS must be at most ${THEME_CSS_MAX_LENGTH} characters`)
    error.code = 'invalid_custom_css'
    throw error
  }
  if (value.customCss && safeCustomCss(value.customCss) !== value.customCss.trim()) {
    const error = new Error('Custom CSS cannot load external resources or contain unsafe directives')
    error.code = 'unsafe_custom_css'
    throw error
  }

  const normalized = normalizeThemeSettings(value)
  return {
    backgroundImage: backgroundImage ? safeThemeBackground(backgroundImage) : '',
    globeEnabled: normalized.globeEnabled,
    transparencyEnabled: normalized.transparencyEnabled,
    transparencyMode: normalized.transparencyMode,
    panelOpacity,
    panelBlur: normalized.panelBlur,
    customCss: value.customCss.trim()
  }
}
