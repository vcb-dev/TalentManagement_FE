import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { examApi } from './api'
import { examKeys } from './queryKeys'
import type {
  ClassifyExamInput,
  ExamFilters,
  GradeExamInput,
  SubmitExamInput,
  GradeSubmissionInput,
} from './types'

export function useExams(filters: ExamFilters, enabled = true) {
  return useQuery({
    queryKey: examKeys.list(filters),
    queryFn: () => examApi.list(filters),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useExam(examId: string) {
  return useQuery({
    queryKey: examKeys.detail(examId),
    queryFn: () => examApi.get(examId),
    enabled: examId.length > 0,
  })
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: ['exam_submission_detail', id],
    queryFn: () => examApi.getSubmission(id),
    enabled: id.length > 0,
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

export function useSubmitExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SubmitExamInput) => examApi.submit(data),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // 1s, 2s, 4s
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: examKeys.lists() })
      void qc.invalidateQueries({ queryKey: ['my_exam_submissions'] })
    },
  })
}

export function useWithdrawExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { classId?: string; scheduleId?: string }) => examApi.withdraw(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['learning'] })
      void qc.invalidateQueries({ queryKey: examKeys.lists() })
      void qc.invalidateQueries({ queryKey: ['my_exam_submissions'] })
    },
  })
}

export function useManagerSubmissions(
  filter?: { classId?: string; scheduleId?: string },
  options?: { enabled?: boolean }
) {
  const classId = filter?.classId || ''
  const scheduleId = filter?.scheduleId || ''
  return useQuery({
    queryKey: ['exam_submissions', classId, scheduleId],
    queryFn: () => examApi.getSubmissions({ classId, scheduleId }),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useMySubmissions(enabled = true) {
  return useQuery({
    queryKey: ['my_exam_submissions'],
    queryFn: () => examApi.getMySubmissions(),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useGradeSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GradeSubmissionInput) => examApi.gradeSubmission(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['exam_submissions'] })
    },
  })
}

export function useStartExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { classId?: string; scheduleId?: string }) => examApi.startExam(data),
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000), // 1s, 2s
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['my_exam_submissions'] })
      // Đề thi (lớp Editor) chỉ được gán khi submission được tạo — phải refetch
      // để lấy đề vừa gán, nếu không màn làm bài sẽ không bao giờ nhận được bank.
      if (variables.scheduleId) {
        void qc.invalidateQueries({ queryKey: ['exam_my_paper', variables.scheduleId] })
      }
    },
  })
}

export function useScheduleDetail(id: string) {
  return useQuery({
    queryKey: ['exam_schedule_detail', id],
    queryFn: () => examApi.getScheduleDetail(id),
    enabled: id.length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes (questions rarely change during exam)
  })
}

/** Đề đã gán ngẫu nhiên cho tôi trong lịch thi — chỉ có khi lịch dùng bộ đề (lớp Editor). */
export function useMyExamPaper(scheduleId: string) {
  return useQuery({
    queryKey: ['exam_my_paper', scheduleId],
    queryFn: () => examApi.getMyPaper(scheduleId),
    enabled: scheduleId.length > 0,
    staleTime: 30 * 60 * 1000,
  })
}

export function useSubmissionFeedback(submissionId: string, enabled = true) {
  return useQuery({
    queryKey: ['exam_submission_feedback', submissionId],
    queryFn: () => examApi.getSubmissionFeedback(submissionId),
    enabled: enabled && submissionId.length > 0,
  })
}

export function useSubmitExamFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ submissionId, content }: { submissionId: string; content: string }) =>
      examApi.submitFeedback(submissionId, content),
    onSuccess: (_data, { submissionId }) => {
      void qc.invalidateQueries({ queryKey: ['exam_submission_feedback', submissionId] })
      toast.success('Đã gửi feedback')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
