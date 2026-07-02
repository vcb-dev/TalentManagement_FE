import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { authApi } from './api'
import { authKeys } from './queryKeys'
import { useAuthStore } from '@/stores/auth.store'

export function useAuthMe(options?: { enabled?: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authApi.me(),
    enabled:
      options?.enabled ??
      (isMockApiEnabled() ? accessToken != null : user != null || accessToken != null),
  })
}

export function useLogin() {
  const qc = useQueryClient()
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if (!data.user) {
        toast.error('Đăng nhập thất bại')
        return
      }
      setSession(data.user, data.accessToken ?? null)
      qc.setQueryData(authKeys.me(), data)
      toast.success('Đăng nhập thành công')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err) || 'Đăng nhập thất bại')
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async () => {
      // Giữ token lại trước khi xóa store — request logout bên dưới cần nó
      // làm Bearer header để BE xóa cache phiên khi cookie không khả dụng.
      const accessToken = useAuthStore.getState().accessToken

      // Xóa session ở client ngay lập tức
      logout()
      qc.clear() // Xóa toàn bộ cache để đảm bảo an toàn bảo mật

      // Phải đợi server xóa cookie session xong rồi mới điều hướng.
      // Nếu không await, navigate('/') có thể chạy ensureSessionFromCookie()
      // và gọi GET /auth/me trong lúc cookie cũ chưa kịp bị xóa (race condition),
      // khiến phiên đăng nhập bị khôi phục lại ngay sau khi vừa logout.
      await authApi.logout(accessToken).catch(() => {
        /* Bỏ qua lỗi vì client đã logout xong */
      })
    },
    onSuccess: () => {
      toast.success('Đã đăng xuất')
      navigate({ to: '/' })
    },
    onError: () => toast.error('Đăng xuất lỗi'),
  })
}
