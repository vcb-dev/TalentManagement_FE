import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'

export type PerformanceKind = 'KPI' | 'OKR'
export type PerformanceStatus = 'not_started' | 'in_progress' | 'done' | 'blocked'
export type PerformanceGradeLetter = 'A' | 'B' | 'C' | 'D'

export type PerformanceAssignment = {
  id: string
  teamId: string
  assigneeUserId: string
  year: number
  month: number
  kind: PerformanceKind
  priority: number
  content: string
  targetMetric: string | null
  progressPercent: number
  status: PerformanceStatus
  kpiSetAt: string | null
  /** Có thể thiếu trên bản response cũ trước khi migrate DB. */
  actualResult?: string | null
  reviewerName?: string | null
  managerEvalStatus?: string | null
  managerReviewNote?: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export type PerformanceSummaryRow = {
  id: string
  teamId: string
  assigneeUserId: string
  year: number
  month: number
  kpiOkCount: number
  kpiNotCount: number
  okrOkCount: number
  okrNotCount: number
  kpiRate: number
  okrRate: number
  kpiGrade: PerformanceGradeLetter | null
  okrGrade: PerformanceGradeLetter | null
  updatedAt: string
}

export const performanceApi = {
  listAssignments: async (teamId: string, year: number, month: number) => {
    if (isMockApiEnabled()) return [] as PerformanceAssignment[]
    const res = await apiClient.get<PerformanceAssignment[]>(
      `/performance/teams/${teamId}/assignments`,
      { params: { year, month } }
    )
    return res.data
  },

  createAssignment: async (
    teamId: string,
    body: {
      assigneeUserId: string
      year: number
      month: number
      kind: PerformanceKind
      content: string
      priority?: number
      targetMetric?: string | null
      kpiSetAt?: string | null
      reviewerName?: string | null
      actualResult?: string | null
      managerEvalStatus?: string | null
      managerReviewNote?: string | null
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock: không tạo KPI qua API')
    const res = await apiClient.post<PerformanceAssignment>(
      `/performance/teams/${teamId}/assignments`,
      body
    )
    return res.data
  },

  patchAssignment: async (
    id: string,
    body: Partial<
      Pick<
        PerformanceAssignment,
        | 'content'
        | 'targetMetric'
        | 'priority'
        | 'progressPercent'
        | 'status'
        | 'kpiSetAt'
        | 'actualResult'
        | 'reviewerName'
        | 'managerEvalStatus'
        | 'managerReviewNote'
      >
    >
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.patch<PerformanceAssignment>(`/performance/assignments/${id}`, body)
    return res.data
  },

  patchAssignmentSelf: async (
    id: string,
    body: Pick<PerformanceAssignment, 'progressPercent' | 'status'> & {
      kpiSetAt?: string | null
      actualResult?: string | null
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.patch<PerformanceAssignment>(
      `/performance/assignments/${id}/me`,
      body
    )
    return res.data
  },

  deleteAssignment: async (id: string) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    await apiClient.delete(`/performance/assignments/${id}`)
  },

  listSummaries: async (teamId: string, year: number, month: number) => {
    if (isMockApiEnabled()) return [] as PerformanceSummaryRow[]
    const res = await apiClient.get<PerformanceSummaryRow[]>(
      `/performance/teams/${teamId}/summaries`,
      { params: { year, month } }
    )
    return res.data
  },

  recalculateSummaries: async (teamId: string, year: number, month: number) => {
    if (isMockApiEnabled()) return { recalculated: 0 }
    const res = await apiClient.post<{ recalculated: number }>(
      `/performance/teams/${teamId}/summaries/recalculate`,
      {},
      { params: { year, month } }
    )
    return res.data
  },

  getQuestionnaire: async (teamId: string, year: number, month: number) => {
    if (isMockApiEnabled()) return null
    const res = await apiClient.get<unknown>(`/performance/teams/${teamId}/questionnaires`, {
      params: { year, month },
    })
    return res.data
  },

  upsertQuestionnaire: async (
    teamId: string,
    body: { year: number; month: number; questions: { prompt: string; sortOrder?: number }[] }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.post<unknown>(`/performance/teams/${teamId}/questionnaires`, body)
    return res.data
  },

  putAnswers: async (
    teamId: string,
    year: number,
    month: number,
    body: { answers: { questionId: string; answerText: string }[] }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.post<unknown>(
      `/performance/teams/${teamId}/questionnaires/answers`,
      body,
      { params: { year, month } }
    )
    return res.data
  },
}
