import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { employeeCardColorApi, type EmployeeCardColorInput } from './employeeCard'
import { employeeCardColorKeys } from './queryKeys'

export function useEmployeeCardColors(enabled = true) {
  return useQuery({
    queryKey: employeeCardColorKeys.all,
    queryFn: () => employeeCardColorApi.list(),
    staleTime: 60_000,
    enabled,
  })
}

function useCardColorMutation<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  messages: { success: string; error: string }
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeCardColorKeys.all })
      toast.success(messages.success)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || messages.error)
    },
  })
}

export function useCreateEmployeeCardColor() {
  return useCardColorMutation(
    (input: EmployeeCardColorInput) => employeeCardColorApi.create(input),
    { success: 'Đã thêm màu thẻ', error: 'Không thể thêm màu thẻ' }
  )
}

export function useUpdateEmployeeCardColor() {
  return useCardColorMutation(
    (args: { id: string; input: Partial<EmployeeCardColorInput> & { isActive?: boolean } }) =>
      employeeCardColorApi.update(args.id, args.input),
    { success: 'Đã cập nhật màu thẻ', error: 'Không thể cập nhật màu thẻ' }
  )
}

export function useDeleteEmployeeCardColor() {
  return useCardColorMutation((id: string) => employeeCardColorApi.remove(id), {
    success: 'Đã xoá màu thẻ',
    error: 'Không thể xoá màu thẻ',
  })
}
