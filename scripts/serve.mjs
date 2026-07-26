import { access, readFile, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import http from 'node:http'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const host = '127.0.0.1'
const port = Number(process.env.PORT || 4173)

// Flags/OS icons are upstream Worker static assets and are intentionally not
// bundled with the theme. For local preview we lazily proxy them from the
// upstream repo so ?preview=1 still shows flags; failures fall back to the
// in-page text-code rendering.
const UPSTREAM_STATIC = 'https://raw.githubusercontent.com/huilang-me/CF-Server-Monitor/main/public'
const upstreamCache = new Map()

try {
  await access(join(dist, 'index.html'), constants.R_OK)
} catch {
  await import(`./build.mjs?serve=${Date.now()}`)
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
}

async function proxyUpstreamStatic(pathname, response) {
  if (upstreamCache.has(pathname)) {
    const hit = upstreamCache.get(pathname)
    response.writeHead(hit.status, hit.headers)
    response.end(hit.body)
    return
  }
  try {
    const res = await fetch(`${UPSTREAM_STATIC}${pathname}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = Buffer.from(await res.arrayBuffer())
    const headers = {
      'Content-Type': contentTypes[extname(pathname).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    }
    upstreamCache.set(pathname, { status: 200, headers, body })
    response.writeHead(200, headers)
    response.end(body)
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not Found')
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`)
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
    if (pathname.startsWith('/flags/') || pathname.startsWith('/os-icons/')) {
      await proxyUpstreamStatic(pathname, response)
      return
    }
    const file = resolve(dist, `.${pathname}`)
    if (file !== dist && !file.startsWith(`${dist}${sep}`)) {
      response.writeHead(403).end('Forbidden')
      return
    }
    const info = await stat(file)
    const target = info.isDirectory() ? join(file, 'index.html') : file
    const body = await readFile(target)
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    })
    response.end(body)
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not Found')
  }
})

server.listen(port, host, () => {
  console.log(`Preview: http://${host}:${port}/?preview=1`)
  console.log(`Real API: http://${host}:${port}/`)
})
