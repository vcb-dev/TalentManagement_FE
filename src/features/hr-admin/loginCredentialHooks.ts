import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { employeeApi } from '@/features/hr-admin/api'
import { employeeKeys } from '@/features/hr-admin/queryKeys'

export function useEmployeeLoginCredential(employeeId: string, enabled: boolean) {
  return useQuery({
    queryKey: employeeKeys.loginCredential(employeeId),
    queryFn: () => employeeApi.getLoginCredential(employeeId),
    enabled: enabled && employeeId.length > 0,
  })
}

export function useUpsertEmployeeLoginCredential(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { username: string; password: string }) =>
      employeeApi.upsertLoginCredential(employeeId, body),
    onSuccess: (data) => {
      qc.setQueryData(employeeKeys.loginCredential(employeeId), data)
      toast.success('Đã lưu tài khoản đăng nhập')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err) || 'Không lưu được tài khoản đăng nhập')
    },
  })
}
