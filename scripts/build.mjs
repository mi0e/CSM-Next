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

await rm(dist, { recursive: true, force: true })
await mkdir(join(dist, 'assets'), { recursive: true })

await cp(join(source, 'assets'), join(dist, 'assets'), { recursive: true })
await cp(join(source, 'pages', 'index.html'), join(dist, 'index.html'))
await cp(join(source, 'pages', 'detail.html'), join(dist, 'detail.html'))

const localConfig = join(root, 'config', 'config.local.json')
const exampleConfig = join(root, 'config', 'config.example.json')
const selectedConfig = await exists(localConfig) ? localConfig : exampleConfig
const config = JSON.parse(await readFile(selectedConfig, 'utf8'))
await writeFile(join(dist, 'config.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8')

console.log(`Built ${dist}`)
console.log(`Config: ${selectedConfig}`)
