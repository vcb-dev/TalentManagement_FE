import { User, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PerformanceAssignment, PerformanceSummaryRow } from '@/features/kpi-okr/api'

interface MemberEvaluationSummaryCardProps {
  memberName: string
  summary: PerformanceSummaryRow | null
  assignments: PerformanceAssignment[]
  onViewDetail: () => void
}

export function MemberEvaluationSummaryCard({
  memberName,
  summary,
  assignments,
  onViewDetail,
}: MemberEvaluationSummaryCardProps) {
  const kpiCount = assignments.filter((a) => a.type === 'KPI').length
  const okrCount = assignments.filter((a) => a.type === 'OKR').length

  return (
    <div className="flex flex-col gap-4 bg-slate-50/50 p-4 border-b dark:bg-slate-900/20 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200">{memberName}</h4>
          <p className="text-xs text-slate-500">
            {kpiCount} KPI &amp; {okrCount} OKR assigned
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs md:gap-6">
        {summary ? (
          <>
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                KPI Rate
              </span>
              <span className="font-black text-slate-700 dark:text-slate-300">
                {summary.kpiRate}% ({summary.kpiGrade || 'N/A'})
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                OKR Rate
              </span>
              <span className="font-black text-slate-700 dark:text-slate-300">
                {summary.okrRate}% ({summary.okrGrade || 'N/A'})
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Status
              </span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                KPI: {summary.kpiOkCount} OK / {summary.kpiNotCount} NOT | OKR: {summary.okrOkCount}{' '}
                OK / {summary.okrNotCount} NOT
              </span>
            </div>
          </>
        ) : (
          <span className="text-slate-400 italic">No summary data available</span>
        )}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1 rounded-xl text-primary font-bold hover:bg-primary/5"
          onClick={onViewDetail}
        >
          Chi tiết
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
