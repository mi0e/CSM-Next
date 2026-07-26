/**
 * Server billing display helpers, mirroring upstream CF-Server-Monitor
 * src/utils/serverBilling.js (v2.7.13+): price is a plain amount string with
 * separate currency / billing_cycle / auto_renewal fields. Legacy free-text
 * prices such as "￥30/月" are still parsed for backwards compatibility.
 */

export const BILLING_CYCLES = Object.freeze([
  Object.freeze({ value: 'month', months: 1, shortLabelZh: '月', shortLabelEn: 'M' }),
  Object.freeze({ value: 'quarter', months: 3, shortLabelZh: '季', shortLabelEn: 'Q' }),
  Object.freeze({ value: 'half_year', months: 6, shortLabelZh: '半年', shortLabelEn: 'HY' }),
  Object.freeze({ value: 'year', months: 12, shortLabelZh: '年', shortLabelEn: 'Y' }),
  Object.freeze({ value: 'two_years', months: 24, shortLabelZh: '2年', shortLabelEn: '2Y' }),
  Object.freeze({ value: 'three_years', months: 36, shortLabelZh: '3年', shortLabelEn: '3Y' }),
  Object.freeze({ value: 'four_years', months: 48, shortLabelZh: '4年', shortLabelEn: '4Y' }),
  Object.freeze({ value: 'five_years', months: 60, shortLabelZh: '5年', shortLabelEn: '5Y' })
])

// Order matters: multi-char symbols are matched before single-char fallbacks.
export const CURRENCY_SYMBOLS = Object.freeze([
  '$', '¥', '€', '£', '¥JPY', 'HK$', 'A$', 'C$', 'S$', 'NZ$', '₣', '₩', '₹',
  '฿', '₫', '₱', 'Rp', 'RM', '₺', '₪', '৳', '₨', 'LKR', '₮',
  '₽', 'R$', 'kr', 'zł', '₴', '₸', 'R', '₦', 'EGP', 'د.إ', '﷼', 'Q'
])

const CYCLE_ALIASES = new Map([
  ['月', 'month'], ['monthly', 'month'], ['month', 'month'], ['mo', 'month'],
  ['季', 'quarter'], ['季度', 'quarter'], ['quarter', 'quarter'], ['quarterly', 'quarter'],
  ['半年', 'half_year'], ['halfyear', 'half_year'], ['half_year', 'half_year'], ['half-yearly', 'half_year'],
  ['年', 'year'], ['一年', 'year'], ['year', 'year'], ['yearly', 'year'], ['annual', 'year'],
  ['两年', 'two_years'], ['二年', 'two_years'], ['two_years', 'two_years'], ['2 years', 'two_years'],
  ['三年', 'three_years'], ['three_years', 'three_years'], ['3 years', 'three_years'],
  ['四年', 'four_years'], ['four_years', 'four_years'], ['4 years', 'four_years'],
  ['五年', 'five_years'], ['five_years', 'five_years'], ['5 years', 'five_years']
])

const SINGLE_CHAR_SYMBOLS = new Set(CURRENCY_SYMBOLS.filter(symbol => symbol.length === 1))

/** Amount as "12.34"; "-1" marks free; '' when unset or invalid. */
export function normalizePrice(value) {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  const numberText = raw.match(/-?[\d.,]+/)?.[0]
  if (!numberText) return ''
  const num = Number.parseFloat(numberText.replace(/,/g, ''))
  if (!Number.isFinite(num)) return ''
  if (num === -1) return '-1'
  if (num < 0) return ''
  return num.toFixed(2)
}

export function isFreePrice(value) {
  const price = normalizePrice(value)
  return price === '-1' || price === '0.00'
}

/** Validate a currency field value against the known symbol list. */
export function normalizeCurrency(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const normalized = raw === '￥' ? '¥' : raw
  for (const symbol of CURRENCY_SYMBOLS) {
    if (symbol.length > 1 && normalized.startsWith(symbol)) return symbol
  }
  return SINGLE_CHAR_SYMBOLS.has(normalized[0]) ? normalized[0] : ''
}

/** Extract a currency symbol from legacy free-text prices like "￥30/月". */
export function detectCurrencySymbol(value) {
  const raw = String(value || '')
  if (!raw) return ''
  if (raw.includes('￥')) return '¥'
  for (const symbol of CURRENCY_SYMBOLS) {
    if (symbol.length > 1 && raw.includes(symbol)) return symbol
  }
  return CURRENCY_SYMBOLS.find(symbol => symbol.length === 1 && raw.includes(symbol)) || ''
}

/** Extract a billing cycle from legacy free-text prices; '' when absent. */
export function detectBillingCycle(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  if (/五年|5\s*(y|yr|yrs|year|years)/i.test(raw)) return 'five_years'
  if (/四年|4\s*(y|yr|yrs|year|years)/i.test(raw)) return 'four_years'
  if (/三年|3\s*(y|yr|yrs|year|years)/i.test(raw)) return 'three_years'
  if (/(两年|二年)|2\s*(y|yr|yrs|year|years)/i.test(raw)) return 'two_years'
  if (/半年|half[-_\s]?year/i.test(raw)) return 'half_year'
  if (/季|quarter|\/q\b/i.test(raw)) return 'quarter'
  if (/年|annual|year|yr\b|\/y\b/i.test(raw)) return 'year'
  if (/月|monthly|month|mo\b|\/m\b/i.test(raw)) return 'month'
  return ''
}

export function normalizeBillingCycle(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'month'
  const direct = BILLING_CYCLES.find(item => item.value === raw)
  if (direct) return direct.value
  return CYCLE_ALIASES.get(raw.toLowerCase()) || 'month'
}

export function getBillingCycleOption(value) {
  const normalized = normalizeBillingCycle(value)
  return BILLING_CYCLES.find(item => item.value === normalized) || BILLING_CYCLES[0]
}

/**
 * Format a server's billing info for display: "¥30.00/月" (zh) or
 * "¥30.00/M" (en); "免费"/"Free" for free servers; '' when price is unset.
 */
export function formatBillingPrice(server, lang = 'zh') {
  const price = normalizePrice(server?.price)
  if (!price) return ''
  if (isFreePrice(price)) return lang === 'zh' ? '免费' : 'Free'
  const currency = normalizeCurrency(server?.currency || detectCurrencySymbol(server?.price))
  const cycle = getBillingCycleOption(detectBillingCycle(server?.price) || server?.billing_cycle)
  const cycleLabel = lang === 'zh' ? cycle.shortLabelZh : cycle.shortLabelEn
  return `${currency}${price}/${cycleLabel}`
}
