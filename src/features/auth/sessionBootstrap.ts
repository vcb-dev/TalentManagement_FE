import { authApi } from '@/features/auth/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useAuthStore } from '@/stores/auth.store'

/** Khôi phục session từ cookie httpOnly (gọi GET /auth/me). */
export async function ensureSessionFromCookie(): Promise<void> {
  if (isMockApiEnabled()) return
  const { user, accessToken } = useAuthStore.getState()
  if (user || accessToken) return
  try {
    const d = await authApi.me()
    useAuthStore.getState().setSession(d.user, d.accessToken ?? null)
  } catch {
    /* chưa đăng nhập hoặc cookie hết hạn */
  }
}
