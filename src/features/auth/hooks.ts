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
      setSession(data.user, data.accessToken ?? null)
      // Seed the query cache immediately with the login response
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
      // Xóa session ở client ngay lập tức để chuyển hướng tức thì
      logout()
      qc.clear() // Xóa toàn bộ cache để đảm bảo an toàn bảo mật

      // Gọi API logout chạy ngầm, không cần await để tránh làm chậm UI
      authApi.logout().catch(() => {
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
