import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { activityApi } from './api'
import { activityKeys } from './queryKeys'
import type { ActivityInput, ActivityMonth } from './types'

export function useMonthActivities(month: ActivityMonth) {
  return useQuery({
    queryKey: activityKeys.month(month),
    queryFn: () => activityApi.listByMonth(month),
  })
}

/** Làm mới mọi tháng — hoạt động có thể được chuyển sang tháng khác hoặc kéo dài qua nhiều tháng. */
function useActivityMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  messages: { success: string; error: string }
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: activityKeys.all })
      toast.success(messages.success)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || messages.error)
    },
  })
}

export function useCreateActivity() {
  return useActivityMutation((input: ActivityInput) => activityApi.create(input), {
    success: 'Đã thêm hoạt động',
    error: 'Không thể thêm hoạt động',
  })
}

export function useUpdateActivity() {
  return useActivityMutation(
    (args: { id: string; input: ActivityInput }) => activityApi.update(args.id, args.input),
    { success: 'Đã cập nhật hoạt động', error: 'Không thể cập nhật hoạt động' }
  )
}

export function useDeleteActivity() {
  return useActivityMutation((id: string) => activityApi.remove(id), {
    success: 'Đã xoá hoạt động',
    error: 'Không thể xoá hoạt động',
  })
}
