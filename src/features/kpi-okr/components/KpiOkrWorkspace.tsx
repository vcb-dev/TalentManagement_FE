import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { ChevronRight, ClipboardList, FileText, RefreshCw, Target, Users } from 'lucide-react'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { useHrOrgTree, ORG_TREE_KEY } from '@/features/hr-admin/useHrOrgTree'
import {
  performanceApi,
  type PerformanceAssignment,
  type PerformanceQuestionnaire,
  type PerformanceStatus,
  type PerformanceSummaryRow,
} from '@/features/kpi-okr/api'
import { organizationApi, type TeamMemberRow } from '@/features/organization/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SelectController, TextareaController } from '@/components/ui/form-controllers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function nowYm() {
  const n = new Date()
  return { year: n.getFullYear(), month: n.getMonth() + 1 }
}

/** Tháng liền kề trước (dùng cho luồng: tháng này nhập mục tiêu + kết quả tháng trước). */
function prevMonthYear(year: number, month: number): { prevYear: number; prevMonth: number } {
  if (month <= 1) return { prevYear: year - 1, prevMonth: 12 }
  return { prevYear: year, prevMonth: month - 1 }
}

export type KpiOkrWorkspaceProps = {
  variant: 'leader' | 'member'
  title: string
  description: string
}

