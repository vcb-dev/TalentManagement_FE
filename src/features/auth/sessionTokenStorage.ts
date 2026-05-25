/** Khớp JWT_EXPIRES_SEC trên BE (12 giờ). */
export const SESSION_MAX_AGE_SEC = 12 * 60 * 60

const TOKEN_KEY = 'tm_auth_token'
const EXP_KEY = 'tm_auth_exp'

export function persistSessionToken(token: string) {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(EXP_KEY, String(Date.now() + SESSION_MAX_AGE_SEC * 1000))
}

export function loadSessionToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  const exp = Number(sessionStorage.getItem(EXP_KEY))
  if (!Number.isFinite(exp) || Date.now() > exp) {
    clearSessionToken()
    return null
  }
  return sessionStorage.getItem(TOKEN_KEY)
}

export function clearSessionToken() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXP_KEY)
}
