import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { editorClassesApi, type BulkExamScheduleInput } from './api'
import { editorClassesKeys } from './queryKeys'

export function useEditorClasses() {
  return useQuery({
    queryKey: editorClassesKeys.list(),
    queryFn: editorClassesApi.list,
  })
}

export function useSyncEditorClasses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dryRun?: boolean) => editorClassesApi.sync(dryRun),
    onSuccess: (data) => {
      if (!data.dryRun) {
        void qc.invalidateQueries({ queryKey: editorClassesKeys.list() })
        toast.success('Đã đồng bộ lớp Editor')
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useBulkCreateExamSchedules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkExamScheduleInput) => editorClassesApi.bulkExamSchedules(input),
    onSuccess: (data) => {
      if (!data.dryRun) {
        void qc.invalidateQueries({ queryKey: editorClassesKeys.list() })
        toast.success(`Đã tạo lịch thi cho ${data.createdCount} lớp`)
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
