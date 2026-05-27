import { authApi } from '@/features/auth/api'
import { loadSessionToken } from '@/features/auth/sessionTokenStorage'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useAuthStore } from '@/stores/auth.store'

/** Khôi phục session từ cookie httpOnly (gọi GET /auth/me). Gộp request trùng. */
let sessionBootstrapInflight: Promise<void> | null = null

export async function ensureSessionFromCookie(): Promise<void> {
  if (isMockApiEnabled()) return

  const { user, accessToken } = useAuthStore.getState()
  if (user) return

  const storedToken = accessToken ?? loadSessionToken()
  if (storedToken && !accessToken) {
    useAuthStore.getState().setAccessToken(storedToken)
  }

  if (!sessionBootstrapInflight) {
    sessionBootstrapInflight = authApi
      .me()
      .then((d) => {
        if (d.user) {
          useAuthStore.getState().setSession(d.user, d.accessToken ?? storedToken ?? null)
        } else {
          useAuthStore.getState().logout()
        }
      })
      .catch(() => {
        useAuthStore.getState().logout()
      })
      .finally(() => {
        sessionBootstrapInflight = null
      })
  }

  await sessionBootstrapInflight
}
