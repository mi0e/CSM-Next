import assert from 'node:assert/strict'
import test from 'node:test'

globalThis.location = {
  origin: 'https://theme.example',
  href: 'https://theme.example/'
}

const { sanitizeBackgroundImage, applyBackgroundImage, joinUrl, metaApiBases, normalizeBase } = await import('../src/assets/js/shared/url.js')
const { isCustomAdminEnabled, originalAdminUrl, resolveAdminUrl } = await import('../src/assets/js/shared/admin.js')

test('sanitizeBackgroundImage allows https only', () => {
  assert.equal(
    sanitizeBackgroundImage('https://cdn.example.com/bg.webp'),
    'https://cdn.example.com/bg.webp'
  )
  assert.equal(sanitizeBackgroundImage('http://cdn.example.com/bg.webp'), '')
  assert.equal(sanitizeBackgroundImage('javascript:alert(1)'), '')
  assert.equal(sanitizeBackgroundImage('data:image/png;base64,abc'), '')
  assert.equal(sanitizeBackgroundImage(''), '')
  assert.equal(sanitizeBackgroundImage('not a url'), '')
})

test('sanitizeBackgroundImage escapes CSS breakout characters', () => {
  const safe = sanitizeBackgroundImage('https://cdn.example.com/a"b)c.webp')
  assert.ok(safe.startsWith('https://cdn.example.com/'))
  assert.ok(!safe.includes('"'))
  assert.ok(!safe.includes(')'))
})

test('applyBackgroundImage sets or clears body styles', () => {
  const target = {
    style: { backgroundImage: '' },
    classList: {
      values: new Set(),
      add(name) { this.values.add(name) },
      remove(name) { this.values.delete(name) }
    }
  }
  applyBackgroundImage('https://cdn.example.com/bg.webp', target)
  assert.equal(target.style.backgroundImage, 'url("https://cdn.example.com/bg.webp")')
  assert.ok(target.classList.values.has('has-background'))

  applyBackgroundImage('http://evil.example/bg.webp', target)
  assert.equal(target.style.backgroundImage, '')
  assert.ok(!target.classList.values.has('has-background'))
})

test('joinUrl and normalizeBase stay stable', () => {
  assert.equal(joinUrl('https://a.example/', '/api/config'), 'https://a.example/api/config')
  assert.equal(normalizeBase('https://a.example/'), 'https://a.example')
})

test('admin URL defaults upstream and only uses theme admin when enabled', () => {
  const options = {
    siteBase: 'https://api.example.workers.dev/base',
    siteIndex: 2,
    pageUrl: 'https://theme.example/index.html'
  }
  assert.equal(isCustomAdminEnabled({}), false)
  assert.equal(isCustomAdminEnabled({ customAdminEnabled: 'true' }), true)
  assert.equal(originalAdminUrl(options.siteBase), 'https://api.example.workers.dev/#/admin')
  assert.equal(resolveAdminUrl({}, options), 'https://api.example.workers.dev/#/admin')
  assert.equal(
    resolveAdminUrl({ customAdminEnabled: true }, options),
    'https://theme.example/admin.html?site=2'
  )
  assert.equal(
    resolveAdminUrl({}, { ...options, preview: true }),
    'https://theme.example/admin.html?preview=1&site=2'
  )
})

test('metaApiBases reads the upstream meta tag convention', () => {
  const doc = (content) => ({
    querySelector: (selector) => selector === 'meta[name="apiBase"]' && content !== null
      ? { getAttribute: () => content }
      : null
  })
  assert.deepEqual(
    metaApiBases(doc(' https://a.example , https://b.example ')),
    ['https://a.example', 'https://b.example']
  )
  assert.deepEqual(metaApiBases(doc('https://a.example')), ['https://a.example'])
  assert.deepEqual(metaApiBases(doc('')), [])
  assert.deepEqual(metaApiBases(doc(null)), [])
  assert.deepEqual(metaApiBases(null), [])
})
