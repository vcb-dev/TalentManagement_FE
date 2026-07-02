/**
 * Tập trung tất cả React Query keys của feature KPI/OKR.
 * Dùng factory này thay cho string literal rải rác để tránh key chết / key sai.
 */

export const kpiQueryKeys = {
  /** Assignments (workspace + manager goal view) */
  assignments: (teamId: string, year: number, month: number) =>
    ['kpi-assignments', teamId, year, month] as const,

  /** Assignments dùng trong màn kết quả (manager result view) — key riêng để invalidate độc lập */
  assignmentsResult: (teamId: string, year: number, month: number) =>
    ['kpi-assignments-result', teamId, year, month] as const,

  /** PerformanceSummary (workspace) */
  summaries: (teamId: string, year: number, month: number) =>
    ['kpi-summaries', teamId, year, month] as const,

  /** PerformanceSummary dùng trong màn kết quả manager */
  summariesResult: (teamId: string, year: number, month: number) =>
    ['kpi-summaries-result', teamId, year, month] as const,

  /** PerformanceApprovalRequest — goal hoặc result */
  approvalRequest: (teamId: string, year: number, month: number, type: 'goal' | 'result') =>
    ['kpi-approval-request', teamId, year, month, type] as const,

  /** Danh sách approval request (Manager inbox) */
  approvalInbox: () => ['kpi-approval-requests'] as const,

  /** Monthly report assignments */
  monthlyAssignments: (teamId: string, year: number, month: number) =>
    ['monthly-report-assignments', teamId, year, month] as const,

  /** Monthly report summaries */
  monthlySummaries: (teamId: string, year: number, month: number) =>
    ['monthly-report-summaries', teamId, year, month] as const,

  /** Monthly report result-approval (lock flag) */
  monthlyResultApproval: (teamId: string, year: number, month: number) =>
    ['monthly-report-result-approval', teamId, year, month] as const,

  /** Team members roster */
  teamMembers: (teamId: string) => ['team-members-kpi', teamId] as const,

  /** Metric templates (auto-seed) */
  teamMetricTemplates: (teamId: string) => ['team-metric-templates', teamId] as const,

  /** Prefix-only helpers (dùng với { exact: false } để invalidate toàn bộ sub-tree) */
  allAssignments: () => ['kpi-assignments'] as const,
  allSummaries: () => ['kpi-summaries'] as const,
  allMonthly: () => ['monthly-report'] as const,
  allApprovalRequests: () => ['kpi-approval-requests'] as const,
} as const
