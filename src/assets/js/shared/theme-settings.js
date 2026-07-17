export const THEME_SETTINGS_DEFAULTS = Object.freeze({
  backgroundImage: '',
  panelOpacity: 1,
  customCss: ''
})

export const THEME_CSS_MAX_LENGTH = 20000
export const THEME_OPACITY_MIN = 0.2
export const THEME_OPACITY_MAX = 1

const unsafeCssPattern = /\\|@import\b|@namespace\b|url\s*\(|image-set\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding|<\/?style\b/i

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
  const fallbackOpacity = Number.isFinite(Number(fallback.panelOpacity))
    ? Math.min(THEME_OPACITY_MAX, Math.max(THEME_OPACITY_MIN, Number(fallback.panelOpacity)))
    : THEME_SETTINGS_DEFAULTS.panelOpacity
  const parsedOpacity = Number(value?.panelOpacity)
  const panelOpacity = Number.isFinite(parsedOpacity)
    ? Math.min(THEME_OPACITY_MAX, Math.max(THEME_OPACITY_MIN, parsedOpacity))
    : fallbackOpacity
  return {
    backgroundImage,
    panelOpacity,
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

  return {
    backgroundImage: backgroundImage ? safeThemeBackground(backgroundImage) : '',
    panelOpacity,
    customCss: value.customCss.trim()
  }
}
