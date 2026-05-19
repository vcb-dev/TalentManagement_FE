import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  performanceApi,
  type LeaderEvaluationRow,
  type PerformanceAssignment,
} from '@/features/kpi-okr/api'
import {
  ASSIGN_TABLE_HEAD,
  AssignmentEpic4ReadCells,
  AssignmentEpic4ReadStack,
  ContentCell,
  KindBadge,
  PriorityBadge,
  XL_TH,
  formatKpiSetAt,
  formatViNumber,
  periodLabel,
  xlTd,
} from '@/features/kpi-okr/components/kpiAssignmentTableShared'
import { useHrOrgTree } from '@/features/hr-admin/useHrOrgTree'
import { useAuthStore } from '@/stores/auth.store'
import type { UserSession } from '@/types/auth'
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isMockApiEnabled } from '@/lib/mockEnv'

const PERIOD_YEARS = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function leaderReviewDivisionScopeRelaxed(user: UserSession | null): boolean {
  if (!user) return false
  const rs = user.roles?.length ? user.roles : [user.role]
  return rs.some((r) => r === 'BOD' || r === 'HR')
}

export function LeaderReviewScreen() {
  const user = useAuthStore((s) => s.user)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [teamId, setTeamId] = useState<string>('')
  const [expandAll, setExpandAll] = useState(false)
  const queryClient = useQueryClient()

  const treeQ = useHrOrgTree()
  const divisions = treeQ.data?.departments ?? []
  const treeReady = treeQ.isSuccess && divisions.length > 0

  const managedTeams = useMemo(() => {
    if (!treeReady || !user) return []
    const relaxed = leaderReviewDivisionScopeRelaxed(user)
    if (relaxed) {
      return divisions
        .flatMap((d) =>
          d.teams.map((t) => ({
            id: t.id,
            name: t.name,
            divisionName: d.name,
          }))
        )
        .sort((a, b) =>
          `${a.divisionName}\u0000${a.name}`.localeCompare(`${b.divisionName}\u0000${b.name}`, 'vi')
        )
    }
    const deptId = user.departmentId?.trim()
    const div = divisions.find((d) => d.id === deptId)
    return (div?.teams ?? [])
      .map((t) => ({
        id: t.id,
        name: t.name,
        divisionName: div?.name ?? '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [treeReady, divisions, user])

  useEffect(() => {
    if (!treeReady || managedTeams.length === 0) return
    setTeamId((prev) => {
      if (prev && managedTeams.some((t) => t.id === prev)) return prev
      if (managedTeams.length === 1) return managedTeams[0]!.id
      const tid = user?.teamIds?.[0]
      if (tid && managedTeams.some((t) => t.id === tid)) return tid
      return managedTeams[0]!.id
    })
  }, [treeReady, managedTeams, user?.teamIds])

  const relaxed = leaderReviewDivisionScopeRelaxed(user)

  const autoRecalcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const invalidateLeaderReview = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['performance', 'leader-evaluations', teamId, year, month],
    })
    void queryClient.invalidateQueries({
      queryKey: ['performance', 'assignments', 'leader-review', teamId, year, month],
    })
    void queryClient.invalidateQueries({
      queryKey: ['kpi-summaries', teamId, year, month],
    })
    if (teamId && !isMockApiEnabled()) {
      if (autoRecalcTimerRef.current) clearTimeout(autoRecalcTimerRef.current)
      autoRecalcTimerRef.current = setTimeout(() => {
        void performanceApi
          .recalculateSummaries(teamId, year, month)
          .then(() =>
            queryClient.invalidateQueries({ queryKey: ['kpi-summaries', teamId, year, month] })
          )
      }, 1500)
    }
  }, [queryClient, teamId, year, month])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['performance', 'leader-evaluations', teamId, year, month],
    queryFn: () => performanceApi.listLeaderEvaluations(teamId, year, month),
    enabled: !!teamId,
  })

  const assignmentsQ = useQuery({
    queryKey: ['performance', 'assignments', 'leader-review', teamId, year, month],
    queryFn: () => performanceApi.listAssignments(teamId!, year, month),
    enabled: Boolean(teamId) && !isMockApiEnabled(),
    staleTime: 15_000,
  })

  const assignmentsByLeader = useMemo(() => {
    const m = new Map<string, PerformanceAssignment[]>()
    for (const a of assignmentsQ.data ?? []) {
      const arr = m.get(a.assigneeUserId) ?? []
      arr.push(a)
      m.set(a.assigneeUserId, arr)
    }
    for (const [, arr] of m) {
      arr.sort(
        (x, y) =>
          x.priority - y.priority ||
          x.kind.localeCompare(y.kind) ||
          x.content.localeCompare(y.content, 'vi')
      )
    }
    return m
  }, [assignmentsQ.data])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Đánh giá trưởng nhóm
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Trưởng nhóm tự điền kết quả và tự đánh giá trên workspace KPI; quản lý chấm OK/NOT từng
          chỉ tiêu kỳ đã chọn.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nhóm</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="w-[220px] h-9 rounded-lg">
                  <SelectValue placeholder="Chọn nhóm" />
                </SelectTrigger>
                <SelectContent>
                  {managedTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {relaxed && t.divisionName ? `${t.divisionName} — ${t.name}` : t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Năm</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[100px] h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tháng</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[90px] h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      T{m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto gap-1.5 self-end"
              onClick={() => setExpandAll((v) => !v)}
            >
              {expandAll ? (
                <>
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                  Thu gọn tất cả
                </>
              ) : (
                <>
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  Mở rộng tất cả
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leader List */}
      {!teamId ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-sm text-slate-400">
            {treeQ.isLoading
              ? 'Đang tải danh sách nhóm…'
              : managedTeams.length === 0
                ? 'Tài khoản chưa có nhóm trong phạm vi quản lý (hoặc chưa gắn phòng ban tổ chức).'
                : 'Chọn nhóm để xem danh sách trưởng nhóm.'}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError || !data ? (
        <Card className="border-dashed border-rose-200">
          <CardContent className="pt-6 text-center text-sm text-rose-500">
            Lỗi khi tải dữ liệu — vui lòng thử lại.
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-sm text-slate-400">
            Nhóm này chưa có trưởng nhóm.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((leader) => (
            <LeaderEvaluationRow
              key={leader.userId}
              leader={leader}
              assignmentRows={assignmentsByLeader.get(leader.userId) ?? []}
              assignmentsLoading={assignmentsQ.isLoading}
              assignmentsFetchError={assignmentsQ.isError}
              assignmentsDisabled={isMockApiEnabled()}
              onSaved={invalidateLeaderReview}
              forceExpand={expandAll}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LeaderEvaluationRow({
  leader,
  assignmentRows,
  assignmentsLoading,
  assignmentsFetchError,
  assignmentsDisabled,
  onSaved,
  forceExpand,
}: {
  leader: LeaderEvaluationRow
  assignmentRows: PerformanceAssignment[]
  assignmentsLoading: boolean
  assignmentsFetchError: boolean
  assignmentsDisabled: boolean
  onSaved: () => void
  forceExpand?: boolean
}) {
  const [assignmentsOpen, setAssignmentsOpen] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const rowRefs = useRef<Map<string, AssignmentEditorHandle>>(new Map())

  useEffect(() => {
    setAssignmentsOpen(!!forceExpand)
  }, [forceExpand])

  const handleSaveAll = async () => {
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
  }

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

type AssignmentEditorHandle = { save: () => Promise<void> }

const ManagerLeaderAssignmentEditor = forwardRef<
  AssignmentEditorHandle,
  { assignment: PerformanceAssignment; onSaved: () => void; rowStripe?: boolean }
>(function ManagerLeaderAssignmentEditor({ assignment, onSaved, rowStripe }, ref) {
  const [status, setStatus] = useState(() => assignment.managerEvalStatus?.trim() ?? '')
  const [note, setNote] = useState(() => assignment.managerReviewNote?.trim() ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus(assignment.managerEvalStatus?.trim() ?? '')
    setNote(assignment.managerReviewNote?.trim() ?? '')
  }, [
    assignment.id,
    assignment.managerEvalStatus,
    assignment.managerReviewNote,
    assignment.updatedAt,
  ])

  const save = async () => {
    setSaving(true)
    try {
      await performanceApi.patchAssignment(assignment.id, {
        managerEvalStatus: status.trim() ? status : null,
        managerReviewNote: note.trim() ? note : null,
      })
      toast.success('Đã lưu đánh giá mục')
      onSaved()
    } catch {
      toast.error('Không lưu được mục — kiểm tra quyền.')
      throw new Error('save failed')
    } finally {
      setSaving(false)
    }
  }

  useImperativeHandle(ref, () => ({ save }), [status, note])

  const td = xlTd(rowStripe ?? false)

  return (
    <TableRow className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
      <TableCell className={cn(td, 'whitespace-nowrap tabular-nums text-slate-500 font-medium')}>
        {periodLabel(assignment)}
      </TableCell>
      <TableCell className={cn(td, 'whitespace-nowrap tabular-nums text-slate-500')}>
        {formatKpiSetAt(assignment.kpiSetAt)}
      </TableCell>
      <TableCell className={td}>
        <KindBadge kind={assignment.kind} />
      </TableCell>
      <TableCell className={td}>
        <PriorityBadge priority={assignment.priority} />
      </TableCell>
      <TableCell className={cn(td, 'min-w-[195px] max-w-[285px]')}>
        <ContentCell content={assignment.content} />
      </TableCell>
      <TableCell className={cn(td, 'tabular-nums font-semibold text-primary')}>
        {formatViNumber(assignment.targetMetric) || '—'}
      </TableCell>
      <AssignmentEpic4ReadCells row={assignment} td={td} />
      <TableCell
        className={cn(
          td,
          'sticky right-[104px] z-10 min-w-[140px] bg-white shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.12)] dark:bg-slate-950',
          rowStripe && 'bg-slate-50 dark:bg-slate-900'
        )}
      >
        <div className="flex flex-col gap-2">
          <Select
            value={status || '__none'}
            onValueChange={(v) => setStatus(v === '__none' ? '' : v)}
            disabled={saving}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">—</SelectItem>
              <SelectItem value="OK">OK</SelectItem>
              <SelectItem value="NOT">NOT</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            disabled={saving}
            className="min-h-[52px] resize-y text-xs"
            placeholder="Nhận xét QL…"
          />
        </div>
      </TableCell>
      <TableCell
        className={cn(
          td,
          'sticky right-0 z-10 w-[76px] whitespace-nowrap bg-white text-right shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.12)] dark:bg-slate-950'
        )}
      >
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? '…' : 'Lưu'}
        </Button>
      </TableCell>
    </TableRow>
  )
})

const ManagerLeaderAssignmentMobileCard = forwardRef<
  AssignmentEditorHandle,
  { assignment: PerformanceAssignment; onSaved: () => void; rowStripe?: boolean }
>(function ManagerLeaderAssignmentMobileCard({ assignment, onSaved, rowStripe }, ref) {
  const [status, setStatus] = useState(() => assignment.managerEvalStatus?.trim() ?? '')
  const [note, setNote] = useState(() => assignment.managerReviewNote?.trim() ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus(assignment.managerEvalStatus?.trim() ?? '')
    setNote(assignment.managerReviewNote?.trim() ?? '')
  }, [
    assignment.id,
    assignment.managerEvalStatus,
    assignment.managerReviewNote,
    assignment.updatedAt,
  ])

  const save = async () => {
    setSaving(true)
    try {
      await performanceApi.patchAssignment(assignment.id, {
        managerEvalStatus: status.trim() ? status : null,
        managerReviewNote: note.trim() ? note : null,
      })
      toast.success('Đã lưu đánh giá mục')
      onSaved()
    } catch {
      toast.error('Không lưu được mục — kiểm tra quyền.')
      throw new Error('save failed')
    } finally {
      setSaving(false)
    }
  }

  useImperativeHandle(ref, () => ({ save }), [status, note])

  return (
    <div
      className={cn(
        'space-y-3 py-4 first:pt-0',
        rowStripe ? 'bg-slate-50/30 dark:bg-slate-900/20' : ''
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums text-slate-500">
        <span className="font-medium">{periodLabel(assignment)}</span>
        <span>{formatKpiSetAt(assignment.kpiSetAt)}</span>
        <KindBadge kind={assignment.kind} />
        <PriorityBadge priority={assignment.priority} />
      </div>
      <p className="break-words text-sm font-medium text-slate-900 dark:text-slate-100">
        {assignment.content}
      </p>
      <p className="text-sm font-semibold tabular-nums text-primary">
        Chỉ tiêu: {assignment.targetMetric || '—'}
      </p>
      <AssignmentEpic4ReadStack row={assignment} />
      <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="text-xs font-bold uppercase text-slate-400">Đánh giá QL</span>
        <Select
          value={status || '__none'}
          onValueChange={(v) => setStatus(v === '__none' ? '' : v)}
          disabled={saving}
        >
          <SelectTrigger className="h-10 w-full text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">—</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="NOT">NOT</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          disabled={saving}
          className="min-h-[72px] resize-y text-xs"
          placeholder="Nhận xét QL…"
        />
        <Button
          type="button"
          size="sm"
          className="h-10 w-full"
          variant="secondary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? '…' : 'Lưu'}
        </Button>
      </div>
    </div>
  )
})
