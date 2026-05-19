import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  performanceApi,
  type PerformanceAssignment,
  type PerformanceSummaryRow,
  type PerformanceQuestionnaire,
} from '@/features/kpi-okr/api'
import { organizationApi, type TeamMemberRow } from '@/features/organization/api'
import { isMockApiEnabled } from '@/lib/mockEnv'

/**
 * Cờ để đánh giá chỉ tiêu là "đạt": QL đã đánh giá OK.
 * (Đồng nhất với logic ở `MonthlyReportScreen` và `KpiOkrWorkspace`.)
 */
function isAssignmentOk(row: PerformanceAssignment): boolean {
  return (row.managerEvalStatus ?? '').trim().toUpperCase() === 'OK'
}

/** Trạng thái tổng quát — gom "blocked" vào "chưa đạt" cho donut nhẹ. */
export type AssignmentStatusKey = 'done' | 'in_progress' | 'not_started' | 'blocked'

function statusOf(row: PerformanceAssignment): AssignmentStatusKey {
  return row.status
}

/** Chuẩn hoá [startMonth, endMonth] ⊆ [1..12], cùng năm `year`. */
function normalizeDashboardMonthRange(
  year: number,
  startMonth: number,
  endMonth: number
): { year: number; startMonth: number; endMonth: number; months: number[] } {
  const yy = Math.min(2035, Math.max(2020, year))
  const s = Math.min(12, Math.max(1, startMonth))
  const e = Math.min(12, Math.max(1, endMonth))
  const lo = Math.min(s, e)
  const hi = Math.max(s, e)
  const months = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  return { year: yy, startMonth: lo, endMonth: hi, months }
}

export type TrendPoint = {
  key: string
  label: string
  year: number
  month: number
  kpiRate: number
  okrRate: number
  hasData: boolean
}

export type GradeDistribution = {
  A: number
  B: number
  C: number
  none: number
}

export type TopPriorityItem = {
  id: string
  kind: 'KPI' | 'OKR'
  priority: number
  content: string
  targetMetric: string | null
  progressPercent: number
  status: AssignmentStatusKey
  evalStatus: 'OK' | 'NOT' | null
  assigneeUserId: string
}

export type PerPersonBarRow = {
  userId: string
  name: string
  kpiOk: number
  kpiNot: number
  okrOk: number
  okrNot: number
  /** % tổng chỉ tiêu đạt — dùng để sort top performer. */
  totalRate: number
}

export type KpiDashboardData = {
  isLoading: boolean
  teamId: string
  year: number
  startMonth: number
  endMonth: number
  /** Số tháng trong kỳ (end - start + 1). */
  monthSpan: number

  /** Số thành viên đang hoạt động trong team. */
  teamSize: number
  members: TeamMemberRow[]

  /** Tất cả mục tiêu KPI+OKR của team trong các tháng đã chọn (theo id không trùng). */
  assignments: PerformanceAssignment[]

  /** Mọi bản tổng hợp theo từng tháng trong kỳ — dùng donut xếp loại (theo person-tháng). */
  summaries: PerformanceSummaryRow[]
  questionnaire: PerformanceQuestionnaire | null

  /** 3 card tổng quan. */
  kpi: { totalCount: number; okCount: number; percent: number }
  okr: { totalCount: number; okCount: number; percent: number }
  report: {
    respondentsCount: number
    percent: number
    /** Chỉ khi xem cá nhân: số tháng trong kỳ dùng làm mẫu số tham gia khảo sát. */
    expectedSurveyMonths?: number
  }

  /** Donut trạng thái (chung KPI+OKR). */
  statusBreakdown: Record<AssignmentStatusKey, number>

  /** Donut đánh giá QL. */
  evalBreakdown: { ok: number; not: number; pending: number }

  /** Donut xếp loại A/B/C. */
  kpiGradeDist: GradeDistribution
  okrGradeDist: GradeDistribution

  /** Bar top chỉ tiêu ưu tiên cao, sort theo priority rồi progress. */
  topPriority: TopPriorityItem[]

  /** Bar KPI/OKR đạt/chưa theo từng nhân sự — cộng dồn các tháng trong kỳ. */
  perPerson: PerPersonBarRow[]

  /** Xu hướng % đạt KPI/OKR — một điểm cho mỗi tháng trong kỳ. */
  trend: TrendPoint[]
}

function computeGradeDist(rows: PerformanceSummaryRow[], kind: 'kpi' | 'okr'): GradeDistribution {
  const out: GradeDistribution = { A: 0, B: 0, C: 0, none: 0 }
  for (const r of rows) {
    const g = kind === 'kpi' ? r.kpiGrade : r.okrGrade
    if (g === 'A') out.A += 1
    else if (g === 'B') out.B += 1
    else if (g === 'C') out.C += 1
    else out.none += 1
  }
  return out
}

