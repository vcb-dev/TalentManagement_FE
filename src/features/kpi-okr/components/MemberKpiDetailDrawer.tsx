import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { KpiProgressBar } from '@/features/kpi-okr/components/KpiProgressBar'
import type { PerformanceAssignment } from '@/features/kpi-okr/api'
import {
  EvalStatusBadge,
  formatViNumber,
  resolveParentKpiDisplay,
} from '@/features/kpi-okr/components/kpiAssignmentTableShared'
import {
  EvidenceImagePreviews,
  evidenceTextWithoutUploadPaths,
} from '@/features/kpi-okr/components/KpiEvidenceInput'
import { UserWorkReportHistory } from '@/features/kpi-okr/components/UserWorkReportHistory'
import { computeSubItemProgress } from '@/features/kpi-okr/utils/kpiProgressUtils'

export function MemberKpiDetailDrawer({
  open,
  onClose,
  memberName,
  teamId,
  year,
  month,
  assigneeUserId,
  assignments,
}: {
  open: boolean
  onClose: () => void
  memberName: string
  teamId: string
  year: number
  month: number
  assigneeUserId: string
  assignments: PerformanceAssignment[]
}) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPosition = body.style.position
    const prevTop = body.style.top
    const prevWidth = body.style.width
    const scrollY = window.scrollY

    // Lock background scroll while modal is open.
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'

    return () => {
      body.style.overflow = prevOverflow
      body.style.position = prevPosition
      body.style.top = prevTop
      body.style.width = prevWidth
      window.scrollTo(0, scrollY)
    }
  }, [open])

  if (!open) return null

  const subItemCount = assignments.reduce((sum, a) => sum + (a.subItems?.length ?? 0), 0)
  const progressValues = assignments
    .map((a) => resolveParentKpiDisplay(a).progress)
    .filter((v): v is number => v != null)
  const avgProgress =
    progressValues.length > 0
      ? Math.round(progressValues.reduce((sum, v) => sum + v, 0) / progressValues.length)
      : 0
  const okCount = assignments.filter(
    (a) =>
      a.finalEvalStatus?.trim().toUpperCase() === 'OK' ||
      a.managerEvalStatus?.trim().toUpperCase() === 'OK' ||
      a.selfEvalStatus?.trim().toUpperCase() === 'OK'
  ).length
  const evidenceCount = assignments.filter((a) => a.evidence?.trim()).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-kpi-detail-title"
    >
      <div className="relative flex max-h-[min(92vh,900px)] w-full max-w-[min(96vw,1120px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4 px-6 py-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Chi tiết đánh giá
              </p>
              <h2
                id="member-kpi-detail-title"
                className="mt-1 truncate text-2xl font-bold text-slate-950 dark:text-slate-50"
              >
                {memberName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Kỳ T{month}/{year} · {assignments.length} mục tiêu · {subItemCount} mục con
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3 px-6 pb-5 sm:grid-cols-4">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-slate-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                Tiến độ TB
              </p>
              <p className="mt-2 text-2xl font-black text-indigo-700 dark:text-indigo-300">
                {avgProgress}%
              </p>
              <KpiProgressBar
                value={avgProgress}
                className="mt-3"
                barClassName="h-1.5 bg-indigo-600"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Mục tiêu
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                {assignments.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">{okCount} mục OK</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Mục con
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                {subItemCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">Theo trọng số KPI</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Minh chứng
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                {evidenceCount}/{assignments.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Mục có file/link</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-slate-50">
                    KPI/OKR chi tiết
                  </h3>
                  <p className="text-sm text-slate-500">
                    Tổng hợp chỉ tiêu, kết quả, đánh giá, minh chứng và mục con trên cùng một màn.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {assignments.map((a) => {
                  const display = resolveParentKpiDisplay(a)
                  const pct = display.progress ?? 0
                  const subItems = a.subItems ?? []
                  const evidenceText = evidenceTextWithoutUploadPaths(a.evidence)
                  return (
                    <div
                      key={a.id}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
                    >
                      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-indigo-50/40 to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'rounded-md px-2 py-0.5 text-[10px] font-bold text-white',
                                  a.kind === 'KPI'
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                                    : 'bg-gradient-to-r from-fuchsia-600 to-violet-600'
                                )}
                              >
                                {a.kind}
                              </span>
                              {subItems.length > 0 ? (
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                  {subItems.length} mục con
                                </span>
                              ) : null}
                            </div>
                            <h4 className="mt-2 text-base font-bold text-slate-950 dark:text-slate-50">
                              {a.content}
                            </h4>
                          </div>
                          <div className="w-36 shrink-0 text-right">
                            <p className="text-2xl font-black text-indigo-600">{pct}%</p>
                            <span className="text-xs text-slate-500">tiến độ</span>
                          </div>
                        </div>
                        <KpiProgressBar
                          value={pct}
                          className="mt-4"
                          barClassName="h-2 bg-indigo-600"
                        />
                      </div>

                      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="space-y-4 p-5">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Chỉ tiêu
                              </p>
                              <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                                {display.targetMetric}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Thực tế
                              </p>
                              <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                                {display.numericLabel}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Đơn vị
                              </p>
                              <p className="mt-2 text-sm font-bold uppercase text-slate-900 dark:text-slate-100">
                                {display.numericUnit}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                              Kết quả đánh giá
                            </p>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                                <p className="mb-2 font-semibold uppercase text-slate-400">
                                  Tự đánh giá
                                </p>
                                <EvalStatusBadge status={a.selfEvalStatus ?? null} type="self" />
                              </div>
                              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                                <p className="mb-2 font-semibold uppercase text-slate-400">
                                  Leader
                                </p>
                                <EvalStatusBadge
                                  status={a.managerEvalStatus ?? null}
                                  type="leader"
                                />
                              </div>
                              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                                <p className="mb-2 font-semibold uppercase text-slate-400">
                                  Manager
                                </p>
                                <EvalStatusBadge
                                  status={a.finalEvalStatus ?? null}
                                  type="manager"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Minh chứng
                            </p>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                              {evidenceText || '—'}
                            </p>
                            <EvidenceImagePreviews evidence={a.evidence} />
                          </div>
                        </div>

                        <div className="border-t border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40 lg:border-l lg:border-t-0">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                Mục con
                              </p>
                              <p className="text-xs text-slate-500">
                                Chi tiết trọng số và kết quả từng hạng mục
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                              {subItems.length}
                            </span>
                          </div>
                          {subItems.length > 0 ? (
                            <div className="space-y-3">
                              {subItems.map((s) => {
                                const subPct = computeSubItemProgress(s)
                                return (
                                  <div
                                    key={s.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        {s.label}
                                      </span>
                                      <span className="text-xs font-black text-indigo-600">
                                        {subPct}%
                                      </span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                                      <div>
                                        <p className="font-semibold uppercase text-slate-400">CT</p>
                                        <p>{s.targetMetric ?? '—'}</p>
                                      </div>
                                      <div>
                                        <p className="font-semibold uppercase text-slate-400">SL</p>
                                        <p>{formatViNumber(s.numericValue)}</p>
                                      </div>
                                      <div>
                                        <p className="font-semibold uppercase text-slate-400">
                                          ĐVT
                                        </p>
                                        <p>{s.numericUnit ?? '—'}</p>
                                      </div>
                                    </div>
                                    <KpiProgressBar
                                      value={subPct}
                                      className="mt-1.5"
                                      barClassName="h-1.5"
                                    />
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      <EvalStatusBadge
                                        status={s.selfEvalStatus ?? null}
                                        type="self"
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <EmptyState
                              title="Không có mục con"
                              compact
                              className="rounded-2xl border border-dashed border-slate-300 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="mb-3">
                <h3 className="text-base font-bold text-slate-950 dark:text-slate-50">
                  Lịch sử báo cáo
                </h3>
                <p className="text-sm text-slate-500">
                  Toàn bộ lịch sử cập nhật kết quả của nhân sự này.
                </p>
              </div>
              <UserWorkReportHistory userId={assigneeUserId} />
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
