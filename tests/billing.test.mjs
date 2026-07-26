import assert from 'node:assert/strict'
import test from 'node:test'

const {
  normalizePrice, isFreePrice, normalizeCurrency, detectCurrencySymbol,
  detectBillingCycle, normalizeBillingCycle, getBillingCycleOption, formatBillingPrice
} = await import('../src/assets/js/shared/billing.js')

test('normalizePrice keeps two decimals and free markers', () => {
  assert.equal(normalizePrice('30'), '30.00')
  assert.equal(normalizePrice('30.5'), '30.50')
  assert.equal(normalizePrice('1,200.5'), '1200.50')
  assert.equal(normalizePrice('￥30/月'), '30.00')
  assert.equal(normalizePrice('0'), '0.00')
  assert.equal(normalizePrice('-1'), '-1')
  assert.equal(normalizePrice('-5'), '')
  assert.equal(normalizePrice(''), '')
  assert.equal(normalizePrice(null), '')
  assert.equal(normalizePrice('N/A'), '')
})

test('isFreePrice marks 0 and -1 as free', () => {
  assert.equal(isFreePrice('0'), true)
  assert.equal(isFreePrice('0.00'), true)
  assert.equal(isFreePrice('-1'), true)
  assert.equal(isFreePrice('30.00'), false)
  assert.equal(isFreePrice(''), false)
})

test('normalizeCurrency validates symbols and maps fullwidth yen', () => {
  assert.equal(normalizeCurrency('¥'), '¥')
  assert.equal(normalizeCurrency('￥'), '¥')
  assert.equal(normalizeCurrency('HK$'), 'HK$')
  assert.equal(normalizeCurrency('$'), '$')
  assert.equal(normalizeCurrency('x'), '')
  assert.equal(normalizeCurrency(''), '')
})

test('detectCurrencySymbol reads legacy price text', () => {
  assert.equal(detectCurrencySymbol('￥30/月'), '¥')
  assert.equal(detectCurrencySymbol('HK$50/mo'), 'HK$')
  assert.equal(detectCurrencySymbol('€22/Year'), '€')
  assert.equal(detectCurrencySymbol('30.00'), '')
})

test('detectBillingCycle reads legacy price text', () => {
  assert.equal(detectBillingCycle('¥30/月'), 'month')
  assert.equal(detectBillingCycle('$24/Year'), 'year')
  assert.equal(detectBillingCycle('£16/2 years'), 'two_years')
  assert.equal(detectBillingCycle('€10/quarter'), 'quarter')
  assert.equal(detectBillingCycle('30.00'), '')
})

test('normalizeBillingCycle falls back to month', () => {
  assert.equal(normalizeBillingCycle('year'), 'year')
  assert.equal(normalizeBillingCycle('月'), 'month')
  assert.equal(normalizeBillingCycle('unknown'), 'month')
  assert.equal(normalizeBillingCycle(''), 'month')
  assert.equal(getBillingCycleOption('half_year').shortLabelEn, 'HY')
})

test('formatBillingPrice renders new billing fields', () => {
  const server = { price: '30.00', currency: '¥', billing_cycle: 'month' }
  assert.equal(formatBillingPrice(server, 'zh'), '¥30.00/月')
  assert.equal(formatBillingPrice(server, 'en'), '¥30.00/M')
  assert.equal(formatBillingPrice({ price: '120.00', currency: '€', billing_cycle: 'year' }, 'zh'), '€120.00/年')
})

test('formatBillingPrice renders free and unset prices', () => {
  assert.equal(formatBillingPrice({ price: '0' }, 'zh'), '免费')
  assert.equal(formatBillingPrice({ price: '-1' }, 'en'), 'Free')
  assert.equal(formatBillingPrice({ price: '' }, 'zh'), '')
  assert.equal(formatBillingPrice({}, 'zh'), '')
  assert.equal(formatBillingPrice(null, 'zh'), '')
})

test('formatBillingPrice stays compatible with legacy free text', () => {
  assert.equal(formatBillingPrice({ price: '￥30/月' }, 'zh'), '¥30.00/月')
  assert.equal(formatBillingPrice({ price: '$24/Year' }, 'en'), '$24.00/Y')
  // Explicit new fields win over nothing, legacy text wins over billing_cycle.
  assert.equal(formatBillingPrice({ price: '€22/Year', billing_cycle: 'month' }, 'zh'), '€22.00/年')
})
