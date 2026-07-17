import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSiteTitle } from '../src/assets/js/shared/title.js'

test('upstream site title is authoritative over theme fallback', () => {
  assert.equal(
    resolveSiteTitle({ title: 'Theme fallback' }, { site_title: 'Original backend title' }),
    'Original backend title'
  )
})

test('site title falls back cleanly when upstream has no value', () => {
  assert.equal(resolveSiteTitle({ title: 'Theme fallback' }, { site_title: '  ' }), 'Theme fallback')
  assert.equal(resolveSiteTitle({}, {}), 'CF-Server-Monitor')
})

test('first available upstream title wins for multi-site dashboards', () => {
  assert.equal(
    resolveSiteTitle({ title: 'Fallback' }, [{ site_title: '' }, { site_title: 'Site B' }]),
    'Site B'
  )
})
