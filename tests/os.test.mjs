import { test } from 'node:test'
import assert from 'node:assert/strict'
import { osIconMarkup, osName } from '../src/assets/js/shared/os.js'

test('osName follows komari-next keyword matching', () => {
  assert.equal(osName('Debian GNU/Linux 12 (bookworm)'), 'Debian')
  assert.equal(osName('Proxmox VE 8.2'), 'Proxmox VE')
  assert.equal(osName('Alpine Linux v3.20'), 'Alpine Linux')
  assert.equal(osName('SomethingNew 1.0'), 'SomethingNew')
  assert.equal(osName(''), 'Unknown')
})

test('osIconMarkup points at upstream /os-icons/ with an unknown fallback', () => {
  assert.match(osIconMarkup('Ubuntu 24.04', 'https://api.example'), /src="https:\/\/api\.example\/os-icons\/os-ubuntu\.svg"/)
  assert.match(osIconMarkup('FreeBSD 14', 'https://api.example'), /os-icons\/os-unknown\.svg/)
  assert.match(osIconMarkup('', 'https://api.example'), /os-icons\/os-unknown\.svg/)
})
