import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
      void qc.invalidateQueries({ queryKey: authKeys.me() })
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

  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } catch {
        /* vẫn xóa session phía client */
      }
      logout()
      qc.removeQueries({ queryKey: authKeys.all })
    },
    onSuccess: () => toast.success('Đã đăng xuất'),
    onError: () => toast.error('Đăng xuất lỗi'),
  })
}
