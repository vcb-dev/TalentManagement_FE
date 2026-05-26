import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronRight, Save } from 'lucide-react'
import { type LeaderEvaluationRow, type PerformanceAssignment } from '@/features/kpi-okr/api'
import { ManagerLeaderAssignmentEditor } from './ManagerLeaderAssignmentEditor'

interface LeaderEvaluationRowProps {
  leader: LeaderEvaluationRow
  assignmentRows: PerformanceAssignment[]
  assignmentsLoading: boolean
  assignmentsFetchError: boolean
  assignmentsDisabled: boolean
  onSaved: () => void
  forceExpand?: boolean
}

export function LeaderEvaluationRowCard({
  leader,
  assignmentRows,
  assignmentsLoading,
  assignmentsFetchError,
  assignmentsDisabled,
  onSaved,
  forceExpand,
}: LeaderEvaluationRowProps) {
  const [assignmentsOpen, setAssignmentsOpen] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const rowRefs = useRef<Map<string, AssignmentEditorHandle>>(new Map())

  useEffect(() => {
    setAssignmentsOpen(!!forceExpand)
  }, [forceExpand])

  const handleSaveAll = useCallback(async () => {
    setSavingAll(true)
    const saves = [...rowRefs.current.values()].map((r) => r.save())
    const results = await Promise.allSettled(saves)
    setSavingAll(false)
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      toast.error(`${failed} mục lưu thất bại — kiểm tra quyền.`)
    } else {
      toast.success(`Đã lưu tất cả ${results.length} mục.`)
    }
    onSaved()
  }, [onSaved])

  const kpiTotal = leader.kpiOkCount + leader.kpiNotCount
  const okrTotal = leader.okrOkCount + leader.okrNotCount

  return (
    <Card className="group transition-all hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-950">
              {leader.displayName?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {leader.displayName || leader.email || 'Chưa rõ'}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                <span>
                  KPI: {leader.kpiOkCount}/{kpiTotal || 0}
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  OKR: {leader.okrOkCount}/{okrTotal || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={() => setAssignmentsOpen((v) => !v)}
            >
              {assignmentsOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Chấm từng mục ({assignmentRows.length})
            </Button>
            {assignmentsOpen && assignmentRows.length > 0 && !assignmentsDisabled ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-1"
                disabled={savingAll}
                onClick={() => void handleSaveAll()}
              >
                <Save className="h-3.5 w-3.5" />
                {savingAll ? 'Đang lưu…' : 'Lưu tất cả'}
              </Button>
            ) : null}
          </div>
        </div>

        {assignmentsOpen ? (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            {assignmentsDisabled ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Tắt chế độ giả lập để tải và chấm từng chỉ tiêu.
              </p>
            ) : assignmentsLoading ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : assignmentsFetchError ? (
              <p className="text-xs text-rose-500">Không tải được danh sách mục tiêu.</p>
            ) : assignmentRows.length === 0 ? (
              <p className="text-xs text-slate-500">
                Chưa có KPI/OKR giao cho trưởng nhóm trong kỳ này.
              </p>
            ) : (
              <>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
                  {assignmentRows.map((a, idx) => (
                    <ManagerLeaderAssignmentMobileCard
                      key={a.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(`mobile-${a.id}`, el)
                        else rowRefs.current.delete(`mobile-${a.id}`)
                      }}
                      assignment={a}
                      onSaved={onSaved}
                      rowStripe={idx % 2 === 1}
                    />
                  ))}
                </div>
                <div className="hidden max-h-[calc(100vh-400px)] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 md:block">
                  <Table className="w-full min-w-[1180px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-slate-100 dark:border-b-slate-800">
                        {ASSIGN_TABLE_HEAD.map((h, i) => (
                          <TableHead
                            key={h}
                            className={cn(
                              XL_TH,
                              i === ASSIGN_TABLE_HEAD.length - 1 &&
                                'sticky right-0 z-20 w-[76px] bg-slate-50/95 backdrop-blur-md shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.12)] dark:bg-slate-900/95',
                              i === ASSIGN_TABLE_HEAD.length - 2 &&
                                'sticky right-[76px] z-20 bg-slate-50/95 backdrop-blur-md shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.12)] dark:bg-slate-900/95'
                            )}
                          >
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentRows.map((a, idx) => (
                        <ManagerLeaderAssignmentEditor
                          key={a.id}
                          ref={(el) => {
                            if (el) rowRefs.current.set(a.id, el)
                            else rowRefs.current.delete(a.id)
                          }}
                          assignment={a}
                          onSaved={onSaved}
                          rowStripe={idx % 2 === 1}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
