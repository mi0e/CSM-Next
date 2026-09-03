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
  assert.match(home, /id="themeGlobeEnabled"[^>]+type="checkbox"[^>]+role="switch"/)
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

test('overview defaults to five cards and keeps the optional globe outside the two list views', async () => {
  const home = await readHome()
  const overview = home.match(/<section class="overview-shell"[\s\S]+?<section class="dashboard-controls"/)?.[0] || ''
  assert.equal((overview.match(/<article(?: id="currentTimeCard")? class="overview-card/g) || []).length, 5)
  assert.match(overview, /id="currentTimeCard"/)
  assert.match(overview, /id="currentTime"/)
  assert.match(overview, /id="serverGlobe"[^>]+hidden/)
  assert.match(overview, /<canvas class="globe-canvas"[^>]+tabindex="0"/)
  assert.match(overview, /currentDate|当前时间/)

  const gridIndex = home.indexOf('id="gridView"')
  const tableIndex = home.indexOf('id="tableView"')
  const globeIndex = home.indexOf('id="serverGlobe"')
  assert.ok(globeIndex > 0 && globeIndex < gridIndex && globeIndex < tableIndex)
  assert.equal((home.match(/class="view-button/g) || []).length, 2)
  assert.deepEqual([...home.matchAll(/class="view-button[^>]+data-view="([^"]+)"/g)].map(match => match[1]), ['grid', 'table'])
})

test('dashboard globe synchronization is reachable from renderAll and filter paths', async () => {
  const dashboard = await readFile(resolve(root, 'src/assets/js/dashboard.js'), 'utf8')
  const renderAll = dashboard.match(/function renderAll\(\)\s*\{([\s\S]*?)\n\}/)?.[1] || ''
  const timeline = dashboard.match(/function renderProbeTimeline\(buckets\)\s*\{([\s\S]*?)\n\}/)?.[1] || ''
  assert.match(renderAll, /updateGlobe\(\)/)
  assert.doesNotMatch(timeline, /globe|updateGlobe/)
  assert.ok((dashboard.match(/updateGlobe\(\)/g) || []).length >= 4)
})

test('COBE is pinned and vendored locally with its license', async () => {
  const globe = await readFile(resolve(root, 'src/assets/js/shared/globe.js'), 'utf8')
  const bundle = await readFile(resolve(root, 'src/assets/vendor/cobe-2.0.1/index.esm.js'), 'utf8')
  const license = await readFile(resolve(root, 'src/assets/vendor/cobe-2.0.1/LICENSE'), 'utf8')
  assert.match(globe, /vendor\/cobe-2\.0\.1\/index\.esm\.js/)
  assert.match(bundle, /data:image\/png;base64/)
  assert.match(license, /MIT License/)
  assert.doesNotMatch(globe, /from ['"]cobe['"]/)
  assert.match(globe, /catch\s*\{[\s\S]*?restoreCobeCanvas\(canvas, originalParent, originalNextSibling\)[\s\S]*?mountFallback/)
})

test('enabled overview uses a consistent two-column by three-row card grid', async () => {
  const css = await readFile(resolve(root, 'src/assets/css/main.css'), 'utf8')
  const base = css.slice(css.indexOf('.overview-shell.is-globe-enabled .overview-grid'), css.indexOf('.overview-shell:not(.is-globe-enabled)'))
  const at840 = css.slice(css.indexOf('@media (max-width: 840px)'), css.indexOf('@media (max-width: 560px)'))
  const at560 = css.slice(css.indexOf('@media (max-width: 560px)'))
  assert.match(base, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(base, /grid-template-rows:\s*repeat\(3,\s*minmax\(110px,\s*1fr\)\)/)
  assert.match(at560, /\.overview-shell\.is-globe-enabled \.overview-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,[^}]*grid-template-rows:\s*repeat\(3,\s*minmax\(102px,\s*auto\)\)/)
  assert.doesNotMatch(css, /\.overview-shell\.is-globe-enabled #currentTimeCard/)
  assert.doesNotMatch(css, /\.overview-shell\.is-globe-enabled \.overview-grid > \.overview-card:not\(#currentTimeCard\)/)
  assert.match(at840, /\.overview-shell:not\(\.is-globe-enabled\) #currentTimeCard\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/)
  assert.match(at560, /\.overview-shell:not\(\.is-globe-enabled\) #currentTimeCard\s*\{[^}]*grid-column:\s*auto/)
})

test('history timeline uses a dynamic number of equal tracks without clipped edge blocks', async () => {
  const css = await readFile(resolve(root, 'src/assets/css/main.css'), 'utf8')
  const timeline = css.match(/\.probe-timeline\s*\{([^}]+)\}/)?.[1] || ''
  const block = css.match(/\.probe-time-block\s*\{([^}]+)\}/)?.[1] || ''

  assert.match(timeline, /display:\s*grid/)
  assert.match(timeline, /grid-template-columns:\s*repeat\(var\(--probe-history-buckets,\s*24\),\s*minmax\(0,\s*1fr\)\)/)
  assert.match(timeline, /padding:\s*0/)
  assert.match(timeline, /overflow:\s*visible/)
  assert.match(block, /width:\s*100%/)
  assert.match(block, /height:\s*14px/)
  assert.match(block, /box-sizing:\s*border-box/)
  assert.match(block, /margin:\s*0/)
})
