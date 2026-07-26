import { normalizeBase } from './url.js'

const LEGACY_JWT_KEY = 'jwt_token'
const JWT_PREFIX = 'csm-next-jwt:'

export function jwtStorageKey(base) {
  return `${JWT_PREFIX}${normalizeBase(base)}`
}

function hasOtherScopedTokens(currentKey) {
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key && key.startsWith(JWT_PREFIX) && key !== currentKey && localStorage.getItem(key)) {
      return true
    }
  }
  return false
}

/**
 * Read JWT for a specific API base.
 * Prefers site-scoped key. Falls back to legacy `jwt_token` only when no other
 * site-scoped tokens exist (same-origin co-host with original admin).
 */
export function getJwt(base) {
  const key = jwtStorageKey(base)
  const scoped = localStorage.getItem(key)
  if (scoped) return scoped
  if (hasOtherScopedTokens(key)) return ''
  return localStorage.getItem(LEGACY_JWT_KEY) || ''
}

/**
 * Persist or clear JWT for a specific API base.
 * Also mirrors the last active token to legacy `jwt_token` for co-hosting.
 */
export function setJwt(token, base) {
  const key = jwtStorageKey(base)
  if (token) {
    localStorage.setItem(key, token)
    localStorage.setItem(LEGACY_JWT_KEY, token)
    return
  }
  localStorage.removeItem(key)
  // Drop legacy only when no remaining site-scoped tokens.
  if (!hasOtherScopedTokens(key)) localStorage.removeItem(LEGACY_JWT_KEY)
}

export function isLoggedIn(base) {
  return Boolean(getJwt(base))
}
