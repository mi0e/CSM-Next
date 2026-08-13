import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeThemeSettings, safeCustomCss, validateThemeSettings
} from '../src/assets/js/shared/theme-settings.js'
import { applyThemeAppearance } from '../src/assets/js/shared/theme.js'

test('theme settings normalize safe values and clamp stored opacity', () => {
  assert.deepEqual(normalizeThemeSettings({
    backgroundImage: 'https://cdn.example.com/bg.webp',
    globeEnabled: true,
    transparencyEnabled: true,
    transparencyMode: 'soft',
    panelOpacity: 0.72,
    panelBlur: 12,
    customCss: '.brand-title { letter-spacing: .1em; }'
  }), {
    backgroundImage: 'https://cdn.example.com/bg.webp',
    globeEnabled: true,
    transparencyEnabled: true,
    transparencyMode: 'soft',
    panelOpacity: 0.72,
    panelBlur: 12,
    customCss: '.brand-title { letter-spacing: .1em; }'
  })
  assert.equal(normalizeThemeSettings({ panelOpacity: 9 }).panelOpacity, 1)
})

test('legacy opacity settings migrate to the existing glass appearance', () => {
  const settings = normalizeThemeSettings({ panelOpacity: 0.72, customCss: '' })
  assert.equal(settings.transparencyEnabled, true)
  assert.equal(settings.transparencyMode, 'glass')
  assert.equal(settings.panelBlur, 18)
  assert.equal(settings.globeEnabled, false)
})

test('globe setting is strict boolean and inherits fallback', () => {
  assert.equal(normalizeThemeSettings({}).globeEnabled, false)
  assert.equal(normalizeThemeSettings({}, { globeEnabled: true }).globeEnabled, true)
  assert.equal(normalizeThemeSettings({ globeEnabled: false }, { globeEnabled: true }).globeEnabled, false)
  assert.throws(() => validateThemeSettings({ backgroundImage: '', globeEnabled: 'yes', panelOpacity: 1, customCss: '' }), error => error.code === 'invalid_globe_enabled' && error.field === 'globeEnabled')
})

test('theme appearance separates transparency from backdrop blur', () => {
  const properties = {}
  const root = { style: { setProperty: (name, value) => { properties[name] = value } } }
  const body = { style: {}, classList: { add() {}, remove() {} } }
  const customStyle = { textContent: '' }

  applyThemeAppearance({
    backgroundImage: '', transparencyEnabled: false, transparencyMode: 'glass',
    panelOpacity: 0.6, panelBlur: 24, customCss: ''
  }, { root, body, customStyle })
  assert.equal(properties['--panel-opacity'], '100%')
  assert.equal(properties['--panel-blur'], '0px')

  applyThemeAppearance({
    backgroundImage: '', transparencyEnabled: true, transparencyMode: 'soft',
    panelOpacity: 0.6, panelBlur: 24, customCss: ''
  }, { root, body, customStyle })
  assert.equal(properties['--panel-opacity'], '60%')
  assert.equal(properties['--panel-blur'], '0px')

  applyThemeAppearance({
    backgroundImage: '', transparencyEnabled: true, transparencyMode: 'glass',
    panelOpacity: 0.6, panelBlur: 24, customCss: ''
  }, { root, body, customStyle })
  assert.equal(properties['--panel-opacity'], '60%')
  assert.equal(properties['--panel-blur'], '24px')
  assert.equal(properties['--panel-blur-strong'], '30px')
  assert.equal(properties['--background-blur'], '11px')
})

test('custom CSS cannot load resources or inject style markup', () => {
  assert.equal(safeCustomCss('@import "https://evil.example/x.css";'), '')
  assert.equal(safeCustomCss('.x { background: url(https://evil.example/x); }'), '')
  assert.equal(safeCustomCss('.x { background: u\\72l(https://evil.example/x); }'), '')
  assert.equal(safeCustomCss('</style><script>alert(1)</script>'), '')
  assert.throws(() => validateThemeSettings({
    backgroundImage: '', panelOpacity: 1, customCss: '@import "https://evil.example/x.css";'
  }), error => error.code === 'unsafe_custom_css')
})

test('theme settings require HTTPS backgrounds and bounded opacity', () => {
  assert.throws(() => validateThemeSettings({
    backgroundImage: 'http://example.com/bg.jpg', panelOpacity: 1, customCss: ''
  }), error => error.code === 'invalid_background_image')
  assert.throws(() => validateThemeSettings({
    backgroundImage: '', panelOpacity: 0.1, customCss: ''
  }), error => error.code === 'invalid_panel_opacity')
  assert.throws(() => validateThemeSettings({
    backgroundImage: '', panelOpacity: 0.7, panelBlur: 31, customCss: ''
  }), error => error.code === 'invalid_panel_blur')
  assert.throws(() => validateThemeSettings({
    backgroundImage: '', panelOpacity: 0.7, transparencyMode: 'mist', customCss: ''
  }), error => error.code === 'invalid_transparency_mode')
})
