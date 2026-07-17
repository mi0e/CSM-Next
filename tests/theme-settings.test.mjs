import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeThemeSettings, safeCustomCss, validateThemeSettings
} from '../src/assets/js/shared/theme-settings.js'

test('theme settings normalize safe values and clamp stored opacity', () => {
  assert.deepEqual(normalizeThemeSettings({
    backgroundImage: 'https://cdn.example.com/bg.webp',
    panelOpacity: 0.72,
    customCss: '.brand-title { letter-spacing: .1em; }'
  }), {
    backgroundImage: 'https://cdn.example.com/bg.webp',
    panelOpacity: 0.72,
    customCss: '.brand-title { letter-spacing: .1em; }'
  })
  assert.equal(normalizeThemeSettings({ panelOpacity: 9 }).panelOpacity, 1)
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
})
