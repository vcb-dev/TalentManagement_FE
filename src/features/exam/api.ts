import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import {
  examListApiSchema,
  examResultApiSchema,
  examSummaryApiSchema,
  examSubmissionApiSchema,
} from './schemas'
import type {
  ClassifyExamInput,
  ExamFilters,
  GradeExamInput,
  SubmitExamInput,
  GradeSubmissionInput,
} from './types'

export const examApi = {
  list: async (filters: ExamFilters) => {
    const res = await apiClient.get<unknown>('/me/exam-schedule', { params: filters })
    return safeParse(examListApiSchema, res.data, 'GET /me/exam-schedule')
  },

  get: async (examId: string) => {
    const res = await apiClient.get<unknown>(`/exams/${examId}`)
    return safeParse(examSummaryApiSchema, res.data, `GET /exams/${examId}`)
  },

  getSubmission: async (id: string) => {
    const res = await apiClient.get<unknown>(`/exams/submissions/${id}`)
    return safeParse(examSubmissionApiSchema, res.data, `GET /exams/submissions/${id}`)
  },

  results: async (examId: string) => {
    const res = await apiClient.get<unknown>(`/exams/${examId}/results`)
    return safeParse(z.array(examResultApiSchema), res.data, 'GET /exams/results')
  },

  grade: async (body: GradeExamInput) => {
    if (isMockApiEnabled()) {
      return safeParse(
        examResultApiSchema,
        {
          id: 'a0000000-0000-4000-8000-000000000099',
          examId: body.examId,
          employeeId: body.employeeId,
          result: 'DAT',
          classifiedAt: new Date().toISOString(),
        },
        'POST grade (mock)'
      )
    }
    const res = await apiClient.post<unknown>(`/exams/${body.examId}/grade`, {
      employeeId: body.employeeId,
      score: body.score,
      note: body.note,
    })
    return safeParse(examResultApiSchema, res.data, 'POST grade')
  },

  classify: async (body: ClassifyExamInput) => {
    if (isMockApiEnabled()) {
      return safeParse(
        examResultApiSchema,
        {
          id: 'a0000000-0000-4000-8000-000000000088',
          examId: body.examId,
          employeeId: body.employeeId,
          result: body.result,
          classifiedAt: new Date().toISOString(),
        },
        'POST classify (mock)'
      )
    }
    const res = await apiClient.post<unknown>(`/exams/${body.examId}/classify`, {
      employeeId: body.employeeId,
      result: body.result,
    })
    return safeParse(examResultApiSchema, res.data, 'POST classify')
  },

  submit: async (body: SubmitExamInput) => {
    if (isMockApiEnabled()) {
      return { id: 'mock-submission', status: 'pending' } as any
    }
    const res = await apiClient.post<unknown>('/exams/submit', body)
    return safeParse(examSubmissionApiSchema, res.data, 'POST /exams/submit')
  },

  withdraw: async (body: { classId?: string; scheduleId?: string }) => {
    if (isMockApiEnabled()) {
      return { success: true }
    }
    const res = await apiClient.post<unknown>('/exams/withdraw', body)
    return res.data as { success: boolean }
  },

  getSubmissions: async (params?: { classId?: string; scheduleId?: string }) => {
    if (isMockApiEnabled()) {
      return []
    }
    const query: Record<string, string> = {}
    if (params?.classId) query.classId = params.classId
    if (params?.scheduleId) query.scheduleId = params.scheduleId
    const res = await apiClient.get<unknown>('/exams/submissions', { params: query })
    return safeParse(z.array(examSubmissionApiSchema), res.data, 'GET /exams/submissions')
  },

  getMySubmissions: async () => {
    if (isMockApiEnabled()) {
      return []
    }
    const res = await apiClient.get<unknown>('/exams/my-submissions')
    return safeParse(z.array(examSubmissionApiSchema), res.data, 'GET /exams/my-submissions')
  },

  getScheduleDetail: async (id: string) => {
    const res = await apiClient.get<unknown>(`/me/exam-schedule/${id}`)
    return res.data as {
      id: string
      classId: string
      title: string
      dateIso: string
      startTime: string
      endTime: string
      examQuestions: any
    }
  },

  startExam: async (body: { classId?: string; scheduleId?: string }) => {
    const res = await apiClient.post<unknown>('/exams/start-exam', body)
    return res.data
  },

  /** Học viên gửi feedback cho bài thi đã chấm xong. */
  submitFeedback: async (submissionId: string, content: string) => {
    const res = await apiClient.post<unknown>(`/exams/submissions/${submissionId}/feedback`, {
      content,
    })
    return res.data
  },

  /** Feedback của 1 bài nộp — null nếu học viên chưa gửi. */
  getSubmissionFeedback: async (submissionId: string) => {
    const res = await apiClient.get<unknown>(`/exams/submissions/${submissionId}/feedback`)
    return res.data as { id: string; content: string; createdAt: string } | null
  },

  /** Đề thi đã gán ngẫu nhiên cho member trong lịch thi (lớp Editor) — null nếu lịch không dùng đề thi. */
  getMyPaper: async (scheduleId: string) => {
    const res = await apiClient.get<unknown>('/exams/my-paper', { params: { scheduleId } })
    return res.data as {
      paper: {
        id: string
        code: string
        title: string
        description: string | null
        questions: Array<{
          id: string
          type: 'mcq' | 'essay'
          stem: string
          options: string[] | null
          points: number
          sortOrder: number
        }>
      } | null
      submissionStatus?: string
    }
  },

  gradeSubmission: async (body: GradeSubmissionInput) => {
    if (isMockApiEnabled()) {
      return { id: body.submissionId, status: body.status || 'done' } as any
    }
    const { submissionId, ...payload } = body
    const res = await apiClient.patch<unknown>(`/exams/submissions/${submissionId}/grade`, payload)
    return safeParse(examSubmissionApiSchema, res.data, 'PATCH /exams/submissions/:id/grade')
  },
}
