import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import {
  getMockChecklist,
  getMockSubmissions,
} from '@/features/learning-path/mock/mockChecklistData'
import {
  checklistResponseSchema,
  levelSummaryApiSchema,
  meEnrolledClassResponseSchema,
  meLearningPathSchema,
  submissionApiSchema,
  availableLearningClassSchema,
} from './schemas'

export const learningApi = {
  levels: async () => {
    const res = await apiClient.get<unknown>('/learning/levels')
    return safeParse(z.array(levelSummaryApiSchema), res.data, 'GET /learning/levels')
  },

  checklist: async (levelId: string, starId: string) => {
    if (isMockApiEnabled()) {
      return safeParse(
        checklistResponseSchema,
        getMockChecklist(levelId, starId),
        'GET checklist (mock)'
      )
    }
    const res = await apiClient.get<unknown>(
      `/learning/levels/${levelId}/stars/${starId}/checklist`
    )
    return safeParse(checklistResponseSchema, res.data, 'GET checklist')
  },

  submissions: async (starId: string) => {
    if (isMockApiEnabled()) {
      return safeParse(
        z.array(submissionApiSchema),
        getMockSubmissions(starId),
        'GET /learning/submissions (mock)'
      )
    }
    const res = await apiClient.get<unknown>(`/learning/submissions`, { params: { starId } })
    return safeParse(z.array(submissionApiSchema), res.data, 'GET /learning/submissions')
  },

  myLearningPath: async () => {
    const res = await apiClient.get<unknown>('/me/learning-path')
    return safeParse(meLearningPathSchema, res.data, 'GET /me/learning-path')
  },

  myEnrolledClass: async (range?: { startDate?: string; endDate?: string }) => {
    const params: Record<string, string> = {}
    if (range?.startDate) params.startDate = range.startDate
    if (range?.endDate) params.endDate = range.endDate
    const res = await apiClient.get<unknown>('/me/learning-class', {
      params: Object.keys(params).length ? params : undefined,
    })
    return safeParse(meEnrolledClassResponseSchema, res.data, 'GET /me/learning-class')
  },

  availableClasses: async () => {
    const res = await apiClient.get<unknown>('/learning/classes/available')
    return safeParse(
      z.array(availableLearningClassSchema),
      res.data,
      'GET /learning/classes/available'
    )
  },
  sendFeedback: async (input: { submissionId: string; content: string }) => {
    const res = await apiClient.post<unknown>(`/exams/submissions/${input.submissionId}/feedback`, {
      content: input.content,
    })
    return safeParse(
      z.object({ success: z.boolean() }),
      res.data,
      'POST /exams/submissions/:submissionId/feedback'
    )
  },
}
