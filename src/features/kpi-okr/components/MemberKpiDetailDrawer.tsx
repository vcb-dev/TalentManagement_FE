import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { PerformanceAssignment } from '@/features/kpi-okr/api'
import { computeRowProgress } from '@/features/kpi-okr/utils/kpiProgressUtils'
import { KpiProgressBar } from '@/features/kpi-okr/components/KpiProgressBar'
import {
  EvalStatusBadge,
  formatViNumber,
  resolveParentKpiDisplay,
} from '@/features/kpi-okr/components/kpiAssignmentTableShared'
import { AssignmentSubItemsInline } from '@/features/kpi-okr/components/kpiSubItemsShared'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface MemberKpiDetailDrawerProps {
  open: boolean
  onClose: () => void
  memberName: string
  teamId: string
  year: number
  month: number
  assigneeUserId: string
  assignments: PerformanceAssignment[]
}

export function MemberKpiDetailDrawer({
  open,
  onClose,
  memberName,
  teamId,
  year,
  month,
  assigneeUserId,
  assignments,
}: MemberKpiDetailDrawerProps) {
  const rows = useMemo(() => {
    return assignments.map((a) => {
      const parentDisplay = resolveParentKpiDisplay(a)
      const progress = computeRowProgress(a.numericValue ?? null, a.targetMetric, a.progressPercent)
      return { ...a, parentDisplay, progress }
    })
  }, [assignments])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>KPI/OKR – {memberName}</span>
            <span className="text-sm font-normal text-slate-400">
              T{month}/{year}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có chỉ tiêu nào</p>
          )}

          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {row.content}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {row.parentDisplay.targetMetric && (
                      <span>Mục tiêu: {row.parentDisplay.targetMetric}</span>
                    )}
                    {row.parentDisplay.numericLabel && (
                      <span>KQ: {row.parentDisplay.numericLabel}</span>
                    )}
                    {row.parentDisplay.numericUnit && (
                      <span>({row.parentDisplay.numericUnit})</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <EvalStatusBadge
                    status={row.finalEvalStatus ?? row.selfEvalStatus ?? null}
                    type="manager"
                  />
                </div>
              </div>

              {row.progress != null && (
                <div className="mt-2">
                  <KpiProgressBar value={row.progress} barClassName="h-1.5" />
                </div>
              )}

              {(row.subItems?.length ?? 0) > 0 && (
                <AssignmentSubItemsInline
                  subItems={row.subItems ?? []}
                  expanded
                  showProgress
                  onToggle={() => {}}
                />
              )}

              {row.evidence && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-slate-500">
                  {row.evidence}
                </p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
