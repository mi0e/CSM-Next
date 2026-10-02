const DAY_MS = 24 * 60 * 60 * 1000

// UTC is only used for calendar arithmetic, so daylight-saving transitions do not
// make one local calendar day shorter or longer than another.
function calendarDay(year, month, day) {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.getTime() / DAY_MS
}

function expiryDay(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const [, year, month, day] = match.map(Number)
  if (year < 1) return null
  return calendarDay(year, month, day)
}

/**
 * Count visible expiry dates by the viewer's local calendar day.
 * Upstream expire_date is YYYY-MM-DD; timestamps are deliberately rejected to
 * avoid treating a timezone-converted date as a different billing date.
 * Today and the next 30 days are upcoming; dates before today are expired.
 */
export function summarizeExpirations(servers, siteConfigs = [], now = Date.now()) {
  const summary = { upcoming: 0, expired: 0, available: false }
  const localNow = new Date(now)
  if (!Number.isFinite(localNow.getTime())) return summary
  const today = calendarDay(localNow.getFullYear(), localNow.getMonth() + 1, localNow.getDate())

  for (const server of servers) {
    const showExpiry = siteConfigs[server?._siteIndex]?.show_expire
    if (showExpiry === false || showExpiry === 'false') continue
    const expiry = expiryDay(server?.expire_date)
    if (expiry === null) continue

    summary.available = true
    const daysLeft = expiry - today
    if (daysLeft < 0) summary.expired += 1
    else if (daysLeft <= 30) summary.upcoming += 1
  }

  return summary
}
