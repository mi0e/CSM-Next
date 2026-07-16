import assert from 'node:assert/strict'
import test from 'node:test'

globalThis.location = {
  origin: 'https://theme.example',
  href: 'https://theme.example/'
}

const { sanitizeBackgroundImage, applyBackgroundImage, joinUrl, normalizeBase } = await import('../src/assets/js/shared/url.js')

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
