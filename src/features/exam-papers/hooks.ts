import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { examPapersApi, type ExamPaperInput } from './api'
import { examPapersKeys } from './queryKeys'

export function useExamPapers() {
  return useQuery({
    queryKey: examPapersKeys.list(),
    queryFn: examPapersApi.list,
  })
}

export function useExamPaper(id: string, enabled = true) {
  return useQuery({
    queryKey: examPapersKeys.detail(id),
    queryFn: () => examPapersApi.getById(id),
    enabled: enabled && Boolean(id),
  })
}

function warnIfStructureMismatch(data: { warning?: string | null }) {
  if (data.warning) toast.warning(data.warning)
}

export function useCreateExamPaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ExamPaperInput) => examPapersApi.create(input),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: examPapersKeys.list() })
      toast.success('Đã tạo đề thi')
      warnIfStructureMismatch(data)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useUpdateExamPaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ExamPaperInput> }) =>
      examPapersApi.update(id, input),
    onSuccess: (data, { id }) => {
      void qc.invalidateQueries({ queryKey: examPapersKeys.list() })
      void qc.invalidateQueries({ queryKey: examPapersKeys.detail(id) })
      toast.success('Đã lưu đề thi')
      warnIfStructureMismatch(data)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useDeleteExamPaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => examPapersApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: examPapersKeys.list() })
      toast.success('Đã xóa đề thi')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
