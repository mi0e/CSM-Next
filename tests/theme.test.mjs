import assert from 'node:assert/strict'
import test from 'node:test'

import {
  THEME_SETTINGS_STORAGE_KEY, clearThemeSettings, exportSiteThemeSnippet,
  loadThemeSettings, saveThemeSettings, siteThemeDefaults
} from '../src/assets/js/shared/theme.js'

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    dump: () => Object.fromEntries(map)
  }
}

test('visitor settings in localStorage take precedence over site defaults', () => {
  const scope = { __CSM_THEME__: { transparencyEnabled: true, transparencyMode: 'glass', panelOpacity: 0.7, panelBlur: 20, customCss: '' } }
  const storage = fakeStorage({
    [THEME_SETTINGS_STORAGE_KEY]: JSON.stringify({ panelOpacity: 0.5, transparencyEnabled: true, transparencyMode: 'soft', panelBlur: 10, customCss: '' })
  })
  const settings = loadThemeSettings({}, { storage, scope })
  assert.equal(settings.storage, 'local')
  assert.equal(settings.panelOpacity, 0.5)
  assert.equal(settings.transparencyMode, 'soft')
})

test('site defaults from window.__CSM_THEME__ apply when no local override exists', () => {
  const scope = { __CSM_THEME__: { backgroundImage: 'https://cdn.example.com/bg.webp', transparencyEnabled: true, transparencyMode: 'glass', panelOpacity: 0.8, panelBlur: 16, customCss: '.a{color:red}' } }
  const settings = loadThemeSettings({}, { storage: fakeStorage(), scope })
  assert.equal(settings.storage, 'site')
  assert.equal(settings.backgroundImage, 'https://cdn.example.com/bg.webp')
  assert.equal(settings.panelOpacity, 0.8)
  assert.equal(settings.customCss, '.a{color:red}')
})

test('malformed injected globals and storage fall back to defaults', () => {
  assert.deepEqual(siteThemeDefaults({ __CSM_THEME__: ['not', 'an', 'object'] }), {})
  assert.deepEqual(siteThemeDefaults({}), {})
  const storage = fakeStorage({ [THEME_SETTINGS_STORAGE_KEY]: '{broken json' })
  const settings = loadThemeSettings({}, { storage, scope: {} })
  assert.equal(settings.storage, 'site')
  assert.equal(settings.panelOpacity, 1)
})

test('save validates, persists and clear restores site defaults', () => {
  const storage = fakeStorage()
  const saved = saveThemeSettings({
    backgroundImage: '', transparencyEnabled: true, transparencyMode: 'glass',
    panelOpacity: 0.6, panelBlur: 24, customCss: ''
  }, { storage })
  assert.equal(saved.storage, 'local')
  assert.ok(storage.dump()[THEME_SETTINGS_STORAGE_KEY].includes('"panelOpacity":0.6'))

  assert.throws(() => saveThemeSettings({ panelOpacity: 42 }, { storage }), /opacity/i)

  clearThemeSettings({ storage })
  assert.equal(storage.dump()[THEME_SETTINGS_STORAGE_KEY], undefined)
  const restored = loadThemeSettings({}, { storage, scope: { __CSM_THEME__: { panelOpacity: 0.9, transparencyEnabled: true, customCss: '' } } })
  assert.equal(restored.storage, 'site')
  assert.equal(restored.panelOpacity, 0.9)
})

test('export snippet is paste-ready for the upstream custom-script box', () => {
  const snippet = exportSiteThemeSnippet({
    backgroundImage: 'https://cdn.example.com/bg.webp', transparencyEnabled: true,
    transparencyMode: 'glass', panelOpacity: 0.75, panelBlur: 18, customCss: ''
  })
  assert.ok(snippet.startsWith('window.__CSM_THEME__ = {'))
  assert.ok(snippet.endsWith('};'))
  assert.ok(snippet.includes('"backgroundImage":"https://cdn.example.com/bg.webp"'))
  assert.ok(!snippet.includes('customCss'))
  assert.throws(() => exportSiteThemeSnippet({ panelOpacity: 42 }), /opacity/i)
})
