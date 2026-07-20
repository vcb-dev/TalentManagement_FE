import { apiClient } from '@/lib/axios'
import { safeParse } from '@/lib/utils'
import {
  examPaperDetailApiSchema,
  examPaperListItemApiSchema,
  type examPaperQuestionApiSchema,
} from './schemas'
import { z } from 'zod'

export type ExamPaperQuestionInput = z.infer<typeof examPaperQuestionApiSchema>

export type ExamPaperInput = {
  code?: string
  title: string
  description?: string | null
  isActive?: boolean
  /** Ngưỡng điểm đạt (0-100%) — totalScore >= passScore thì outcome tự động là DAT khi chấm xong. */
  passScore?: number
  questions?: ExamPaperQuestionInput[]
}

export const examPapersApi = {
  list: async () => {
    const res = await apiClient.get<unknown>('/manager/exam-papers')
    return safeParse(z.array(examPaperListItemApiSchema), res.data, 'GET /manager/exam-papers')
  },

  getById: async (id: string) => {
    const res = await apiClient.get<unknown>(`/manager/exam-papers/${id}`)
    return safeParse(examPaperDetailApiSchema, res.data, 'GET /manager/exam-papers/:id')
  },

  create: async (input: ExamPaperInput) => {
    const res = await apiClient.post<unknown>('/manager/exam-papers', input)
    return safeParse(examPaperDetailApiSchema, res.data, 'POST /manager/exam-papers')
  },

  update: async (id: string, input: Partial<ExamPaperInput>) => {
    const res = await apiClient.patch<unknown>(`/manager/exam-papers/${id}`, input)
    return safeParse(examPaperDetailApiSchema, res.data, 'PATCH /manager/exam-papers/:id')
  },

  remove: async (id: string) => {
    await apiClient.delete<unknown>(`/manager/exam-papers/${id}`)
  },
}
