import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { summarizeExpirations } from '../src/assets/js/shared/expiry.js'

const now = new Date(2026, 9, 2, 23, 59, 59).getTime()
const node = (expire_date, extra = {}) => ({ expire_date, _siteIndex: 0, ...extra })

test('expiry counts today through day 30 inclusively, excluding day 31', () => {
  assert.deepEqual(summarizeExpirations([
    node('2026-10-01'),
    node('2026-10-02'),
    node('2026-11-01'),
    node('2026-11-02')
  ], [], now), { upcoming: 2, expired: 1, available: true })
})

test('valid distant dates remain available even when no renewal is due', () => {
  assert.deepEqual(summarizeExpirations([node('2027-01-01')], [], now), {
    upcoming: 0, expired: 0, available: true
  })
})

test('missing, invalid and timestamp-shaped expiry dates are unavailable', () => {
  const invalid = [
    undefined, null, '', 'never', false, 1790899200000,
    '2026-02-30', '2026-02-29', '2026-04-31', '2026-13-01',
    '2026-00-01', '2026-10-00', '0000-01-01', '2026-1-02',
    '2026-10-02T00:00:00Z', '2026-10-02T23:00:00-05:00'
  ]
  assert.deepEqual(summarizeExpirations(invalid.map(date => node(date)), [], now), {
    upcoming: 0, expired: 0, available: false
  })
  assert.deepEqual(summarizeExpirations([], [], now), {
    upcoming: 0, expired: 0, available: false
  })
})

test('leap days are validated without rolling invalid dates into March', () => {
  const leapYearNow = new Date(2028, 1, 28, 12).getTime()
  assert.deepEqual(summarizeExpirations([
    node('2028-02-29'), node('2028-02-30'), node('2027-02-29')
  ], [], leapYearNow), { upcoming: 1, expired: 0, available: true })
})

test('each source site controls whether its expiry dates may be summarized', () => {
  const siteConfigs = [{ show_expire: false }, { show_expire: true }, { show_expire: 'false' }]
  const hidden = [
    node('2026-10-03', { _siteIndex: 0 }),
    node('2026-09-01', { _siteIndex: 2 })
  ]
  assert.deepEqual(summarizeExpirations(hidden, siteConfigs, now), {
    upcoming: 0, expired: 0, available: false
  })
  assert.deepEqual(summarizeExpirations([
    ...hidden,
    node('2026-10-03', { _siteIndex: 1 }),
    node('2026-09-01', { _siteIndex: 1 }),
    node('2026-10-04', { _siteIndex: 3 })
  ], siteConfigs, now), { upcoming: 2, expired: 1, available: true })
})

test('offline nodes still need renewal', () => {
  assert.deepEqual(summarizeExpirations([
    node('2026-10-03', { last_updated: 0, report_timestamp: 0 }),
    node('2026-10-01', { last_updated: 0, report_timestamp: 0 })
  ], [], now), { upcoming: 1, expired: 1, available: true })
})

function summarizeInTimezone(timezone, dates, instant) {
  const moduleUrl = new URL('../src/assets/js/shared/expiry.js', import.meta.url).href
  const script = [
    'import { summarizeExpirations } from ' + JSON.stringify(moduleUrl),
    'const servers = ' + JSON.stringify(dates.map(date => node(date))),
    'console.log(JSON.stringify(summarizeExpirations(servers, [], ' + JSON.stringify(instant) + ')))'
  ].join('\n')
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    env: { ...process.env, TZ: timezone }
  })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

test('expiry follows the local calendar even when UTC is still the previous day', () => {
  assert.deepEqual(summarizeInTimezone('Asia/Shanghai', [
    '2026-10-01', '2026-10-02', '2026-11-01', '2026-11-02'
  ], '2026-10-02T00:30:00+08:00'), { upcoming: 2, expired: 1, available: true })
})

test('the 30-day window uses calendar days across daylight-saving changes', () => {
  assert.deepEqual(summarizeInTimezone('America/New_York', [
    '2026-03-06', '2026-03-07', '2026-04-06', '2026-04-07'
  ], '2026-03-07T23:30:00-05:00'), { upcoming: 2, expired: 1, available: true })
})
