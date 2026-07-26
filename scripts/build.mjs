import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const source = join(root, 'src')

const exists = async path => {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const escapeAttr = value => String(value)
  .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

await rm(dist, { recursive: true, force: true })
await mkdir(join(dist, 'assets'), { recursive: true })

await cp(join(source, 'assets'), join(dist, 'assets'), { recursive: true })
await cp(join(source, 'detail.html'), join(dist, 'detail.html'))

// config.json is deprecated (upstream convention). Deploy-time values are
// baked into index.html as <meta name="apiBase"> / <title> so the same
// runtime code serves both theme-store (same-origin, no meta) and standalone
// static deploys. Sources, by priority:
//   1. env API_BASE / TITLE / REFRESH_INTERVAL — upstream static-build naming,
//      used by CI (Cloudflare Workers Builds / GitHub Actions build variables)
//   2. config/config.local.json — local development, not committed
// THEME_RELEASE=1 ignores both and keeps the output pristine for the store.
let html = await readFile(join(source, 'index.html'), 'utf8')
const localConfig = join(root, 'config', 'config.local.json')
let configNote = 'none (same-origin API, theme-store ready)'

async function resolveBuildConfig() {
  if (process.env.THEME_RELEASE === '1') return null
  const envBases = String(process.env.API_BASE || '').split(',').map(item => item.trim()).filter(Boolean)
  if (envBases.length || process.env.TITLE || process.env.REFRESH_INTERVAL) {
    return {
      note: 'environment (API_BASE/TITLE/REFRESH_INTERVAL)',
      apiBase: envBases,
      title: process.env.TITLE || '',
      refreshInterval: Number(process.env.REFRESH_INTERVAL) || 0
    }
  }
  if (await exists(localConfig)) {
    const config = JSON.parse(await readFile(localConfig, 'utf8'))
    return {
      note: localConfig,
      apiBase: (Array.isArray(config.apiBase) ? config.apiBase : [config.apiBase])
        .map(item => String(item || '').trim()).filter(Boolean),
      title: config.title || '',
      refreshInterval: Number(config.refreshInterval) || 0
    }
  }
  return null
}

const buildConfig = await resolveBuildConfig()
if (buildConfig) {
  if (buildConfig.apiBase.length) {
    html = html.replace(
      /<!-- <meta name="apiBase"[^>]*> -->/,
      `<meta name="apiBase" content="${escapeAttr(buildConfig.apiBase.join(','))}">`
    )
  }
  if (buildConfig.title) {
    html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeAttr(buildConfig.title)}</title>`)
  }
  if (buildConfig.refreshInterval > 0) {
    html = html.replace(
      '</head>',
      `  <meta name="refreshInterval" content="${buildConfig.refreshInterval}">\n  </head>`
    )
  }
  configNote = buildConfig.note
}

await writeFile(join(dist, 'index.html'), html, 'utf8')

console.log(`Built ${dist}`)
console.log(`Config: ${configNote}`)
