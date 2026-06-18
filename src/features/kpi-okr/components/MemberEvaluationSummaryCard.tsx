import { AlertTriangle, ChevronRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KpiProgressBar } from '@/features/kpi-okr/components/KpiProgressBar'
import { Button } from '@/components/ui/button'
import type {
  PerformanceAssignment,
  PerformanceGradeLetter,
  PerformanceSummaryRow,
} from '@/features/kpi-okr/api'
import { computeRowProgress } from '@/features/kpi-okr/utils/kpiProgressUtils'

/** % tổng trên thẻ member — chỉ trung bình các loại (KPI/OKR) thực sự có dữ liệu. */
export function computeOverallSummaryRate(summary: PerformanceSummaryRow): number {
  const parts: number[] = []
  const hasKpi =
    (summary.kpiOkCount ?? 0) + (summary.kpiNotCount ?? 0) > 0 || summary.kpiGrade != null
  const hasOkr =
    (summary.okrOkCount ?? 0) + (summary.okrNotCount ?? 0) > 0 || summary.okrGrade != null
  if (hasKpi) parts.push(summary.kpiRate)
  if (hasOkr) parts.push(summary.okrRate)
  if (!parts.length) return 0
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
}

function GradeBadge({ grade }: { grade: PerformanceGradeLetter | null | undefined }) {
  if (!grade) return null
  const colors =
    grade === 'A'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
      : grade === 'B'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', colors)}>{grade}</span>
}

export function MemberEvaluationSummaryCard({
  memberName,
  summary,
  assignments,
  onViewDetail,
}: {
  memberName: string
  summary: PerformanceSummaryRow | null
  assignments: PerformanceAssignment[]
  onViewDetail: () => void
}) {
  const kpiTotal = (summary?.kpiOkCount ?? 0) + (summary?.kpiNotCount ?? 0)
  const okrTotal = (summary?.okrOkCount ?? 0) + (summary?.okrNotCount ?? 0)
  const overallRate = summary
    ? computeOverallSummaryRate(summary)
    : Math.round(
        assignments.reduce((sum, a) => {
          const p =
            computeRowProgress(a.numericValue ?? null, a.targetMetric, a.progressPercent) ?? 0
          return sum + p
        }, 0) / Math.max(assignments.length, 1)
      )

  const missingEvidence = assignments.filter((a) => !a.evidence?.trim() && !a.numericValue).length

  return (
    <div className="mb-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 p-3 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-violet-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            {memberName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{memberName}</span>
              <GradeBadge grade={summary?.kpiGrade ?? summary?.okrGrade ?? null} />
              <span className="text-sm font-bold text-indigo-600">{overallRate}%</span>
            </div>
            <KpiProgressBar
              value={overallRate}
              className="mt-2 max-w-xs"
              barClassName="bg-indigo-500"
            />
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              {kpiTotal > 0 && (
                <span>
                  KPI: {summary?.kpiOkCount ?? 0}/{kpiTotal} đạt
                </span>
              )}
              {okrTotal > 0 && (
                <span>
                  OKR: {summary?.okrOkCount ?? 0}/{okrTotal} đạt
                </span>
              )}
              {missingEvidence > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  Thiếu {missingEvidence} minh chứng
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1 rounded-lg text-xs"
          onClick={onViewDetail}
        >
          Xem chi tiết
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function MemberSummaryStrip({
  summaries,
  assignments,
}: {
  summaries: PerformanceSummaryRow[]
  assignments: PerformanceAssignment[]
}) {
  const byUser = new Map(summaries.map((s) => [s.assigneeUserId, s]))
  const grouped = new Map<string, PerformanceAssignment[]>()
  for (const a of assignments) {
    const list = grouped.get(a.assigneeUserId) ?? []
    list.push(a)
    grouped.set(a.assigneeUserId, list)
  }
  return (
    <div className="mb-3 flex flex-wrap gap-2 px-3 pt-2">
      {[...grouped.entries()].map(([userId, items]) => {
        const s = byUser.get(userId)
        const name = items[0]?.assigneeDisplayName ?? userId
        const rate = s ? computeOverallSummaryRate(s) : 0
        return (
          <div
            key={userId}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-2 py-1 text-xs dark:bg-slate-900"
          >
            <User className="h-3 w-3 text-slate-400" />
            <span className="font-medium">{name}</span>
            <GradeBadge grade={s?.kpiGrade ?? s?.okrGrade ?? null} />
            <span className="text-indigo-600 font-semibold">{rate}%</span>
          </div>
        )
      })}
    </div>
  )
}
