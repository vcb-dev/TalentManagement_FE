import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useAuthStore } from '@/stores/auth.store'

export type PerformanceKind = 'KPI' | 'OKR'
export type PerformanceStatus = 'not_started' | 'in_progress' | 'done' | 'blocked'
export type PerformanceGradeLetter = 'A' | 'B' | 'C'

export type CatalogDivisionAllowlistResponse = {
  envDivisionIds: string[]
  databaseDivisionIds: string[]
  mergedDivisionIds: string[]
}

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
  actualResult?: string | null
  reviewerName?: string | null
  managerEvalStatus?: string | null
  managerReviewNote?: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
  // Epic 1: Evidence + Số liệu + Tự đánh giá
  evidence?: string | null
  numericValue?: number | null
  numericUnit?: string | null
  selfEvalStatus?: string | null
  selfReviewNote?: string | null
  selfEvaluatedAt?: string | null
  // Epic 9: Catalog hooks
  category?: string | null
  tenureStage?: string | null
  dailyTarget?: string | null
  templateItemId?: string | null
}

export type PerformanceSummaryRow = {
  id: string
  teamId: string
  assigneeUserId: string
  assigneeDisplayName?: string | null
  assigneeEmail?: string | null
  assigneeEmployeeCode?: string | null
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

export type PerformanceQuestionnaire = {
  id: string
  questions: { id: string; prompt: string; sortOrder: number }[]
  /** BE có thể trả thiếu khi chưa có câu trả lời hoặc bản response cũ. */
  answers?: {
    questionId: string
    respondentUserId: string
    answerText: string
    updatedAt?: string
    respondentDisplayName?: string | null
    respondentEmail?: string | null
    respondentEmployeeCode?: string | null
  }[]
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
      // Epic 1
      evidence?: string | null
      numericValue?: number | null
      numericUnit?: string | null
      selfEvalStatus?: string | null
      selfReviewNote?: string | null
      // Epic 9
      category?: string | null
      tenureStage?: string | null
      dailyTarget?: string | null
      templateItemId?: string | null
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock: không tạo KPI qua API')
    const res = await apiClient.post<PerformanceAssignment>(
      `/performance/teams/${teamId}/assignments`,
      body
    )
    return res.data
  },

  /** Import nhiều dòng khác nhau (Excel/CSV) — một transaction phía BE. */
  importAssignments: async (
    teamId: string,
    body: {
      year: number
      month: number
      items: Array<{
        assigneeUserId: string
        kind: PerformanceKind
        content: string
        priority?: number
        targetMetric?: string | null
        kpiSetAt?: string | null
        reviewerName?: string | null
        managerEvalStatus?: string | null
        managerReviewNote?: string | null
        actualResult?: string | null
        progressPercent?: number
        status?: PerformanceAssignment['status']
        // Epic 1
        evidence?: string | null
        numericValue?: number | null
        numericUnit?: string | null
        selfEvalStatus?: string | null
        selfReviewNote?: string | null
        // Epic 9
        category?: string | null
        tenureStage?: string | null
        dailyTarget?: string | null
        templateItemId?: string | null
      }>
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock: không tạo KPI qua API')
    const res = await apiClient.post<PerformanceAssignment[]>(
      `/performance/teams/${teamId}/assignments/import`,
      body
    )
    return res.data
  },

  /** Tạo cùng nội dung KPI/OKR cho nhiều nhân sự (một request, transaction phía BE). */
  createAssignmentsBatch: async (
    teamId: string,
    body: {
      assigneeUserIds: string[]
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
      // Epic 1
      evidence?: string | null
      numericValue?: number | null
      numericUnit?: string | null
      selfEvalStatus?: string | null
      selfReviewNote?: string | null
      // Epic 9
      category?: string | null
      tenureStage?: string | null
      dailyTarget?: string | null
      templateItemId?: string | null
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock: không tạo KPI qua API')
    const res = await apiClient.post<PerformanceAssignment[]>(
      `/performance/teams/${teamId}/assignments/batch`,
      body
    )
    return res.data
  },

  /**
   * Nhiều dòng mục tiêu khác nhau × cùng danh sách nhân sự — một transaction (tối đa 300 bản ghi).
   */
  createAssignmentsBatchMulti: async (
    teamId: string,
    body: {
      assigneeUserIds: string[]
      year: number
      month: number
      reviewerName?: string | null
      lines: Array<{
        kind: PerformanceKind
        content: string
        priority?: number
        targetMetric?: string | null
        kpiSetAt?: string | null
      }>
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock: không tạo KPI qua API')
    const res = await apiClient.post<PerformanceAssignment[]>(
      `/performance/teams/${teamId}/assignments/batch-multi`,
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
        | 'evidence'
        | 'numericValue'
        | 'numericUnit'
        | 'selfEvalStatus'
        | 'selfReviewNote'
        | 'category'
        | 'tenureStage'
        | 'dailyTarget'
        | 'templateItemId'
      >
    >
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.patch<PerformanceAssignment>(`/performance/assignments/${id}`, body)
    return res.data
  },

  patchAssignmentSelf: async (
    id: string,
    body: {
      progressPercent?: number
      status?: PerformanceAssignment['status']
      kpiSetAt?: string | null
      actualResult?: string | null
      // Epic 1: Evidence + Số liệu + Tự đánh giá
      evidence?: string | null
      numericValue?: number | null
      numericUnit?: string | null
      selfEvalStatus?: string | null
      selfReviewNote?: string | null
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.patch<PerformanceAssignment>(
      `/performance/assignments/${id}/me`,
      body
    )
    return res.data
  },

  /** Upload ảnh minh chứng KPI → `{ url }` dạng `/uploads/kpi-evidence/...` (ghép vào Evidence). */
  uploadKpiEvidenceImage: async (file: File): Promise<{ url: string }> => {
    if (isMockApiEnabled()) {
      await new Promise((r) => setTimeout(r, 300))
      return { url: '/uploads/kpi-evidence/mock.jpg' }
    }
    const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
    const token = useAuthStore.getState().accessToken
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${base}/performance/assignments/evidence-image`, {
      method: 'POST',
      body,
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || 'Không tải được ảnh minh chứng')
    }
    return res.json() as Promise<{ url: string }>
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
    const res = await apiClient.get<PerformanceQuestionnaire | null>(
      `/performance/teams/${teamId}/questionnaires`,
      {
        params: { year, month },
      }
    )
    return res.data
  },

  upsertQuestionnaire: async (
    teamId: string,
    body: { year: number; month: number; questions: { prompt: string; sortOrder?: number }[] }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.post<PerformanceQuestionnaire>(
      `/performance/teams/${teamId}/questionnaires`,
      body
    )
    return res.data
  },

  putAnswers: async (
    teamId: string,
    year: number,
    month: number,
    body: { answers: { questionId: string; answerText: string }[] }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.post<PerformanceQuestionnaire>(
      `/performance/teams/${teamId}/questionnaires/answers`,
      body,
      { params: { year, month } }
    )
    return res.data
  },

  // ─── Sprint 2: Window Config ────────────────────────────────────────

  listWindowConfigs: async () => {
    if (isMockApiEnabled()) return [] as PerformanceWindowConfig[]
    const res = await apiClient.get<PerformanceWindowConfig[]>('/performance/window-configs')
    return res.data
  },

  upsertWindowConfig: async (body: {
    teamId?: string | null
    year: number
    month: number
    assignStartDay?: number
    assignEndDay?: number
    answerStartDay?: number
    answerEndDay?: number
  }) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.put<PerformanceWindowConfig>('/performance/window-configs', body)
    return res.data
  },

  // ─── Epic 9: Catalog division allowlist (HR) ──────────────────────────

  getCatalogDivisionAllowlist: async () => {
    if (isMockApiEnabled()) {
      return {
        envDivisionIds: [],
        databaseDivisionIds: [],
        mergedDivisionIds: [],
      }
    }
    const res = await apiClient.get<CatalogDivisionAllowlistResponse>(
      '/performance/catalog-division-allowlist'
    )
    return res.data
  },

  putCatalogDivisionAllowlist: async (divisionIds: string[]) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.put<CatalogDivisionAllowlistResponse>(
      '/performance/catalog-division-allowlist',
      { divisionIds }
    )
    return res.data
  },

  // ─── Sprint 2 / Epic 9: Auto-seed ───────────────────────────────────

  autoSeedTeam: async (
    teamId: string,
    year: number,
    month: number,
    body?: { templateCode?: string; userIds?: string[]; dryRun?: boolean }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.post<AutoSeedResponse>(
      `/performance/teams/${teamId}/auto-seed`,
      body ?? {},
      { params: { year, month } }
    )
    return res.data
  },

  // ─── Sprint 3: Manager đánh giá Leader ──────────────────────────────

  listLeaderEvaluations: async (teamId: string, year: number, month: number) => {
    if (isMockApiEnabled()) return [] as LeaderEvaluationRow[]
    const res = await apiClient.get<LeaderEvaluationRow[]>(
      '/performance/manager/leaders/evaluations',
      { params: { teamId, year, month } }
    )
    return res.data
  },

  patchLeaderEvaluation: async (
    userId: string,
    year: number,
    month: number,
    body: {
      overallComment?: string | null
      managerScoreLabel?: string | null
      criteriaNotOk?: string | null
      evaluatedAt?: string | null
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.patch<LeaderEvaluationRow>(
      `/performance/manager/leaders/${userId}/evaluations`,
      body,
      { params: { year, month } }
    )
    return res.data
  },

  // ─── Sprint 3 / Epic 7: Báo cáo nâng cấp ───────────────────────────

  listDepartmentSummaries: async (departmentId: string, year: number, month: number) => {
    if (isMockApiEnabled()) return [] as PerformanceSummaryRow[]
    const res = await apiClient.get<PerformanceSummaryRow[]>(
      `/performance/departments/${departmentId}/summaries`,
      { params: { year, month } }
    )
    return res.data
  },

  getMonthlyReport: async (departmentId: string, year: number, month: number) => {
    if (isMockApiEnabled())
      return {
        summaries: [],
        hrCounters: { promoted: 0, notLearned: 0, newJoiners: 0, leavers: 0 },
      }
    const res = await apiClient.get<MonthlyReport>(
      `/performance/departments/${departmentId}/monthly-report`,
      { params: { year, month } }
    )
    return res.data
  },

  // ─── Sprint 4: Honor Board ──────────────────────────────────────────

  getHonorBoard: async (year: number, month: number, departmentId?: string) => {
    if (isMockApiEnabled()) return { topByDepartment: [], outstandingOkr: [] } as HonorBoardResponse
    const res = await apiClient.get<HonorBoardResponse>('/performance/honor-board', {
      params: { year, month, departmentId },
    })
    return res.data
  },

  // ─── Epic 5.5: Sales Honor Board ─────────────────────────────────────

  getSalesHonorBoard: async (year: number, month: number) => {
    if (isMockApiEnabled()) {
      return {
        year,
        month,
        topIndividualRevenue: null,
        topIndividualOrders: null,
        topTeamRevenue: null,
        topTeamOrders: null,
      } as SalesHonorBoardResponse
    }
    const res = await apiClient.get<SalesHonorBoardResponse>('/performance/honor-board/sales', {
      params: { year, month },
    })
    return res.data
  },

  // ─── Sprint 4: User Snapshot ─────────────────────────────────────────

  getUserSnapshot: async (userId: string, year: number, month: number) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.get<UserSnapshotResponse>(`/performance/users/${userId}/snapshot`, {
      params: { year, month },
    })
    return res.data
  },

  // ─── Sprint 4 / Epic 9 phase 3: Catalog Admin ────────────────────────

  listCatalogs: async () => {
    if (isMockApiEnabled()) return [] as CatalogItem[]
    const res = await apiClient.get<CatalogItem[]>('/performance/catalogs')
    return res.data
  },

  getCatalog: async (code: string) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.get<CatalogItem>(`/performance/catalogs/${code}`)
    return res.data
  },

  createCatalog: async (body: {
    code: string
    name: string
    divisionId?: string
    description?: string
  }) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.post<CatalogItem>('/performance/catalogs', body)
    return res.data
  },

  patchCatalog: async (
    code: string,
    body: { name?: string; description?: string; active?: boolean }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.patch<CatalogItem>(`/performance/catalogs/${code}`, body)
    return res.data
  },

  createCatalogItem: async (
    code: string,
    body: {
      tenureStage: string
      category: string
      kind?: string
      priority?: number
      sortOrder?: number
      content: string
      dailyTarget?: string
      monthlyTarget?: string
      numericTarget?: number
      numericUnit?: string
      notes?: string
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.post(`/performance/catalogs/${code}/items`, body)
    return res.data
  },

  patchCatalogItem: async (
    id: string,
    body: {
      content?: string
      dailyTarget?: string | null
      monthlyTarget?: string | null
      numericTarget?: number | null
      numericUnit?: string | null
      priority?: number
      sortOrder?: number
      notes?: string | null
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.patch(`/performance/catalog-items/${id}`, body)
    return res.data
  },

  deleteCatalogItem: async (id: string) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    await apiClient.delete(`/performance/catalog-items/${id}`)
  },

  createRevenueTier: async (
    code: string,
    body: {
      tenureStage: string
      tierLabel: string
      minAmount: number
      maxAmount?: number | null
      bonusPercent?: number | null
      bonusAmount?: number | null
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.post(`/performance/catalogs/${code}/revenue-tiers`, body)
    return res.data
  },

  patchRevenueTier: async (
    id: string,
    body: {
      bonusPercent?: number | null
      bonusAmount?: number | null
      minAmount?: number
      maxAmount?: number | null
    }
  ) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.patch(`/performance/revenue-tiers/${id}`, body)
    return res.data
  },
}

export type PerformanceWindowConfig = {
  id: string
  teamId: string | null
  year: number
  month: number
  assignStartDay: number
  assignEndDay: number
  answerStartDay: number
  answerEndDay: number
}

export type AutoSeedResponse = {
  templateCode: string
  isSingleStage: boolean
  perUser: Array<{
    userId: string
    displayName: string | null
    tenureStage: string
    createdCount: number
    skippedCount: number
  }>
  totalCreated: number
  totalSkipped: number
}

export type LeaderEvaluationRow = {
  userId: string
  displayName: string | null
  email: string | null
  teamId: string | null
  kpiOkCount: number
  kpiNotCount: number
  okrOkCount: number
  okrNotCount: number
  evaluation: {
    id: string
    evaluateeRole: string
    overallComment: string | null
    managerScoreLabel: string | null
    criteriaNotOk: string | null
    evaluatedAt: string | null
  } | null
}

export type MonthlyReport = {
  summaries: PerformanceSummaryRow[]
  hrCounters: {
    promoted: number
    notLearned: number
    newJoiners: number
    leavers: number
  }
}

export type HonorBoardResponse = {
  topByDepartment: Array<{
    departmentId: string
    departmentName: string
    user: { id: string; displayName: string | null; email: string | null }
    kind: 'KPI' | 'OKR'
    content: string
    numericValue: number
    numericUnit: string | null
  }>
  outstandingOkr: Array<{
    user: { id: string; displayName: string | null }
    departmentName: string
    content: string
    numericValue: number
  }>
}

export type SalesHonorWinnerIndividual = {
  user: {
    id: string
    displayName: string | null
    email: string | null
    avatarUrl: string | null
  }
  teamName: string | null
  numericValue: number
  numericUnit: string
  content: 'Doanh thu lên đơn' | 'Số đơn chốt'
}

export type SalesHonorWinnerTeam = {
  team: { id: string; name: string }
  totalValue: number
  numericUnit: string
  memberCount: number
  metric: 'REVENUE' | 'ORDERS'
}

export type SalesHonorBoardResponse = {
  year: number
  month: number
  topIndividualRevenue: SalesHonorWinnerIndividual | null
  topIndividualOrders: SalesHonorWinnerIndividual | null
  topTeamRevenue: SalesHonorWinnerTeam | null
  topTeamOrders: SalesHonorWinnerTeam | null
}

export type UserSnapshotResponse = {
  profile: {
    id: string
    displayName: string | null
    email: string | null
    jobTitle: string | null
    employeeCode: string | null
    divisionName: string | null
    teamName: string | null
  }
  latestOkr: { content: string; kpiSetAt: string | null; status: string } | null
  topKpiP1: {
    content: string
    numericValue: number | null
    numericUnit: string | null
    managerEvalStatus: string | null
  } | null
  summary: {
    kpiOkCount: number
    kpiNotCount: number
    okrOkCount: number
    okrNotCount: number
    kpiGrade: string | null
    okrGrade: string | null
  } | null
  teamHistory: Array<{ year: number; month: number; departmentName: string | null }>
}

export type CatalogItem = {
  id: string
  code: string
  name: string
  description: string | null
  active: boolean
  items: Array<{
    id: string
    tenureStage: string
    category: string
    kind: string
    priority: number
    sortOrder: number
    content: string
    dailyTarget: string | null
    monthlyTarget: string | null
    numericTarget: number | null
    numericUnit: string | null
    notes: string | null
  }>
  revenueTiers: Array<{
    id: string
    tenureStage: string
    tierLabel: string
    minAmount: number
    maxAmount: number | null
    bonusPercent: number | null
    bonusAmount: number | null
  }>
}
