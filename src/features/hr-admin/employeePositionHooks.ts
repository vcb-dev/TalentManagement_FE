import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { employeePositionApi, type EmployeePositionInput } from './employeePosition'
import { employeeKeys, employeePositionKeys } from './queryKeys'

export function useEmployeePositions(enabled = true) {
  return useQuery({
    queryKey: employeePositionKeys.all,
    queryFn: () => employeePositionApi.list(),
    staleTime: 60_000,
    enabled,
  })
}

function usePositionMutation<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  messages: { success: string; error: string }
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeePositionKeys.all })
      // Tên chức vụ hiện trên thẻ nhân sự / hồ sơ.
      void qc.invalidateQueries({ queryKey: employeeKeys.all })
      toast.success(messages.success)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || messages.error)
    },
  })
}

export function useCreateEmployeePosition() {
  return usePositionMutation((input: EmployeePositionInput) => employeePositionApi.create(input), {
    success: 'Đã thêm chức vụ',
    error: 'Không thể thêm chức vụ',
  })
}

export function useUpdateEmployeePosition() {
  return usePositionMutation(
    (args: { id: string; input: Partial<EmployeePositionInput> & { isActive?: boolean } }) =>
      employeePositionApi.update(args.id, args.input),
    { success: 'Đã cập nhật chức vụ', error: 'Không thể cập nhật chức vụ' }
  )
}

export function useDeleteEmployeePosition() {
  return usePositionMutation((id: string) => employeePositionApi.remove(id), {
    success: 'Đã xoá chức vụ',
    error: 'Không thể xoá chức vụ',
  })
}
