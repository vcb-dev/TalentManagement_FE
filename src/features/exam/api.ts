import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import { examListApiSchema, examResultApiSchema, examSummaryApiSchema } from './schemas'
import type { ClassifyExamInput, ExamFilters, GradeExamInput } from './types'

export const examApi = {
  list: async (filters: ExamFilters) => {
    const res = await apiClient.get<unknown>('/me/exam-schedule', { params: filters })
    return safeParse(examListApiSchema, res.data, 'GET /me/exam-schedule')
  },

  get: async (examId: string) => {
    const res = await apiClient.get<unknown>(`/exams/${examId}`)
    return safeParse(examSummaryApiSchema, res.data, `GET /exams/${examId}`)
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
}