function aggregatePerPersonAcrossMonths(
  rows: PerformanceSummaryRow[],
  membersById: Map<string, TeamMemberRow>
): PerPersonBarRow[] {
  const byUser = new Map<
    string,
    { kpiOk: number; kpiNot: number; okrOk: number; okrNot: number; name: string }
  >()
  for (const r of rows) {
    const prev = byUser.get(r.assigneeUserId)
    const member = membersById.get(r.assigneeUserId)
    const name =
      r.assigneeDisplayName?.trim() ||
      member?.displayName?.trim() ||
      r.assigneeEmail?.trim() ||
      member?.email?.trim() ||
      prev?.name ||
      'Thành viên'
    byUser.set(r.assigneeUserId, {
      kpiOk: (prev?.kpiOk ?? 0) + r.kpiOkCount,
      kpiNot: (prev?.kpiNot ?? 0) + r.kpiNotCount,
      okrOk: (prev?.okrOk ?? 0) + r.okrOkCount,
      okrNot: (prev?.okrNot ?? 0) + r.okrNotCount,
      name,
    })
  }
  return [...byUser.entries()]
    .map(([userId, v]) => {
      const total = v.kpiOk + v.kpiNot + v.okrOk + v.okrNot
      const ok = v.kpiOk + v.okrOk
      const totalRate = total > 0 ? Math.round((ok / total) * 100) : 0
      return {
        userId,
        name: v.name,
        kpiOk: v.kpiOk,
        kpiNot: v.kpiNot,
        okrOk: v.okrOk,
        okrNot: v.okrNot,
        totalRate,
      }
    })
    .sort((a, b) => b.totalRate - a.totalRate)
}

// Fallback khi summaries chưa được tính: dùng thẳng assignments.
// kpiNot/okrNot ở đây là "đã đánh giá NOT", không bao gồm "chưa chấm".
function aggregatePerPersonFromAssignments(
  assignments: PerformanceAssignment[],
  membersById: Map<string, TeamMemberRow>
): PerPersonBarRow[] {
  const byUser = new Map<
    string,
    { kpiOk: number; kpiNot: number; okrOk: number; okrNot: number; name: string }
  >()
  for (const a of assignments) {
    const prev = byUser.get(a.assigneeUserId)
    const member = membersById.get(a.assigneeUserId)
    const name = member?.displayName?.trim() || member?.email?.trim() || prev?.name || 'Thành viên'
    const ev = (a.managerEvalStatus ?? '').trim().toUpperCase()
    byUser.set(a.assigneeUserId, {
      kpiOk: (prev?.kpiOk ?? 0) + (a.kind === 'KPI' && ev === 'OK' ? 1 : 0),
      kpiNot: (prev?.kpiNot ?? 0) + (a.kind === 'KPI' && ev === 'NOT' ? 1 : 0),
      okrOk: (prev?.okrOk ?? 0) + (a.kind === 'OKR' && ev === 'OK' ? 1 : 0),
      okrNot: (prev?.okrNot ?? 0) + (a.kind === 'OKR' && ev === 'NOT' ? 1 : 0),
      name,
    })
  }
  return [...byUser.entries()]
    .map(([userId, v]) => {
      const total = v.kpiOk + v.kpiNot + v.okrOk + v.okrNot
      const ok = v.kpiOk + v.okrOk
      const totalRate = total > 0 ? Math.round((ok / total) * 100) : 0
      return {
        userId,
        name: v.name,
        kpiOk: v.kpiOk,
        kpiNot: v.kpiNot,
        okrOk: v.okrOk,
        okrNot: v.okrNot,
        totalRate,
      }
    })
    .sort((a, b) => b.totalRate - a.totalRate)
}

function computeTopPriority(assignments: PerformanceAssignment[], limit = 6): TopPriorityItem[] {
  return [...assignments]
    .sort((a, b) => {
      const pa = a.priority <= 0 ? 99 : a.priority
      const pb = b.priority <= 0 ? 99 : b.priority
      if (pa !== pb) return pa - pb
      return (b.progressPercent ?? 0) - (a.progressPercent ?? 0)
    })
    .slice(0, limit)
    .map((row) => {
      const raw = (row.managerEvalStatus ?? '').trim().toUpperCase()
      const evalStatus: TopPriorityItem['evalStatus'] =
        raw === 'OK' ? 'OK' : raw === 'NOT' ? 'NOT' : null
      return {
        id: row.id,
        kind: row.kind,
        priority: row.priority,
        content: row.content,
        targetMetric: row.targetMetric,
        progressPercent: row.progressPercent ?? 0,
        status: statusOf(row),
        evalStatus,
        assigneeUserId: row.assigneeUserId,
      }
    })
}

