import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const readHome = () => readFile(resolve(root, 'src/index.html'), 'utf8')

test('single entry hosts both views as templates behind the hash router', async () => {
  const home = await readHome()
  assert.match(home, /<div id="appRoot">/)
  assert.match(home, /<template id="viewDashboard">/)
  assert.match(home, /<template id="viewServerDetail">/)
  assert.match(home, /assets\/js\/app\.js/)
  // Upstream theme-store contract: no page-level config.json, hash routes only.
  assert.doesNotMatch(home, /config\.json/)
  assert.doesNotMatch(home, /detail\.html/)
})

test('legacy detail.html is a redirect stub into the hash router', async () => {
  const stub = await readFile(resolve(root, 'src/detail.html'), 'utf8')
  assert.match(stub, /location\.replace/)
  assert.match(stub, /#\/server\//)
  assert.doesNotMatch(stub, /assets\/js\/detail\.js/)
})

test('footer links to the upstream and theme repositories', async () => {
  const home = await readHome()
  assert.match(home, /href="https:\/\/github\.com\/huilang-me\/CF-Server-Monitor"/)
  assert.match(home, /href="https:\/\/github\.com\/mi0e\/CSM-Next"/)
  assert.match(home, /target="_blank" rel="noopener noreferrer"/)
  assert.match(home, /id="versionText"/)
})

test('toolbar keeps theme customization before authorization and drawer stays local-first', async () => {
  const home = await readHome()
  const settingsIndex = home.indexOf('id="themeSettingsButton"')
  const authIndex = home.indexOf('id="authButton"')
  assert.ok(settingsIndex > 0 && authIndex > settingsIndex)
  assert.match(home, /id="themeDrawer"/)
  assert.match(home, /id="themeTransparencyEnabled"[^>]+type="checkbox"/)
  assert.match(home, /id="themeTransparencySoft"[^>]+type="radio"/)
  assert.match(home, /id="themeTransparencyGlass"[^>]+type="radio"/)
  assert.match(home, /id="themeTransparencyIntensity"[^>]+type="range"/)
  assert.match(home, /id="themePanelBlur"[^>]+type="range"/)
  assert.match(home, /id="themeCustomCss"/)
  // KV upload flow was removed with the standalone Worker; the drawer now
  // saves to localStorage and exports a site-wide snippet for the owner.
  assert.doesNotMatch(home, /id="themeBackgroundUpload"/)
  assert.match(home, /id="themeSettingsExport"/)
  for (const group of ['background', 'effects', 'advanced']) {
    assert.match(home, new RegExp(`data-theme-group="${group}"`))
  }
})

test('both view templates use locally inlined Lucide icons and no CDN assets', async () => {
  const home = await readHome()
  for (const name of ['refresh-cw', 'sun-moon', 'languages', 'palette', 'circle-user-round', 'layout-dashboard', 'settings']) {
    assert.match(home, new RegExp(`data-lucide="${name}"`))
  }
  assert.doesNotMatch(home, /jsdelivr|unpkg|cdnjs/)
})

test('history timeline uses 24 equal grid tracks without clipped edge blocks', async () => {
  const css = await readFile(resolve(root, 'src/assets/css/main.css'), 'utf8')
  const timeline = css.match(/\.probe-timeline\s*\{([^}]+)\}/)?.[1] || ''
  const block = css.match(/\.probe-time-block\s*\{([^}]+)\}/)?.[1] || ''

  assert.match(timeline, /display:\s*grid/)
  assert.match(timeline, /grid-template-columns:\s*repeat\(24,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(timeline, /padding:\s*0/)
  assert.match(timeline, /overflow:\s*visible/)
  assert.match(block, /width:\s*100%/)
  assert.match(block, /height:\s*14px/)
  assert.match(block, /box-sizing:\s*border-box/)
  assert.match(block, /margin:\s*0/)
})