export function KpiOkrWorkspace({ variant, title, description }: KpiOkrWorkspaceProps) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const treeQ = useHrOrgTree()
  const { year: y0, month: m0 } = nowYm()
  const [year, setYear] = useState(y0)
  const [month, setMonth] = useState(m0)
  const [selectedTeamId, setSelectedTeamId] = useState<string | ''>('')

  const eff = useMemo(
    () => (user ? resolveEffectivePermissionSet(user) : new Set<string>()),
    [user]
  )

  const canEditTeam = useMemo(() => {
    if (variant === 'leader') return eff.has('kpi.team_edit')
    return false
  }, [variant, eff])

  const canEditOwn = useMemo(() => eff.has('kpi.edit_own'), [eff])

  const departments = useMemo(() => treeQ.data?.departments ?? [], [treeQ.data])
  const selectedDept = useMemo(
    () => departments.find((d) => d.teams.some((t) => t.id === selectedTeamId)),
    [departments, selectedTeamId]
  )
  const teamsInDept = selectedDept?.teams ?? departments[0]?.teams ?? []

  useEffect(() => {
    if (selectedTeamId) return
    const ids = user?.teamIds ?? []
    const first = ids[0]
    const id = window.setTimeout(() => {
      if (first) setSelectedTeamId(first)
      else if (departments[0]?.teams[0]?.id) setSelectedTeamId(departments[0].teams[0].id)
    }, 0)
    return () => window.clearTimeout(id)
  }, [user?.teamIds, departments, selectedTeamId])

  const { prevYear, prevMonth } = useMemo(() => prevMonthYear(year, month), [year, month])

  const assignKey = useMemo(
    () => ['kpi-assignments', selectedTeamId, year, month] as const,
    [selectedTeamId, year, month]
  )
  const assignPrevKey = useMemo(
    () => ['kpi-assignments', selectedTeamId, prevYear, prevMonth] as const,
    [selectedTeamId, prevYear, prevMonth]
  )
  const sumKey = useMemo(
    () => ['kpi-summaries', selectedTeamId, year, month] as const,
    [selectedTeamId, year, month]
  )
  const membersKpiKey = useMemo(
    () => ['team-members-kpi', selectedTeamId] as const,
    [selectedTeamId]
  )

  const membersForTeamQ = useQuery({
    queryKey: membersKpiKey,
    queryFn: () => organizationApi.getTeamMembers(selectedTeamId!),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })

  const assignmentsQ = useQuery({
    queryKey: assignKey,
    queryFn: () =>
      selectedTeamId
        ? performanceApi.listAssignments(selectedTeamId, year, month)
        : Promise.resolve([] as PerformanceAssignment[]),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })

  const assignmentsPrevQ = useQuery({
    queryKey: assignPrevKey,
    queryFn: () =>
      selectedTeamId
        ? performanceApi.listAssignments(selectedTeamId, prevYear, prevMonth)
        : Promise.resolve([] as PerformanceAssignment[]),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })

  const summariesQ = useQuery({
    queryKey: sumKey,
    queryFn: () =>
      selectedTeamId
        ? performanceApi.listSummaries(selectedTeamId, year, month)
        : Promise.resolve([] as PerformanceSummaryRow[]),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: assignKey })
    void qc.invalidateQueries({ queryKey: assignPrevKey })
    void qc.invalidateQueries({ queryKey: sumKey })
  }, [qc, assignKey, assignPrevKey, sumKey])

  const mockHint = isMockApiEnabled()

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 md:px-4">
      <div className={cn('mb-6', PAGE_HEADER_SURFACE)}>
        <h1 className={PAGE_HEADER_TITLE}>
          <span className={PAGE_HEADER_GRADIENT}>{title}</span>
        </h1>
        <p className={PAGE_HEADER_DESCRIPTION}>{description}</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-base font-bold text-transparent">
            Bộ lọc KPI/OKR theo đội nhóm
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Phòng ban
              </Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedDept?.id ?? ''}
                onChange={(e) => {
                  const d = departments.find((x) => x.id === e.target.value)
                  const tid = d?.teams[0]?.id ?? ''
                  setSelectedTeamId(tid)
                }}
              >
                <option value="">— Chọn —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Team</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
              >
                <option value="">— Chọn team —</option>
                {teamsInDept.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tháng</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Năm</Label>
              <Input
                type="number"
                value={year}
                min={2020}
                max={2035}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
              Kỳ chọn: T{month}/{year}
            </Badge>
            <Badge variant="muted" className="bg-violet-100 text-violet-700">
              KQ kỳ trước: T{prevMonth}/{prevYear}
            </Badge>
            <Button
              type="button"
              variant="outline"
              className="ml-auto inline-flex items-center gap-1 border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
              onClick={() => {
                void treeQ.refetch()
                void qc.invalidateQueries({ queryKey: ORG_TREE_KEY })
                refresh()
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Làm mới dữ liệu
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Luồng theo tháng:</span> nhập{' '}
          <strong className="text-foreground">
            tháng {month}/{year}
          </strong>{' '}
          để lập mục tiêu tháng này; cập nhật kết quả tại kỳ{' '}
          <strong className="text-foreground">
            tháng {prevMonth}/{prevYear}
          </strong>
          .
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Điều hướng nhanh theo chức năng</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            <a href="#planning-section" className="inline-flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              Lập KPI/OKR
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          >
            <a href="#results-section" className="inline-flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              Cập nhật kết quả
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            <a href="#summary-section" className="inline-flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Tổng hợp hiệu suất
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100"
          >
            <a href="#form-section" className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Form câu hỏi
            </a>
          </Button>
        </CardContent>
      </Card>

      {mockHint && (
        <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Đang bật mock API — dữ liệu KPI từ server không tải được. Tắt mock để dùng đầy đủ.
        </p>
      )}

      <div className="space-y-6">
        <WorkReportPanel
          assignmentsThisMonth={assignmentsQ.data ?? []}
          assignmentsPrevMonth={assignmentsPrevQ.data ?? []}
          loadingThis={assignmentsQ.isLoading}
          loadingPrev={assignmentsPrevQ.isLoading}
          members={membersForTeamQ.data?.members ?? []}
          membersLoading={membersForTeamQ.isLoading}
          canEditTeam={canEditTeam}
          canEditOwn={canEditOwn}
          selectedTeamId={selectedTeamId}
          year={year}
          month={month}
          prevYear={prevYear}
          prevMonth={prevMonth}
          currentUserId={user?.id}
          onRefresh={refresh}
        />
        <SummaryPanel
          rows={summariesQ.data ?? []}
          loading={summariesQ.isLoading}
          teamId={selectedTeamId}
          year={year}
          month={month}
          canRecalculate={canEditTeam}
          onRecalculated={refresh}
        />
        <FormPanel
          teamId={selectedTeamId}
          year={year}
          month={month}
          canEditTeam={canEditTeam}
          currentUserId={user?.id ?? ''}
        />
      </div>

      <aside className="mt-8 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-xs text-muted-foreground">
        <div className="mb-2 font-semibold text-foreground">Điều hướng nhanh</div>
        <ul className="space-y-1">
          {departments.map((d) => (
            <li key={d.id}>
              <span className="font-medium text-foreground">{d.name}</span>
              <ul className="ml-3 mt-1 space-y-0.5">
                {d.teams.map((t) => (
                  <li key={t.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="inline-flex h-auto items-center gap-1 p-0 text-primary"
                      onClick={() => setSelectedTeamId(t.id)}
                    >
                      <ChevronRight className="h-3 w-3" />
                      {t.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

const STATUS_OPTS: PerformanceStatus[] = ['not_started', 'in_progress', 'done', 'blocked']

const STATUS_LABEL_VI: Record<PerformanceStatus, string> = {
  not_started: 'Chưa bắt đầu',
  in_progress: 'Đang thực hiện',
  done: 'Hoàn thành',
  blocked: 'Bị chặn',
}

function formatKpiSetAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN')
}

function periodLabel(row: PerformanceAssignment): string {
  return `T${row.month} - ${row.year}`
}

function nameForMember(members: TeamMemberRow[], userId: string): string {
  const m = members.find((x) => x.userId === userId)
  const name = m?.displayName?.trim()
  if (name) return name
  return 'chưa có tên'
}

function memberMetaForDisplay(members: TeamMemberRow[], userId: string): string {
  const m = members.find((x) => x.userId === userId)
  const employee = m?.employeeCodePrimary?.trim()
  if (employee) return employee
  const email = m?.email?.trim()
  if (email) return email
  return 'chưa có email'
}

/** Bảng KPI/OKR — viền & nền theo token Lumina (giữ layout ô bảng). */
const XL_BORDER = 'border border-border'
const XL_TH = cn(
  XL_BORDER,
  'sticky top-0 z-10 whitespace-nowrap bg-muted/85 px-2 py-2 text-left text-xs font-bold uppercase tracking-wide text-foreground backdrop-blur-sm'
)
const xlTd = (stripe: boolean) =>
  cn(
    XL_BORDER,
    'px-1.5 py-1 align-top text-xs leading-snug text-foreground',
    stripe ? 'bg-muted/50' : 'bg-card'
  )
const XL_INPUT = cn(
  'box-border h-9 w-full min-w-0 rounded-xl border border-slate-200/80 bg-white/95 px-2 text-xs text-slate-700 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] outline-none transition',
  'placeholder:text-slate-400 focus:z-[1] focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70'
)
const XL_TEXTAREA = cn(
  'box-border min-h-[56px] w-full min-w-[200px] max-w-[420px] resize-y rounded-xl border border-slate-200/80 bg-white/95 p-2 text-xs text-slate-700 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] outline-none transition',
  'placeholder:text-slate-400 focus:z-[1] focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70'
)

const XL_SAVE_BTN =
  'rounded-sm border border-primary/35 bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50'

const ASSIGN_TABLE_HEAD = [
  'Kỳ',
  'Ngày xét',
  'Hạng mục',
  'Ưu tiên',
  'Nội dung',
  'Chỉ tiêu',
  'Số KQ',
  'Tiến độ',
  'Trạng thái',
  'Người ĐG',
  'QL ĐG',
  'QL nhận xét',
  '',
] as const

function AssignmentProgressCell({
  row,
  currentUserId,
  canEditOwn,
  onUpdated,
  excel = false,
}: {
  row: PerformanceAssignment
  currentUserId: string | undefined
  canEditOwn: boolean
  onUpdated: () => void
  /** Gọn trong ô bảng kiểu Excel */
  excel?: boolean
}) {
  const editable =
    !isMockApiEnabled() &&
    Boolean(currentUserId) &&
    row.assigneeUserId === currentUserId &&
    canEditOwn
  const [progress, setProgress] = useState(row.progressPercent)
  const [status, setStatus] = useState<PerformanceStatus>(row.status)
  const [actualResult, setActualResult] = useState(row.actualResult ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setProgress(row.progressPercent)
      setStatus(row.status)
      setActualResult(row.actualResult ?? '')
    }, 0)
    return () => window.clearTimeout(id)
  }, [row.id, row.progressPercent, row.status, row.actualResult])

  if (!editable) {
    return (
      <div className={cn('space-y-1', excel && 'min-w-[88px]')}>
        <span className="tabular-nums text-foreground">{row.progressPercent}</span>
        {!excel && row.actualResult ? (
          <p className="text-[10px] text-muted-foreground">Số KQ: {row.actualResult}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', excel && 'min-w-[100px]')}>
      <div
        className={cn(
          'flex flex-col gap-1',
          !excel && 'sm:flex-row sm:flex-wrap sm:items-center sm:gap-2'
        )}
      >
        <label className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isNaN(n)) return
              setProgress(Math.min(100, Math.max(0, n)))
            }}
            className={
              excel
                ? cn(XL_INPUT, 'h-7 w-14 tabular-nums')
                : 'h-7 w-14 rounded border border-input bg-background px-1 py-0.5 text-xs tabular-nums'
            }
          />
          <span className="text-[10px] text-muted-foreground">%</span>
        </label>
        {!excel ? (
          <select
            className="rounded border border-input bg-background px-1.5 py-1 text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value as PerformanceStatus)}
          >
            {STATUS_OPTS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL_VI[s]}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {!excel ? (
        <label className="block text-[10px] font-medium text-muted-foreground">
          Số kết quả
          <input
            type="text"
            className="mt-0.5 w-full max-w-[160px] rounded border border-input bg-background px-1.5 py-1 text-xs"
            value={actualResult}
            onChange={(e) => setActualResult(e.target.value)}
            placeholder="VD: 50"
          />
        </label>
      ) : (
        <input
          type="text"
          className={XL_INPUT}
          title="Số kết quả (tự cập nhật)"
          value={actualResult}
          onChange={(e) => setActualResult(e.target.value)}
          placeholder="Số KQ"
        />
      )}
      <Button
        type="button"
        disabled={saving}
        className={cn(
          XL_SAVE_BTN,
          excel ? 'px-1.5 py-0.5 text-[10px]' : 'w-fit rounded-md px-2 py-1 text-xs'
        )}
        onClick={() => {
          if (progress < 0 || progress > 100) {
            return
          }
          if (actualResult.trim().length > 120) {
            return
          }
          setSaving(true)
          void performanceApi
            .patchAssignmentSelf(row.id, {
              progressPercent: progress,
              status,
              actualResult: actualResult.trim() || null,
            })
            .then(() => onUpdated())
            .finally(() => setSaving(false))
        }}
      >
        Lưu
      </Button>
    </div>
  )
}

function KindBadge({ kind }: { kind: PerformanceAssignment['kind'] }) {
  return (
    <span
      className={cn(
        'inline-block rounded-sm px-1.5 py-0.5 text-[11px] font-semibold',
        kind === 'KPI'
          ? 'bg-primary/15 text-primary ring-1 ring-primary/20'
          : 'bg-accent/12 text-accent ring-1 ring-accent/25'
      )}
    >
      {kind}
    </span>
  )
}

function ReadOnlyAssignmentRow({
  row,
  currentUserId,
  canEditOwn,
  onRefresh,
  rowStripe,
}: {
  row: PerformanceAssignment
  currentUserId: string | undefined
  canEditOwn: boolean
  onRefresh: () => void
  rowStripe: boolean
}) {
  const td = xlTd(rowStripe)
  return (
    <tr className="hover:bg-muted/70">
      <td className={cn(td, 'whitespace-nowrap tabular-nums text-muted-foreground')}>
        {periodLabel(row)}
      </td>
      <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{formatKpiSetAt(row.kpiSetAt)}</td>
      <td className={td}>
        <KindBadge kind={row.kind} />
      </td>
      <td className={cn(td, 'text-center tabular-nums')}>{row.priority}</td>
      <td className={cn(td, 'min-w-[220px] max-w-md whitespace-pre-wrap')}>{row.content}</td>
      <td className={cn(td, 'tabular-nums')}>{row.targetMetric ?? ''}</td>
      <td className={cn(td, 'tabular-nums')}>{row.actualResult ?? ''}</td>
      <td className={cn(td, 'min-w-[140px]')}>
        <AssignmentProgressCell
          row={row}
          currentUserId={currentUserId}
          canEditOwn={canEditOwn}
          onUpdated={onRefresh}
        />
      </td>
      <td className={cn(td, 'whitespace-nowrap')}>{STATUS_LABEL_VI[row.status]}</td>
      <td className={td}>{row.reviewerName ?? ''}</td>
      <td className={cn(td, 'font-medium tabular-nums')}>{row.managerEvalStatus ?? ''}</td>
      <td
        className={cn(td, 'min-w-[140px] max-w-[200px] whitespace-pre-wrap text-muted-foreground')}
      >
        {row.managerReviewNote ?? ''}
      </td>
      <td className={td} />
    </tr>
  )
}

function LeaderAssignmentRow({
  row,
  mode,
  onSaved,
  rowStripe,
}: {
  row: PerformanceAssignment
  mode: 'planning' | 'results'
  onSaved: () => void
  rowStripe: boolean
}) {
  const [content, setContent] = useState(row.content)
  const [priority, setPriority] = useState(row.priority)
  const [targetMetric, setTargetMetric] = useState(row.targetMetric ?? '')
  const [actualResult, setActualResult] = useState(row.actualResult ?? '')
  const [reviewerName, setReviewerName] = useState(row.reviewerName ?? '')
  const [managerEvalStatus, setManagerEvalStatus] = useState(row.managerEvalStatus ?? '')
  const [managerReviewNote, setManagerReviewNote] = useState(row.managerReviewNote ?? '')
  const [kpiSetAt, setKpiSetAt] = useState(row.kpiSetAt ? row.kpiSetAt.slice(0, 10) : '')
  const [progressPercent, setProgressPercent] = useState(row.progressPercent)
  const [status, setStatus] = useState<PerformanceStatus>(row.status)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (mode === 'planning') {
        setContent(row.content)
        setPriority(row.priority)
        setTargetMetric(row.targetMetric ?? '')
      }
      setActualResult(row.actualResult ?? '')
      setReviewerName(row.reviewerName ?? '')
      setManagerEvalStatus(row.managerEvalStatus ?? '')
      setManagerReviewNote(row.managerReviewNote ?? '')
      setKpiSetAt(row.kpiSetAt ? row.kpiSetAt.slice(0, 10) : '')
      setProgressPercent(row.progressPercent)
      setStatus(row.status)
    }, 0)
    return () => window.clearTimeout(id)
  }, [
    row.id,
    row.updatedAt,
    mode,
    row.content,
    row.priority,
    row.targetMetric,
    row.actualResult,
    row.reviewerName,
    row.managerEvalStatus,
    row.managerReviewNote,
    row.kpiSetAt,
    row.progressPercent,
    row.status,
  ])

  const save = () => {
    if (mode === 'planning' && !content.trim()) {
      return
    }
    if (mode === 'planning' && content.trim().length > 500) {
      return
    }
    if (priority < 0) {
      return
    }
    if (priority > 99) {
      return
    }
    if (progressPercent < 0 || progressPercent > 100) {
      return
    }
    if (kpiSetAt.trim()) {
      const dt = new Date(`${kpiSetAt.trim()}T12:00:00`)
      if (Number.isNaN(dt.getTime())) {
        return
      }
    }
    setSaving(true)
    const kpiIso = kpiSetAt.trim() ? new Date(`${kpiSetAt.trim()}T12:00:00`).toISOString() : null
    const patch =
      mode === 'results'
        ? {
            actualResult: actualResult.trim() || null,
            reviewerName: reviewerName.trim() || null,
            managerEvalStatus: managerEvalStatus.trim() || null,
            managerReviewNote: managerReviewNote.trim() || null,
            kpiSetAt: kpiIso,
            progressPercent,
            status,
          }
        : {
            content: content.trim(),
            priority,
            targetMetric: targetMetric.trim() || null,
            actualResult: actualResult.trim() || null,
            reviewerName: reviewerName.trim() || null,
            managerEvalStatus: managerEvalStatus.trim() || null,
            managerReviewNote: managerReviewNote.trim() || null,
            kpiSetAt: kpiIso,
            progressPercent,
            status,
          }
    void performanceApi
      .patchAssignment(row.id, patch)
      .then(() => onSaved())
      .finally(() => setSaving(false))
  }

  const td = xlTd(rowStripe)

  return (
    <tr
      className={cn(
        'hover:bg-success-muted/35',
        mode === 'results' &&
          'outline outline-1 outline-amber-400/45 -outline-offset-1 dark:outline-amber-600/40'
      )}
    >
      <td className={cn(td, 'whitespace-nowrap tabular-nums text-muted-foreground')}>
        {periodLabel(row)}
      </td>
      <td className={td}>
        <input
          type="date"
          className={XL_INPUT}
          value={kpiSetAt}
          onChange={(e) => setKpiSetAt(e.target.value)}
        />
      </td>
      <td className={td}>
        <KindBadge kind={row.kind} />
      </td>
      <td className={cn(td, 'text-center')}>
        {mode === 'planning' ? (
          <input
            type="number"
            min={0}
            max={99}
            className={cn(XL_INPUT, 'mx-auto w-12 text-center tabular-nums')}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) || 0)}
          />
        ) : (
          <span className="tabular-nums">{row.priority}</span>
        )}
      </td>
      <td className={td}>
        {mode === 'planning' ? (
          <textarea
            className={XL_TEXTAREA}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        ) : (
          <span className="block max-w-md whitespace-pre-wrap text-[12px]">{row.content}</span>
        )}
      </td>
      <td className={td}>
        {mode === 'planning' ? (
          <input
            type="text"
            className={cn(XL_INPUT, 'tabular-nums')}
            value={targetMetric}
            onChange={(e) => setTargetMetric(e.target.value)}
          />
        ) : (
          <span className="tabular-nums">{row.targetMetric ?? ''}</span>
        )}
      </td>
      <td className={td}>
        <input
          type="text"
          className={cn(XL_INPUT, 'tabular-nums')}
          value={actualResult}
          onChange={(e) => setActualResult(e.target.value)}
        />
      </td>
      <td className={cn(td, 'w-[4.5rem]')}>
        <input
          type="number"
          min={0}
          max={100}
          value={progressPercent}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isNaN(n)) return
            setProgressPercent(Math.min(100, Math.max(0, n)))
          }}
          className={cn(XL_INPUT, 'w-full tabular-nums')}
        />
      </td>
      <td className={cn(td, 'min-w-[8rem]')}>
        <select
          className={cn(XL_INPUT, 'h-auto min-h-[28px] py-0.5 text-[11px]')}
          value={status}
          onChange={(e) => setStatus(e.target.value as PerformanceStatus)}
        >
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL_VI[s]}
            </option>
          ))}
        </select>
      </td>
      <td className={td}>
        <input
          type="text"
          className={XL_INPUT}
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
        />
      </td>
      <td className={td}>
        <select
          className={cn(XL_INPUT, 'h-auto min-h-[28px] text-[11px]')}
          value={managerEvalStatus}
          onChange={(e) => setManagerEvalStatus(e.target.value)}
        >
          <option value="">—</option>
          <option value="OK">OK</option>
          <option value="NOT">NOT</option>
        </select>
      </td>
      <td className={td}>
        <textarea
          className={cn(XL_TEXTAREA, 'min-h-[40px] max-w-[220px]')}
          value={managerReviewNote}
          onChange={(e) => setManagerReviewNote(e.target.value)}
        />
      </td>
      <td className={cn(td, 'whitespace-nowrap')}>
        <Button
          type="button"
          disabled={saving}
          className={cn(XL_SAVE_BTN, 'px-2 py-1 text-[11px]')}
          onClick={save}
        >
          Lưu
        </Button>
      </td>
    </tr>
  )
}