function mergeAssignments(monthsData: PerformanceAssignment[][]): PerformanceAssignment[] {
  const byId = new Map<string, PerformanceAssignment>()
  for (const chunk of monthsData) {
    for (const row of chunk) {
      byId.set(row.id, row)
    }
  }
  return [...byId.values()]
}

function mergeQuestionnaires(
  data: (PerformanceQuestionnaire | null | undefined)[]
): PerformanceQuestionnaire | null {
  const withData = data.filter((x): x is PerformanceQuestionnaire => Boolean(x))
  const base = withData[0]
  if (!base) return null
  const questions = withData.find((q) => q.questions?.length)?.questions ?? base.questions ?? []
  const answers = withData.flatMap((q) => q.answers ?? [])
  return {
    ...base,
    id: base.id,
    questions,
    answers,
  }
}

/**
 * Gom toàn bộ truy vấn cho tab "KPI · OKR · Báo cáo" trên Tổng quan (Leader/Manager).
 * Hỗ trợ **khoảng tháng** [startMonth, endMonth] trong cùng một năm.
 */
export function useKpiDashboardData(params: {
  teamId: string
  year: number
  startMonth: number
  endMonth: number
  enabled?: boolean
  /** Chỉ lấy chỉ tiêu / tổng hợp / xu hướng của một người (báo cáo cá nhân). */
  onlyAssigneeUserId?: string
}): KpiDashboardData {
  const { teamId, year, startMonth, endMonth, enabled = true, onlyAssigneeUserId } = params
  const {
    year: yNorm,
    startMonth: sNorm,
    endMonth: eNorm,
    months,
  } = normalizeDashboardMonthRange(year, startMonth, endMonth)
  const hasTeam = Boolean(teamId) && !isMockApiEnabled() && enabled

  const membersQ = useQuery({
    queryKey: ['kpi-dashboard', 'members', teamId],
    queryFn: () => organizationApi.getTeamMembers(teamId),
    enabled: hasTeam,
    staleTime: 60_000,
  })

  const assignmentQueries = useQueries({
    queries: months.map((m) => ({
      queryKey: ['kpi-dashboard', 'assignments', teamId, yNorm, m] as const,
      queryFn: () => performanceApi.listAssignments(teamId, yNorm, m),
      enabled: hasTeam,
      staleTime: 30_000,
    })),
  })

  const summariesQueries = useQueries({
    queries: months.map((m) => ({
      queryKey: ['kpi-dashboard', 'summaries', teamId, yNorm, m] as const,
      queryFn: () => performanceApi.listSummaries(teamId, yNorm, m),
      enabled: hasTeam,
      staleTime: 30_000,
    })),
  })

  const questionnaireQueries = useQueries({
    queries: months.map((m) => ({
      queryKey: ['kpi-dashboard', 'questionnaire', teamId, yNorm, m] as const,
      queryFn: () => performanceApi.getQuestionnaire(teamId, yNorm, m),
      enabled: hasTeam,
      staleTime: 30_000,
    })),
  })

  return useMemo<KpiDashboardData>(() => {
    const monthQueriesLoading =
      assignmentQueries.some((q) => q.isLoading) ||
      summariesQueries.some((q) => q.isLoading) ||
      questionnaireQueries.some((q) => q.isLoading)

    const selfId = onlyAssigneeUserId?.trim() || ''
    const isPersonal = Boolean(selfId)

    const members = membersQ.data?.members ?? []
    const activeMembers = members.filter((m) => m.status !== 'INACTIVE')
    const membersById = new Map(members.map((m) => [m.userId, m]))

    let assignments = mergeAssignments(assignmentQueries.map((q) => q.data ?? []))
    let summaries = summariesQueries.flatMap((q) => q.data ?? [])
    const questionnaire = mergeQuestionnaires(questionnaireQueries.map((q) => q.data))

    if (isPersonal) {
      assignments = assignments.filter((a) => a.assigneeUserId === selfId)
      summaries = summaries.filter((s) => s.assigneeUserId === selfId)
    }

    /* ---------- 3 card tổng quan ---------- */
    const kpiAssigns = assignments.filter((a) => a.kind === 'KPI')
    const okrAssigns = assignments.filter((a) => a.kind === 'OKR')
    const kpiOk = kpiAssigns.filter(isAssignmentOk).length
    const okrOk = okrAssigns.filter(isAssignmentOk).length
    const kpiPct = kpiAssigns.length ? Math.round((kpiOk / kpiAssigns.length) * 100) : 0
    const okrPct = okrAssigns.length ? Math.round((okrOk / okrAssigns.length) * 100) : 0

    const teamSize = activeMembers.length
    let respondentsCount = 0
    let reportPct = 0
    let expectedSurveyMonths: number | undefined

    if (isPersonal) {
      const monthCount = months.length
      expectedSurveyMonths = monthCount
      for (let idx = 0; idx < months.length; idx++) {
        const q = questionnaireQueries[idx]?.data
        const answered = (q?.answers ?? []).some((a) => a.respondentUserId === selfId)
        if (answered) respondentsCount += 1
      }
      reportPct = monthCount > 0 ? Math.round((respondentsCount / monthCount) * 100) : 0
    } else {
      const uniqueRespondents = new Set<string>()
      for (const a of questionnaire?.answers ?? []) {
        if (a.respondentUserId) uniqueRespondents.add(a.respondentUserId)
      }
      respondentsCount = uniqueRespondents.size
      reportPct = teamSize > 0 ? Math.round((respondentsCount / teamSize) * 100) : 0
    }

    /* ---------- Donut trạng thái & đánh giá ---------- */
    const statusBreakdown: Record<AssignmentStatusKey, number> = {
      done: 0,
      in_progress: 0,
      not_started: 0,
      blocked: 0,
    }
    const evalBreakdown = { ok: 0, not: 0, pending: 0 }
    for (const a of assignments) {
      statusBreakdown[statusOf(a)] += 1
      const raw = (a.managerEvalStatus ?? '').trim().toUpperCase()
      if (raw === 'OK') evalBreakdown.ok += 1
      else if (raw === 'NOT') evalBreakdown.not += 1
      else evalBreakdown.pending += 1
    }

    /* ---------- Grade A/B/C — theo từng dòng summary (person-tháng) ---------- */
    const kpiGradeDist = computeGradeDist(summaries, 'kpi')
    const okrGradeDist = computeGradeDist(summaries, 'okr')

    /* ---------- Top priority + Per-person (cộng dồn tháng) ---------- */
    const topPriority = computeTopPriority(assignments, 6)
    const perPerson =
      summaries.length > 0
        ? aggregatePerPersonAcrossMonths(summaries, membersById)
        : aggregatePerPersonFromAssignments(assignments, membersById)

    /* ---------- Trend — mỗi tháng trong kỳ ---------- */
    const trend: TrendPoint[] = months.map((m, idx) => {
      let rows = summariesQueries[idx]?.data ?? []
      if (isPersonal) {
        rows = rows.filter((r) => r.assigneeUserId === selfId)
      }
      const hasData = rows.length > 0
      const kpiRate = hasData
        ? Math.round(rows.reduce((sum, r) => sum + (r.kpiRate ?? 0), 0) / rows.length)
        : 0
      const okrRate = hasData
        ? Math.round(rows.reduce((sum, r) => sum + (r.okrRate ?? 0), 0) / rows.length)
        : 0
      return {
        key: `${yNorm}-${String(m).padStart(2, '0')}`,
        label: `T${m}/${String(yNorm).slice(-2)}`,
        year: yNorm,
        month: m,
        kpiRate,
        okrRate,
        hasData,
      }
    })

    const isLoading = hasTeam && (membersQ.isLoading || monthQueriesLoading)

    return {
      isLoading,
      teamId,
      year: yNorm,
      startMonth: sNorm,
      endMonth: eNorm,
      monthSpan: months.length,
      teamSize,
      members,
      assignments,
      summaries,
      questionnaire,
      kpi: { totalCount: kpiAssigns.length, okCount: kpiOk, percent: kpiPct },
      okr: { totalCount: okrAssigns.length, okCount: okrOk, percent: okrPct },
      report: isPersonal
        ? { respondentsCount, percent: reportPct, expectedSurveyMonths }
        : { respondentsCount, percent: reportPct },
      statusBreakdown,
      evalBreakdown,
      kpiGradeDist,
      okrGradeDist,
      topPriority,
      perPerson,
      trend,
    }
  }, [
    hasTeam,
    teamId,
    yNorm,
    sNorm,
    eNorm,
    months,
    membersQ.data,
    membersQ.isLoading,
    assignmentQueries,
    summariesQueries,
    questionnaireQueries,
    onlyAssigneeUserId,
  ])
}
