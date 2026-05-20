import { authApi } from '@/features/auth/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useAuthStore } from '@/stores/auth.store'

/** Khôi phục session từ cookie httpOnly (gọi GET /auth/me). Gộp request trùng. */
let sessionBootstrapInflight: Promise<void> | null = null

export async function ensureSessionFromCookie(): Promise<void> {
  if (isMockApiEnabled()) return

  const { user, accessToken } = useAuthStore.getState()
  if (user || accessToken) return

  if (!sessionBootstrapInflight) {
    sessionBootstrapInflight = authApi
      .me()
      .then((d) => {
        useAuthStore.getState().setSession(d.user, d.accessToken ?? null)
      })
      .catch(() => {
        /* Chưa đăng nhập — xóa token cũ để tránh gửi Authorization lỗi */
        useAuthStore.getState().logout()
      })
      .finally(() => {
        sessionBootstrapInflight = null
      })
  }

  await sessionBootstrapInflight
}