function groupAssignmentsByUser(assignments: PerformanceAssignment[]) {
  const m = new Map<string, PerformanceAssignment[]>()
  for (const a of assignments) {
    const arr = m.get(a.assigneeUserId) ?? []
    arr.push(a)
    m.set(a.assigneeUserId, arr)
  }
  for (const [, arr] of m) {
    arr.sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt))
  }
  return m
}

function AssignmentTableSingleUser({
  userId,
  rows,
  members,
  canEditTeam,
  canEditOwn,
  currentUserId,
  onRefresh,
  leaderMode,
}: {
  userId: string
  rows: PerformanceAssignment[]
  members: TeamMemberRow[]
  canEditTeam: boolean
  canEditOwn: boolean
  currentUserId: string | undefined
  onRefresh: () => void
  leaderMode: 'planning' | 'results'
}) {
  return (
    <div
      className={cn(XL_BORDER, 'overflow-hidden rounded-lg bg-card shadow-[var(--shadow-card)]')}
    >
      <div className="border-b border-border bg-muted/70 px-3 py-2 text-sm font-bold text-foreground">
        <span className="text-muted-foreground">Nhân sự:</span>{' '}
        <span className="font-semibold text-foreground">{nameForMember(members, userId)}</span>
        <span className="ml-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {memberMetaForDisplay(members, userId)}
        </span>
      </div>
      <div className="max-h-[min(75vh,720px)] overflow-auto">
        <table className="w-full min-w-[1520px] border-collapse text-left">
          <thead>
            <tr>
              {ASSIGN_TABLE_HEAD.map((h) => (
                <th key={h || 'act'} className={cn(XL_TH, 'min-w-[84px]')}>
                  {h || ' '}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) =>
              canEditTeam ? (
                <LeaderAssignmentRow
                  key={r.id}
                  row={r}
                  mode={leaderMode}
                  onSaved={onRefresh}
                  rowStripe={idx % 2 === 1}
                />
              ) : (
                <ReadOnlyAssignmentRow
                  key={r.id}
                  row={r}
                  currentUserId={currentUserId}
                  canEditOwn={canEditOwn}
                  onRefresh={onRefresh}
                  rowStripe={idx % 2 === 1}
                />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserAssignmentWorkbench({
  byUser,
  members,
  canEditTeam,
  canEditOwn,
  currentUserId,
  onRefresh,
  leaderMode,
  emptyText,
}: {
  byUser: Map<string, PerformanceAssignment[]>
  members: TeamMemberRow[]
  canEditTeam: boolean
  canEditOwn: boolean
  currentUserId: string | undefined
  onRefresh: () => void
  leaderMode: 'planning' | 'results'
  emptyText: string
}) {
  const userEntries = useMemo(() => Array.from(byUser.entries()), [byUser])
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  if (!userEntries.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  const activeUserId =
    selectedUserId && byUser.has(selectedUserId) ? selectedUserId : userEntries[0]![0]
  const activeRows = byUser.get(activeUserId) ?? []

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Danh sách nhân sự
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {userEntries.map(([uid, rows]) => {
            const active = uid === activeUserId
            return (
              <button
                key={uid}
                type="button"
                onClick={() => setSelectedUserId(uid)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-primary/50 bg-primary/10 text-foreground shadow-sm'
                    : 'border-border/80 bg-background hover:bg-muted/60'
                )}
              >
                <div className="truncate text-sm font-semibold leading-5">
                  {nameForMember(members, uid)}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {memberMetaForDisplay(members, uid)}
                </div>
                <div className="mt-2">
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {rows.length} hạng mục
                  </span>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>
      <AssignmentTableSingleUser
        userId={activeUserId}
        rows={activeRows}
        members={members}
        canEditTeam={canEditTeam}
        canEditOwn={canEditOwn}
        currentUserId={currentUserId}
        onRefresh={onRefresh}
        leaderMode={leaderMode}
      />
    </div>
  )
}

function WorkReportPanel({
  assignmentsThisMonth,
  assignmentsPrevMonth,
  loadingThis,
  loadingPrev,
  members,
  membersLoading,
  canEditTeam,
  canEditOwn,
  selectedTeamId,
  year,
  month,
  prevYear,
  prevMonth,
  currentUserId,
  onRefresh,
}: {
  assignmentsThisMonth: PerformanceAssignment[]
  assignmentsPrevMonth: PerformanceAssignment[]
  loadingThis: boolean
  loadingPrev: boolean
  members: TeamMemberRow[]
  membersLoading: boolean
  canEditTeam: boolean
  canEditOwn: boolean
  selectedTeamId: string
  year: number
  month: number
  prevYear: number
  prevMonth: number
  currentUserId: string | undefined
  onRefresh: () => void
}) {
  const byUserThis = useMemo(
    () => groupAssignmentsByUser(assignmentsThisMonth),
    [assignmentsThisMonth]
  )
  const byUserPrev = useMemo(
    () => groupAssignmentsByUser(assignmentsPrevMonth),
    [assignmentsPrevMonth]
  )

  if (!selectedTeamId) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Chọn team để xem báo cáo công việc.
        </CardContent>
      </Card>
    )
  }
  if (loadingThis || loadingPrev || membersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đang tải dữ liệu KPI/OKR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-10/12" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-10">
      <section id="planning-section" className="scroll-mt-24">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-blue-700">
                  1. Mục tiêu KPI/OKR tháng này — T{month}/{year}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tập trung lập mục tiêu theo từng nhân sự, thao tác trên panel chi tiết bên phải.
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
                  {assignmentsThisMonth.length} hạng mục
                </Badge>
                <Badge variant="muted" className="bg-indigo-100 text-indigo-700">
                  {byUserThis.size} nhân sự
                </Badge>
              </div>
            </div>
            {canEditTeam && selectedTeamId && !isMockApiEnabled() && (
              <MiniCreateForm
                teamId={selectedTeamId}
                year={year}
                month={month}
                members={members}
                defaultAssigneeId={currentUserId ?? ''}
                onCreated={onRefresh}
              />
            )}
            <UserAssignmentWorkbench
              byUser={byUserThis}
              members={members}
              canEditTeam={canEditTeam}
              canEditOwn={canEditOwn}
              currentUserId={currentUserId}
              onRefresh={onRefresh}
              leaderMode="planning"
              emptyText="Chưa có mục tiêu cho tháng này."
            />
          </CardContent>
        </Card>
      </section>

      <section id="results-section" className="scroll-mt-24 pt-2">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-emerald-700">
                  2. Kết quả & đánh giá tháng trước — T{prevMonth}/{prevYear}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Duyệt theo nhân sự để cập nhật tiến độ, trạng thái và nhận xét quản lý dễ hơn.
                </p>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-700"
                >
                  {assignmentsPrevMonth.length} hạng mục
                </Badge>
                <Badge variant="muted" className="bg-teal-100 text-teal-700">
                  {byUserPrev.size} nhân sự
                </Badge>
              </div>
            </div>
            <UserAssignmentWorkbench
              byUser={byUserPrev}
              members={members}
              canEditTeam={canEditTeam}
              canEditOwn={canEditOwn}
              currentUserId={currentUserId}
              onRefresh={onRefresh}
              leaderMode="results"
              emptyText={`Chưa có dữ liệu KPI/OKR cho tháng ${prevMonth}/${prevYear}.`}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function MiniCreateForm({
  teamId,
  year,
  month,
  members,
  defaultAssigneeId,
  onCreated,
}: {
  teamId: string
  year: number
  month: number
  members: TeamMemberRow[]
  defaultAssigneeId: string
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  type MiniCreateValues = {
    assigneeUserId: string
    content: string
    kind: 'KPI' | 'OKR'
    priority: number
    kpiSetAt: string
    targetMetric: string
    reviewerName: string
  }
  const fallbackAssigneeId = useMemo(() => {
    if (defaultAssigneeId && members.some((m) => m.userId === defaultAssigneeId))
      return defaultAssigneeId
    return members[0]?.userId ?? ''
  }, [members, defaultAssigneeId])
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<MiniCreateValues>({
    defaultValues: {
      assigneeUserId: fallbackAssigneeId,
      content: '',
      kind: 'KPI',
      priority: 1,
      kpiSetAt: '',
      targetMetric: '',
      reviewerName: '',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    setValue('assigneeUserId', fallbackAssigneeId, { shouldValidate: true })
  }, [fallbackAssigneeId, setValue])

  const onSubmit = handleSubmit(async (values) => {
    if (values.kpiSetAt.trim()) {
      const dt = new Date(`${values.kpiSetAt.trim()}T12:00:00`)
      if (Number.isNaN(dt.getTime())) return
    }
    const kpiIso = values.kpiSetAt.trim()
      ? new Date(`${values.kpiSetAt.trim()}T12:00:00`).toISOString()
      : null
    await performanceApi.createAssignment(teamId, {
      assigneeUserId: values.assigneeUserId.trim(),
      year,
      month,
      kind: values.kind,
      content: values.content.trim(),
      priority: Number(values.priority),
      targetMetric: values.targetMetric.trim() || null,
      kpiSetAt: kpiIso,
      reviewerName: values.reviewerName.trim() || null,
    })
    reset({
      assigneeUserId: fallbackAssigneeId,
      content: '',
      kind: 'KPI',
      priority: 1,
      kpiSetAt: '',
      targetMetric: '',
      reviewerName: '',
    })
    setOpen(false)
    onCreated()
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="w-fit bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white hover:from-blue-700 hover:to-indigo-700"
        >
          Thêm mục tiêu KPI/OKR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tạo hạng mục KPI/OKR mới</DialogTitle>
          <DialogDescription>
            Nhập nhanh theo kỳ T{month}/{year}. Sau khi tạo xong, dữ liệu sẽ tự làm mới.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" onSubmit={onSubmit}>
          <SelectController
            control={control}
            name="kind"
            label="Hạng mục"
            required
            rules={{ required: true }}
            className="space-y-1 text-xs font-medium"
          >
            <option value="KPI">KPI</option>
            <option value="OKR">OKR</option>
          </SelectController>
          <SelectController
            control={control}
            name="assigneeUserId"
            label="Nhân sự nhận việc"
            required
            rules={{ required: true }}
            className="space-y-1 text-xs font-medium"
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {(m.displayName ?? m.email ?? 'chưa có tên').slice(0, 48)}
              </option>
            ))}
          </SelectController>
          <SelectController
            control={control}
            name="priority"
            label="Thứ tự ưu tiên"
            required
            rules={{ required: true, min: 0, max: 99 }}
            className="space-y-1 text-xs font-medium"
            onChange={(e) => {
              const v = Number(e.target.value)
              setValue('priority', v, { shouldValidate: true, shouldDirty: true })
            }}
          >
            <option value={0}>Không xếp (0)</option>
            <option value={1}>Ưu tiên 1</option>
            <option value={2}>Ưu tiên 2</option>
            <option value={3}>Ưu tiên 3</option>
          </SelectController>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Ngày xét KPI/OKR
            <Controller
              control={control}
              name="kpiSetAt"
              render={({ field }) => (
                <input type="date" className={cn(XL_INPUT, 'h-9')} {...field} />
              )}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Chỉ số mục tiêu
            <Controller
              control={control}
              name="targetMetric"
              render={({ field }) => (
                <input
                  type="text"
                  className={cn(XL_INPUT, 'h-9 tabular-nums')}
                  placeholder="VD: 60"
                  {...field}
                />
              )}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Người đánh giá (tùy chọn)
            <Controller
              control={control}
              name="reviewerName"
              render={({ field }) => (
                <input
                  type="text"
                  className={cn(XL_INPUT, 'h-9')}
                  placeholder="Họ tên QL / Leader"
                  {...field}
                />
              )}
            />
          </label>
          <label className="md:col-span-2 lg:col-span-3 flex flex-col gap-1 text-xs font-medium">
            <TextareaController
              control={control}
              name="content"
              label="Nội dung KPI/OKR"
              required
              rules={{ required: true, maxLength: 500 }}
              className="md:col-span-2 lg:col-span-3 space-y-1 text-xs font-medium"
              maxLength={500}
              textareaClassName={cn(XL_TEXTAREA, 'max-w-none min-h-[80px]')}
              placeholder="Mô tả chỉ tiêu…"
            />
          </label>
          <div className="flex items-end md:col-span-2 lg:col-span-3">
            <Button
              type="submit"
              disabled={isSubmitting || !members.length}
              className={cn(XL_SAVE_BTN, 'px-4 py-2 text-sm')}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SummaryPanel({
  rows,
  loading,
  teamId,
  year,
  month,
  canRecalculate,
  onRecalculated,
}: {
  rows: PerformanceSummaryRow[]
  loading: boolean
  teamId: string
  year: number
  month: number
  canRecalculate: boolean
  onRecalculated: () => void
}) {
  const [recalcBusy, setRecalcBusy] = useState(false)
  const rowName = useCallback(
    (r: PerformanceSummaryRow) =>
      r.assigneeDisplayName?.trim() || r.assigneeEmail?.trim() || 'Thành viên',
    []
  )

  if (loading) {
    return (
      <Card id="summary-section" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-base font-bold text-amber-700">
            Tổng chỉ số hiệu suất
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    )
  }
  if (rows.length === 0) {
    return (
      <Card id="summary-section" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-base font-bold text-amber-700">
            Tổng chỉ số hiệu suất
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canRecalculate && teamId && !isMockApiEnabled() && (
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={recalcBusy}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                onClick={() => {
                  setRecalcBusy(true)
                  void performanceApi
                    .recalculateSummaries(teamId, year, month)
                    .then(() => onRecalculated())
                    .finally(() => setRecalcBusy(false))
                }}
              >
                Tính lại tổng hợp
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Chưa có bản tổng hợp — thêm KPI hoặc bấm tính lại (leader).
          </p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card id="summary-section" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-base font-bold text-amber-700">Tổng chỉ số hiệu suất</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canRecalculate && teamId && !isMockApiEnabled() && (
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={recalcBusy}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
              onClick={() => {
                setRecalcBusy(true)
                void performanceApi
                  .recalculateSummaries(teamId, year, month)
                  .then(() => onRecalculated())
                  .finally(() => setRecalcBusy(false))
              }}
            >
              Tính lại tổng hợp (A–D)
            </Button>
          </div>
        )}
        <Table className="min-w-[720px] text-sm">
          <TableHeader>
            <TableRow className="bg-muted/40 text-xs text-muted-foreground hover:bg-muted/40">
              <TableHead>Nhân sự</TableHead>
              <TableHead className="bg-amber-500/10" colSpan={3}>
                KPI
              </TableHead>
              <TableHead className="bg-sky-500/10" colSpan={3}>
                OKR
              </TableHead>
            </TableRow>
            <TableRow className="bg-muted/20 text-xs text-muted-foreground hover:bg-muted/20">
              <TableHead />
              <TableHead>Đạt</TableHead>
              <TableHead>Chưa</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Đạt</TableHead>
              <TableHead>Chưa</TableHead>
              <TableHead>Loại</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{rowName(r)}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.assigneeEmployeeCode?.trim() || r.assigneeEmail?.trim() || '—'}
                  </div>
                </TableCell>
                <TableCell className="bg-amber-500/5">{r.kpiOkCount}</TableCell>
                <TableCell className="bg-amber-500/5">{r.kpiNotCount}</TableCell>
                <TableCell className="bg-amber-500/5 font-semibold">{r.kpiGrade ?? '—'}</TableCell>
                <TableCell className="bg-sky-500/5">{r.okrOkCount}</TableCell>
                <TableCell className="bg-sky-500/5">{r.okrNotCount}</TableCell>
                <TableCell className="bg-sky-500/5 font-semibold">{r.okrGrade ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function FormPanel({
  teamId,
  year,
  month,
  canEditTeam,
  currentUserId,
}: {
  teamId: string
  year: number
  month: number
  canEditTeam: boolean
  currentUserId: string
}) {
  const q = useQuery({
    queryKey: ['kpi-form', teamId, year, month],
    queryFn: () =>
      teamId ? performanceApi.getQuestionnaire(teamId, year, month) : Promise.resolve(null),
    enabled: Boolean(teamId) && !isMockApiEnabled(),
  })

  const data = q.data as PerformanceQuestionnaire | null

  const [prompts, setPrompts] = useState('Câu 1?\nCâu 2?')
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({})
  const [busySaveQuestions, setBusySaveQuestions] = useState(false)
  const [busySaveAnswers, setBusySaveAnswers] = useState(false)

  useEffect(() => {
    if (!data?.questions?.length) return
    const preset = data.questions.map((item) => item.prompt).join('\n')
    const id = window.setTimeout(() => setPrompts(preset), 0)
    return () => window.clearTimeout(id)
  }, [data?.id, data?.questions])

  useEffect(() => {
    if (!data?.questions?.length) return
    const next: Record<string, string> = {}
    for (const qs of data.questions) {
      const ans = data.answers?.find(
        (a) => a.questionId === qs.id && a.respondentUserId === currentUserId
      )
      next[qs.id] = ans?.answerText ?? ''
    }
    const id = window.setTimeout(() => setAnswerDraft(next), 0)
    return () => window.clearTimeout(id)
  }, [data, currentUserId])

  const answersByRespondent = useMemo(() => {
    const result = new Map<
      string,
      {
        respondentUserId: string
        respondentName: string
        answers: Record<string, string>
      }
    >()
    for (const item of data?.answers ?? []) {
      const name =
        item.respondentDisplayName?.trim() || item.respondentEmail?.trim() || 'Thành viên'
      const row = result.get(item.respondentUserId) ?? {
        respondentUserId: item.respondentUserId,
        respondentName: name,
        answers: {},
      }
      row.answers[item.questionId] = item.answerText ?? ''
      result.set(item.respondentUserId, row)
    }
    return Array.from(result.values()).sort((a, b) =>
      a.respondentName.localeCompare(b.respondentName)
    )
  }, [data?.answers])

  if (!teamId) return <p className="text-sm text-muted-foreground">Chọn team.</p>
  if (q.isLoading) {
    return (
      <Card id="form-section" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-base">Form câu hỏi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id="form-section" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-base font-bold text-fuchsia-700">
          Form câu hỏi theo tháng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {canEditTeam && !isMockApiEnabled() && (
          <div className="rounded-xl border border-border p-4">
            <p className="mb-2 text-sm font-semibold">
              Tạo / cập nhật câu hỏi tháng (mỗi dòng một câu)
            </p>
            <textarea
              className="mb-2 min-h-[100px] w-full rounded-lg border border-input bg-background p-3 text-sm"
              value={prompts}
              onChange={(e) => setPrompts(e.target.value)}
            />
            <Button
              type="button"
              disabled={busySaveQuestions}
              className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:from-fuchsia-700 hover:to-purple-700"
              onClick={() => {
                const lines = prompts
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((prompt) => ({ prompt }))
                setBusySaveQuestions(true)
                void performanceApi
                  .upsertQuestionnaire(teamId, { year, month, questions: lines })
                  .then(() => q.refetch())
                  .finally(() => setBusySaveQuestions(false))
              }}
            >
              {busySaveQuestions ? 'Đang lưu...' : 'Lưu câu hỏi'}
            </Button>
          </div>
        )}

        {!data && (
          <p className="text-sm text-muted-foreground">
            Chưa có form cho kỳ này (leader cần tạo câu hỏi).
          </p>
        )}

        {data?.questions?.length ? (
          <div className="space-y-4">
            {data.questions.map((qs) => (
              <label key={qs.id} className="block rounded-lg border border-border/80 p-3">
                <span className="text-sm font-medium text-foreground">{qs.prompt}</span>
                <textarea
                  className="mt-2 min-h-[72px] w-full rounded border border-input bg-background p-2 text-sm"
                  value={answerDraft[qs.id] ?? ''}
                  onChange={(e) => setAnswerDraft((prev) => ({ ...prev, [qs.id]: e.target.value }))}
                  disabled={!currentUserId}
                />
              </label>
            ))}
            {!isMockApiEnabled() && currentUserId && (
              <Button
                type="button"
                disabled={busySaveAnswers}
                className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                onClick={() => {
                  setBusySaveAnswers(true)
                  void performanceApi
                    .putAnswers(teamId, year, month, {
                      answers: data.questions.map((qs) => ({
                        questionId: qs.id,
                        answerText: answerDraft[qs.id] ?? '',
                      })),
                    })
                    .then(() => q.refetch())
                    .finally(() => setBusySaveAnswers(false))
                }}
              >
                {busySaveAnswers ? 'Đang gửi...' : 'Gửi câu trả lời'}
              </Button>
            )}
          </div>
        ) : null}

        {canEditTeam && data?.questions?.length ? (
          <div className="space-y-3 rounded-xl border border-border/80 p-4">
            <div className="text-sm font-semibold text-foreground">
              Tổng hợp câu trả lời theo nhân sự
            </div>
            {answersByRespondent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có câu trả lời nào cho kỳ này.</p>
            ) : (
              <div className="space-y-3">
                {answersByRespondent.map((entry) => (
                  <div
                    key={entry.respondentUserId}
                    className="rounded-lg border border-border/70 p-3"
                  >
                    <div className="mb-2 text-sm font-medium">{entry.respondentName}</div>
                    <div className="space-y-2">
                      {data.questions.map((qs) => (
                        <div key={qs.id} className="rounded-md bg-muted/35 p-2">
                          <div className="text-xs font-semibold text-foreground">{qs.prompt}</div>
                          <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                            {entry.answers[qs.id]?.trim() || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
