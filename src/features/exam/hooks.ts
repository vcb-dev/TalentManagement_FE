import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { examApi } from './api'
import { examKeys } from './queryKeys'
import type { ClassifyExamInput, ExamFilters, GradeExamInput } from './types'

export function useExams(filters: ExamFilters) {
  return useQuery({
    queryKey: examKeys.list(filters),
    queryFn: () => examApi.list(filters),
  })
}

export function useExam(examId: string) {
  return useQuery({
    queryKey: examKeys.detail(examId),
    queryFn: () => examApi.get(examId),
    enabled: examId.length > 0,
  })
}

export function useExamResults(examId: string) {
  return useQuery({
    queryKey: examKeys.results(examId),
    queryFn: () => examApi.results(examId),
    enabled: examId.length > 0,
  })
}

export function useGradeExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GradeExamInput) => examApi.grade(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: examKeys.results(input.examId) })
      const previous = qc.getQueryData(examKeys.results(input.examId))
      return { previous, examId: input.examId }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.previous && ctx.examId) qc.setQueryData(examKeys.results(ctx.examId), ctx.previous)
      toast.error('Chấm điểm thất bại')
    },
    onSuccess: (_d, input) => {
      void qc.invalidateQueries({ queryKey: examKeys.results(input.examId) })
      void qc.invalidateQueries({ queryKey: examKeys.detail(input.examId) })
      toast.success('Đã lưu điểm')
    },
  })
}

export function useClassifyExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ClassifyExamInput) => examApi.classify(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: examKeys.results(input.examId) })
      const previous = qc.getQueryData(examKeys.results(input.examId))
      return { previous, examId: input.examId }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.previous && ctx.examId) qc.setQueryData(examKeys.results(ctx.examId), ctx.previous)
      toast.error('Phân loại thất bại')
    },
    onSuccess: (_d, input) => {
      void qc.invalidateQueries({ queryKey: examKeys.results(input.examId) })
      toast.success('Đã phân loại kết quả')
    },
  })
}
