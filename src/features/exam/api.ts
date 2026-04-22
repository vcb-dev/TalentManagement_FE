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

  getSubmissions: async () => {
    if (isMockApiEnabled()) {
      return []
    }
    const res = await apiClient.get<unknown>('/exams/submissions')
    return safeParse(z.array(examSubmissionApiSchema), res.data, 'GET /exams/submissions')
  },

  getMySubmissions: async () => {
    if (isMockApiEnabled()) {
      return []
    }
    const res = await apiClient.get<unknown>('/exams/my-submissions')
    return safeParse(z.array(examSubmissionApiSchema), res.data, 'GET /exams/my-submissions')
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
