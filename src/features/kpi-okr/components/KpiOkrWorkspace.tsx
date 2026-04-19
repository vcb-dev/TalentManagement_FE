import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Pencil, RefreshCw, Users } from 'lucide-react'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import { CARD_ENTRANCE, SECTION_FADE_UP } from '@/lib/cardMotion'
import { useAuthStore } from '@/stores/auth.store'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { useHrOrgTree, ORG_TREE_KEY } from '@/features/hr-admin/useHrOrgTree'
import {
  performanceApi,
  type PerformanceAssignment,
  type PerformanceQuestionnaire,
  type PerformanceSummaryRow,
} from '@/features/kpi-okr/api'
import { organizationApi, type TeamMemberRow } from '@/features/organization/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DateController,
  InputController,
  SelectController,
  TextareaController,
} from '@/components/ui/form-controllers'
import { Form } from '@/components/ui/form'
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
  const isMemberView = variant === 'member'
  const isManagerReadOnly = user?.role === 'MANAGER'
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
    if (variant === 'leader') return !isManagerReadOnly && eff.has('kpi.team_edit')
    return false
  }, [variant, eff, isManagerReadOnly])

  const departments = useMemo(() => {
    const allDepartments = treeQ.data?.departments ?? []
    if (!isMemberView) return allDepartments
    const memberTeamIds = new Set((user?.teamIds ?? []).filter(Boolean))
    if (!memberTeamIds.size) return []
    return allDepartments
      .map((dept) => ({
        ...dept,
        teams: dept.teams.filter((team) => memberTeamIds.has(team.id)),
      }))
      .filter((dept) => dept.teams.length > 0)
  }, [treeQ.data, isMemberView, user?.teamIds])
  const selectedDept = useMemo(
    () => departments.find((d) => d.teams.some((t) => t.id === selectedTeamId)),
    [departments, selectedTeamId]
  )
  const teamsInDept = selectedDept?.teams ?? departments[0]?.teams ?? []
  /** MANAGER: bộ lọc hiển thị TẤT CẢ team, không gò theo phòng ban. */
  const allTeamsFlat = useMemo(
    () =>
      departments
        .flatMap((d) => d.teams.map((t) => ({ id: t.id, name: t.name, deptName: d.name })))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    [departments]
  )

  useEffect(() => {
    if (selectedTeamId) return
    const ids = user?.teamIds?.filter(Boolean) ?? []
    const firstMemberTeamId = ids.find((id) =>
      departments.some((d) => d.teams.some((t) => t.id === id))
    )
    const fallbackTeamId = departments[0]?.teams[0]?.id
    const id = window.setTimeout(() => {
      if (firstMemberTeamId) {
        setSelectedTeamId(firstMemberTeamId)
        return
      }
      if (!isMemberView && fallbackTeamId) {
        setSelectedTeamId(fallbackTeamId)
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [user?.teamIds, departments, selectedTeamId, isMemberView])

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
    () => ['kpi-summaries', selectedTeamId, prevYear, prevMonth] as const,
    [selectedTeamId, prevYear, prevMonth]
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

  const visibleMembers = useMemo(() => {
    const allMembers = membersForTeamQ.data?.members ?? []
    if (!isMemberView) return allMembers
    const selfId = user?.id?.trim()
    if (!selfId) return []
    return allMembers.filter((member) => member.userId === selfId)
  }, [membersForTeamQ.data?.members, isMemberView, user?.id])

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
        ? performanceApi.listSummaries(selectedTeamId, prevYear, prevMonth)
        : Promise.resolve([] as PerformanceSummaryRow[]),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })

  const visibleAssignmentsThisMonth = useMemo(() => {
    const rows = assignmentsQ.data ?? []
    if (!isMemberView) return rows
    const selfId = user?.id?.trim()
    if (!selfId) return []
    return rows.filter((row) => row.assigneeUserId === selfId)
  }, [assignmentsQ.data, isMemberView, user?.id])

  const visibleAssignmentsPrevMonth = useMemo(() => {
    const rows = assignmentsPrevQ.data ?? []
    if (!isMemberView) return rows
    const selfId = user?.id?.trim()
    if (!selfId) return []
    return rows.filter((row) => row.assigneeUserId === selfId)
  }, [assignmentsPrevQ.data, isMemberView, user?.id])

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: assignKey })
    void qc.invalidateQueries({ queryKey: assignPrevKey })
    void qc.invalidateQueries({ queryKey: sumKey })
  }, [qc, assignKey, assignPrevKey, sumKey])

  const mockHint = isMockApiEnabled()

  return (
    <div className="relative isolate mx-auto max-w-[1400px] px-3 py-6 md:px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl"
      >
        <div className="absolute -left-20 -top-16 h-72 w-72 rounded-full bg-primary/22 blur-3xl motion-safe:animate-[dash-glow-orb_9s_ease-in-out_infinite] motion-reduce:animate-none" />
        <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl motion-safe:animate-[dash-glow-orb_11s_ease-in-out_infinite_1.2s] motion-reduce:animate-none" />
        <div className="absolute bottom-8 left-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-500/16 blur-3xl motion-safe:animate-[dash-glow-orb_14s_ease-in-out_infinite_0.4s] motion-reduce:animate-none" />
      </div>

      <div
        className={cn(
          'mb-6 border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card to-teal-500/[0.05] shadow-[var(--shadow-card)] backdrop-blur-[2px]',
          PAGE_HEADER_SURFACE,
          SECTION_FADE_UP
        )}
      >
        <h1 className={PAGE_HEADER_TITLE}>
          <span className={PAGE_HEADER_GRADIENT}>{title}</span>
        </h1>
        <p className={PAGE_HEADER_DESCRIPTION}>{description}</p>
      </div>

      <Card
        className={cn(
          'mb-6 border-primary/15 bg-card/95 shadow-lg shadow-primary/5 backdrop-blur-sm transition-shadow duration-300 motion-safe:hover:shadow-xl motion-safe:hover:shadow-primary/10',
          CARD_ENTRANCE
        )}
        style={{ animationDelay: '50ms' }}
      >
        <CardHeader className="pb-4">
          <CardTitle className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-xl md:text-2xl font-bold text-transparent">
            Bộ lọc KPI/OKR theo đội nhóm
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              'grid gap-4 md:grid-cols-2',
              isManagerReadOnly ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
            )}
          >
            {!isManagerReadOnly && (
              <label className="flex flex-col gap-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Phòng ban
                </Label>
                <Select
                  value={selectedDept?.id ?? '__none'}
                  disabled={isMemberView}
                  onValueChange={(value) => {
                    const d = departments.find((x) => x.id === value)
                    const tid = d?.teams[0]?.id ?? ''
                    setSelectedTeamId(tid)
                  }}
                >
                  <SelectTrigger className="h-10 rounded-lg border border-input bg-background/90 px-3 text-sm shadow-sm transition-[border-color,box-shadow] hover:border-primary/35 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/25">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Chọn —</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Team</Label>
              <Select
                value={selectedTeamId || '__none'}
                disabled={isMemberView}
                onValueChange={(value) => setSelectedTeamId(value === '__none' ? '' : value)}
              >
                <SelectTrigger className="h-10 rounded-lg border border-input bg-background/90 px-3 text-sm shadow-sm transition-[border-color,box-shadow] hover:border-primary/35 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/25">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Chọn team —</SelectItem>
                  {(isManagerReadOnly ? allTeamsFlat : teamsInDept).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {isManagerReadOnly && 'deptName' in t && t.deptName ? (
                        <span className="ml-1 text-xs text-muted-foreground">· {t.deptName}</span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tháng</Label>
              <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                <SelectTrigger className="h-10 rounded-lg border border-input bg-background/90 px-3 text-sm shadow-sm transition-[border-color,box-shadow] hover:border-primary/35 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/25">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Tháng {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Năm</Label>
              <Input
                type="number"
                value={year}
                min={2020}
                max={2035}
                className="rounded-lg shadow-sm transition-[border-color,box-shadow] hover:border-primary/35 focus-visible:ring-2 focus-visible:ring-primary/25"
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
              className="ml-auto inline-flex items-center gap-1 border-cyan-300 bg-cyan-50 text-cyan-700 shadow-sm transition-[transform,box-shadow] hover:bg-cyan-100 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md motion-safe:active:translate-y-0"
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

      <Card
        className={cn(
          'mb-6 overflow-hidden border-teal-500/20 bg-gradient-to-r from-teal-500/[0.07] via-card to-violet-500/[0.06] shadow-md shadow-teal-500/5 backdrop-blur-sm transition-shadow duration-300 motion-safe:hover:shadow-lg motion-safe:hover:shadow-teal-500/10',
          CARD_ENTRANCE
        )}
        style={{ animationDelay: '120ms' }}
      >
        <CardContent className="relative pt-6 text-sm text-muted-foreground">
          <div
            aria-hidden
            className="absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-to-b from-teal-500 via-primary to-violet-500 opacity-80"
          />
          <div className="pl-4">
            <span className="font-medium text-foreground">Luồng theo tháng:</span> nhập{' '}
            <strong className="text-foreground">
              tháng {month}/{year}
            </strong>{' '}
            để lập mục tiêu tháng này; cập nhật kết quả tại kỳ{' '}
            <strong className="text-foreground">
              tháng {prevMonth}/{prevYear}
            </strong>
            .
          </div>
        </CardContent>
      </Card>

      {mockHint && (
        <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Đang bật mock API — dữ liệu KPI từ server không tải được. Tắt mock để dùng đầy đủ.
        </p>
      )}

      <div className="space-y-6">
        <WorkReportPanel
          assignmentsThisMonth={visibleAssignmentsThisMonth}
          assignmentsPrevMonth={visibleAssignmentsPrevMonth}
          loadingThis={assignmentsQ.isLoading}
          loadingPrev={assignmentsPrevQ.isLoading}
          members={visibleMembers}
          membersLoading={membersForTeamQ.isLoading}
          canEditTeam={canEditTeam}
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
          year={prevYear}
          month={prevMonth}
          canRecalculate={canEditTeam}
          onRecalculated={refresh}
          prioritizeAssigneeUserId={user?.id}
          viewerVariant={variant}
        />
        <FormPanel
          teamId={selectedTeamId}
          year={year}
          month={month}
          canEditTeam={canEditTeam}
          currentUserId={user?.id ?? ''}
          readOnly={isManagerReadOnly}
        />
      </div>
    </div>
  )
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
const XL_BORDER = 'border border-slate-200/85 dark:border-slate-800/80'
const XL_TH = cn(
  XL_BORDER,
  'sticky top-0 z-10 whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 px-3 py-2.5 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700 shadow-[inset_0_-1px_0_rgba(148,163,184,0.3)] backdrop-blur-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-slate-200'
)
const xlTd = (stripe: boolean) =>
  cn(
    XL_BORDER,
    'px-2.5 py-2 align-top text-xs leading-snug text-slate-700 dark:text-slate-200',
    stripe
      ? 'bg-gradient-to-r from-slate-50/90 via-slate-50/80 to-sky-50/50 dark:from-slate-900/65 dark:via-slate-900/50 dark:to-slate-900/40'
      : 'bg-card/95'
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
  'Thao tác',
] as const

function KindBadge({ kind }: { kind: PerformanceAssignment['kind'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm ring-1',
        kind === 'KPI'
          ? 'bg-gradient-to-r from-indigo-500/20 to-blue-500/20 text-indigo-700 ring-indigo-300/60 dark:text-indigo-200'
          : 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700 ring-emerald-300/60 dark:text-emerald-200'
      )}
    >
      {kind}
    </span>
  )
}

function ReadOnlyAssignmentRow({
  row,
  rowStripe,
}: {
  row: PerformanceAssignment
  rowStripe: boolean
}) {
  const td = xlTd(rowStripe)
  return (
    <TableRow className="transition-colors hover:bg-sky-50/70 dark:hover:bg-slate-800/60">
      <TableCell className={cn(td, 'whitespace-nowrap tabular-nums text-muted-foreground')}>
        {periodLabel(row)}
      </TableCell>
      <TableCell className={cn(td, 'whitespace-nowrap tabular-nums')}>
        {formatKpiSetAt(row.kpiSetAt)}
      </TableCell>
      <TableCell className={td}>
        <KindBadge kind={row.kind} />
      </TableCell>
      <TableCell className={cn(td, 'text-center tabular-nums')}>{row.priority}</TableCell>
      <TableCell className={cn(td, 'min-w-[220px] max-w-md whitespace-pre-wrap')}>
        {row.content}
      </TableCell>
      <TableCell className={cn(td, 'tabular-nums')}>{row.targetMetric ?? ''}</TableCell>
      <TableCell className={td} />
    </TableRow>
  )
}

type LeaderEditFormValues = {
  kpiSetAt: string
  priority: number
  content: string
  targetMetric: string
  managerEvalStatus: string
  managerReviewNote: string
}

function LeaderAssignmentRow({
  row,
  mode,
  onSaved,
  rowStripe,
  canEditTeam,
}: {
  row: PerformanceAssignment
  mode: 'planning' | 'results'
  onSaved: () => void
  rowStripe: boolean
  canEditTeam: boolean
}) {
  const [open, setOpen] = useState(false)

  const form = useForm<LeaderEditFormValues>({
    defaultValues: {
      kpiSetAt: row.kpiSetAt ? row.kpiSetAt.slice(0, 10) : '',
      priority: row.priority,
      content: row.content,
      targetMetric: row.targetMetric ?? '',
      managerEvalStatus: row.managerEvalStatus ?? '',
      managerReviewNote: row.managerReviewNote ?? '',
    },
    mode: 'onChange',
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form

  useEffect(() => {
    if (!open) return
    reset({
      kpiSetAt: row.kpiSetAt ? row.kpiSetAt.slice(0, 10) : '',
      priority: row.priority,
      content: row.content,
      targetMetric: row.targetMetric ?? '',
      managerEvalStatus: row.managerEvalStatus ?? '',
      managerReviewNote: row.managerReviewNote ?? '',
    })
  }, [open, reset, row])

  const onSubmit = handleSubmit(async (values) => {
    if (mode === 'planning' && !values.content.trim()) {
      toast.error('Nội dung không được trống.')
      return
    }
    if (mode === 'planning' && values.content.trim().length > 500) {
      toast.error('Nội dung tối đa 500 ký tự.')
      return
    }
    if (mode === 'planning') {
      if (values.priority < 0 || values.priority > 99) {
        toast.error('Ưu tiên không hợp lệ.')
        return
      }
      if (values.kpiSetAt.trim()) {
        const dt = new Date(`${values.kpiSetAt.trim()}T12:00:00`)
        if (Number.isNaN(dt.getTime())) {
          toast.error('Ngày xét không hợp lệ.')
          return
        }
      }
    }

    const kpiIso =
      mode === 'planning' && values.kpiSetAt.trim()
        ? new Date(`${values.kpiSetAt.trim()}T12:00:00`).toISOString()
        : null

    const patch =
      mode === 'results'
        ? {
            managerEvalStatus: values.managerEvalStatus.trim() || null,
            managerReviewNote: values.managerReviewNote.trim() || null,
          }
        : {
            content: values.content.trim(),
            priority: values.priority,
            targetMetric: values.targetMetric.trim() || null,
            kpiSetAt: kpiIso,
          }

    try {
      await performanceApi.patchAssignment(row.id, patch)
      toast.success('Đã cập nhật.')
      setOpen(false)
      onSaved()
    } catch {
      toast.error('Cập nhật thất bại, vui lòng thử lại.')
    }
  })

  const td = xlTd(rowStripe)
  const editable = canEditTeam && !isMockApiEnabled()

  return (
    <TableRow
      className={cn(
        'transition-colors hover:bg-cyan-50/80 dark:hover:bg-slate-800/65',
        mode === 'results' &&
          'outline outline-1 outline-amber-400/45 -outline-offset-1 dark:outline-amber-600/40'
      )}
    >
      <TableCell className={cn(td, 'whitespace-nowrap tabular-nums text-muted-foreground')}>
        {periodLabel(row)}
      </TableCell>
      <TableCell className={cn(td, 'whitespace-nowrap tabular-nums')}>
        {formatKpiSetAt(row.kpiSetAt)}
      </TableCell>
      <TableCell className={td}>
        <KindBadge kind={row.kind} />
      </TableCell>
      <TableCell className={cn(td, 'text-center tabular-nums')}>{row.priority}</TableCell>
      <TableCell className={cn(td, 'min-w-[220px] max-w-md whitespace-pre-wrap')}>
        {row.content}
      </TableCell>
      <TableCell className={cn(td, 'tabular-nums')}>{row.targetMetric ?? ''}</TableCell>
      <TableCell className={cn(td, 'whitespace-nowrap text-right')}>
        {editable ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 gap-1 px-2 text-xs shadow-sm transition-[transform,box-shadow,background-color,border-color,color] motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md motion-safe:active:translate-y-0',
                  mode === 'results'
                    ? 'border-amber-300 bg-amber-50/95 text-amber-800 hover:bg-amber-100'
                    : 'border-blue-300 bg-blue-50/95 text-blue-800 hover:bg-blue-100'
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                {mode === 'results' ? 'đánh giá' : 'Sửa'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {mode === 'planning' ? 'Sửa mục tiêu KPI/OKR' : 'Sửa đánh giá KPI/OKR'}
                </DialogTitle>
                <DialogDescription>
                  {mode === 'planning'
                    ? 'Cập nhật nội dung/ưu tiên/chỉ tiêu và ngày xét cho kỳ đang chọn.'
                    : 'Chỉ cập nhật QL đánh giá (OK/NOT) và QL nhận xét — các trường khác giữ nguyên.'}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
                  {mode === 'planning' ? (
                    <DateController
                      control={control}
                      name="kpiSetAt"
                      label="Ngày xét KPI/OKR"
                      className="md:col-span-2 space-y-1 text-xs font-medium"
                      datePickerClassName={cn(XL_INPUT, 'h-9')}
                    />
                  ) : null}

                  {mode === 'planning' ? (
                    <>
                      <SelectController
                        control={control}
                        name="priority"
                        label="Ưu tiên"
                        required
                        rules={{ required: true, min: 0, max: 99 }}
                        className="space-y-1 text-xs font-medium"
                      >
                        <SelectItem value="0">Không xếp (0)</SelectItem>
                        <SelectItem value="1">Ưu tiên 1</SelectItem>
                        <SelectItem value="2">Ưu tiên 2</SelectItem>
                        <SelectItem value="3">Ưu tiên 3</SelectItem>
                      </SelectController>

                      <InputController
                        control={control}
                        name="targetMetric"
                        label="Chỉ tiêu"
                        className="space-y-1 text-xs font-medium"
                        placeholder="VD: 60"
                      />

                      <label className="md:col-span-2 flex flex-col gap-1 text-xs font-medium">
                        <TextareaController
                          control={control}
                          name="content"
                          label="Nội dung KPI/OKR"
                          required
                          rules={{ required: true, maxLength: 500 }}
                          className="space-y-1 text-xs font-medium"
                          maxLength={500}
                          textareaClassName={cn(XL_TEXTAREA, 'max-w-none min-h-[96px]')}
                          placeholder="Mô tả chỉ tiêu…"
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <SelectController
                        control={control}
                        name="managerEvalStatus"
                        label="QL đánh giá"
                        className="space-y-1 text-xs font-medium"
                      >
                        <SelectItem value="__none">—</SelectItem>
                        <SelectItem value="OK">OK</SelectItem>
                        <SelectItem value="NOT">NOT</SelectItem>
                      </SelectController>

                      <label className="md:col-span-2 flex flex-col gap-1 text-xs font-medium">
                        <TextareaController
                          control={control}
                          name="managerReviewNote"
                          label="QL nhận xét"
                          className="space-y-1 text-xs font-medium"
                          textareaClassName={cn(XL_TEXTAREA, 'max-w-none min-h-[96px]')}
                          placeholder="Nhận xét…"
                        />
                      </label>
                    </>
                  )}

                  <div className="flex items-end justify-end gap-2 md:col-span-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(XL_SAVE_BTN, 'px-4 py-2 text-sm')}
                    >
                      {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        ) : null}
      </TableCell>
    </TableRow>
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

/** Đưa user được ưu tiên (vd. chính mình) lên đầu danh sách chọn nhân sự. */
function orderUserEntriesFirst(
  entries: [string, PerformanceAssignment[]][],
  userId: string | undefined
): [string, PerformanceAssignment[]][] {
  if (!userId?.trim()) return entries
  const i = entries.findIndex(([id]) => id === userId)
  if (i <= 0) return entries
  const copy = [...entries]
  const [first] = copy.splice(i, 1)
  return first ? [first, ...copy] : entries
}

function AssignmentTableSingleUser({
  userId,
  rows,
  members,
  canEditTeam,
  onRefresh,
  leaderMode,
}: {
  userId: string
  rows: PerformanceAssignment[]
  members: TeamMemberRow[]
  canEditTeam: boolean
  onRefresh: () => void
  leaderMode: 'planning' | 'results'
}) {
  return (
    <div
      className={cn(
        XL_BORDER,
        'overflow-hidden rounded-xl bg-gradient-to-b from-white to-slate-50/70 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.35)] dark:from-slate-950 dark:to-slate-900/80'
      )}
    >
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-100/80 via-slate-50 to-sky-50/70 px-3.5 py-2.5 text-sm font-bold text-slate-800 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900/70 dark:text-slate-100">
        <span className="text-slate-500 dark:text-slate-400">Nhân sự:</span>{' '}
        <span className="font-semibold text-foreground">{nameForMember(members, userId)}</span>
        <span className="ml-2 inline-flex rounded-full border border-slate-200/80 bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {memberMetaForDisplay(members, userId)}
        </span>
      </div>
      <div className="max-h-[min(75vh,720px)] overflow-auto rounded-b-xl">
        <Table className="w-full min-w-[880px] border-collapse text-left">
          <TableHeader>
            <TableRow className="shadow-[inset_0_-1px_0_rgba(148,163,184,0.35)] dark:shadow-[inset_0_-1px_0_rgba(51,65,85,0.6)]">
              {ASSIGN_TABLE_HEAD.map((h) => (
                <TableHead key={h} className={cn(XL_TH, 'min-w-[84px]')}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) =>
              canEditTeam ? (
                <LeaderAssignmentRow
                  key={r.id}
                  row={r}
                  mode={leaderMode}
                  onSaved={onRefresh}
                  rowStripe={idx % 2 === 1}
                  canEditTeam={canEditTeam}
                />
              ) : (
                <ReadOnlyAssignmentRow key={r.id} row={r} rowStripe={idx % 2 === 1} />
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function UserAssignmentWorkbench({
  byUser,
  members,
  canEditTeam,
  onRefresh,
  leaderMode,
  emptyText,
  prioritizeUserId,
  showUserList = true,
}: {
  byUser: Map<string, PerformanceAssignment[]>
  members: TeamMemberRow[]
  canEditTeam: boolean
  onRefresh: () => void
  leaderMode: 'planning' | 'results'
  emptyText: string
  /** User hiển thị mặc định & xếp đầu danh sách (thường là user đang đăng nhập). */
  prioritizeUserId?: string
  showUserList?: boolean
}) {
  const userEntries = useMemo(
    () => orderUserEntriesFirst(Array.from(byUser.entries()), prioritizeUserId),
    [byUser, prioritizeUserId]
  )
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  if (!userEntries.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  const defaultUserId =
    prioritizeUserId && byUser.has(prioritizeUserId) ? prioritizeUserId : userEntries[0]![0]
  const activeUserId = selectedUserId && byUser.has(selectedUserId) ? selectedUserId : defaultUserId
  const activeRows = byUser.get(activeUserId) ?? []

  if (!showUserList) {
    return (
      <AssignmentTableSingleUser
        userId={activeUserId}
        rows={activeRows}
        members={members}
        canEditTeam={canEditTeam}
        onRefresh={onRefresh}
        leaderMode={leaderMode}
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-4 w-4" />
            Danh sách nhân sự
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {userEntries.map(([uid, rows]) => {
            const active = uid === activeUserId
            return (
              <Button
                key={uid}
                type="button"
                variant="ghost"
                onClick={() => setSelectedUserId(uid)}
                className={cn(
                  'h-auto w-full justify-start rounded-xl border px-3 py-2.5 text-left font-normal normal-case tracking-normal transition-colors',
                  active
                    ? 'border-primary/50 bg-primary/10 text-foreground shadow-sm hover:bg-primary/10'
                    : 'border-border/80 bg-background hover:bg-muted/60'
                )}
              >
                <div className="truncate text-sm font-semibold leading-5">
                  {nameForMember(members, uid)}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {memberMetaForDisplay(members, uid)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {rows.length} hạng mục
                  </span>
                  {prioritizeUserId && uid === prioritizeUserId ? (
                    <span className="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Bạn
                    </span>
                  ) : null}
                </div>
              </Button>
            )
          })}
        </CardContent>
      </Card>
      <AssignmentTableSingleUser
        userId={activeUserId}
        rows={activeRows}
        members={members}
        canEditTeam={canEditTeam}
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
      <Card className="border-dashed border-primary/25 bg-muted/20">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Chọn team để xem báo cáo công việc.
        </CardContent>
      </Card>
    )
  }
  if (loadingThis || loadingPrev || membersLoading) {
    return (
      <Card className={cn(CARD_ENTRANCE)}>
        <CardHeader>
          <CardTitle className="text-xl">Đang tải dữ liệu KPI/OKR</CardTitle>
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
        <Card
          className={cn(
            'relative overflow-hidden border-blue-200/45 shadow-lg shadow-blue-500/10 transition-shadow duration-300 motion-safe:hover:shadow-xl motion-safe:hover:shadow-blue-500/15 dark:border-blue-900/40',
            CARD_ENTRANCE
          )}
          style={{ animationDelay: '90ms' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400"
          />
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-blue-700">
                  1. Mục tiêu KPI/OKR tháng này — T{month}/{year}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tập trung lập mục tiêu theo từng nhân sự, thao tác trên panel chi tiết bên phải.
                </p>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className="border-blue-300 bg-blue-50 text-blue-700 shadow-sm transition-transform motion-safe:hover:scale-[1.02]"
                >
                  {assignmentsThisMonth.length} hạng mục
                </Badge>
                <Badge
                  variant="muted"
                  className="bg-indigo-100 text-indigo-700 shadow-sm transition-transform motion-safe:hover:scale-[1.02]"
                >
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
              onRefresh={onRefresh}
              leaderMode="planning"
              emptyText="Chưa có mục tiêu cho tháng này."
              prioritizeUserId={currentUserId}
              showUserList={canEditTeam}
            />
          </CardContent>
        </Card>
      </section>

      <section id="results-section" className="scroll-mt-24 pt-2">
        <Card
          className={cn(
            'relative overflow-hidden border-emerald-200/45 shadow-lg shadow-emerald-500/10 transition-shadow duration-300 motion-safe:hover:shadow-xl motion-safe:hover:shadow-emerald-500/15 dark:border-emerald-900/40',
            CARD_ENTRANCE
          )}
          style={{ animationDelay: '140ms' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
          />
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-emerald-700">
                  2. Kết quả & đánh giá tháng trước — T{prevMonth}/{prevYear}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Duyệt theo nhân sự để cập nhật tiến độ, trạng thái và nhận xét quản lý dễ hơn.
                </p>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm transition-transform motion-safe:hover:scale-[1.02]"
                >
                  {assignmentsPrevMonth.length} hạng mục
                </Badge>
                <Badge
                  variant="muted"
                  className="bg-teal-100 text-teal-700 shadow-sm transition-transform motion-safe:hover:scale-[1.02]"
                >
                  {byUserPrev.size} nhân sự
                </Badge>
              </div>
            </div>
            <UserAssignmentWorkbench
              byUser={byUserPrev}
              members={members}
              canEditTeam={canEditTeam}
              onRefresh={onRefresh}
              leaderMode="results"
              emptyText={`Chưa có dữ liệu KPI/OKR cho tháng ${prevMonth}/${prevYear}.`}
              prioritizeUserId={currentUserId}
              showUserList={canEditTeam}
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
  const form = useForm<MiniCreateValues>({
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
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting },
  } = form

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
          className="w-fit bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white shadow-lg shadow-blue-600/35 transition-[transform,box-shadow] hover:from-blue-700 hover:to-indigo-700 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-xl motion-safe:active:translate-y-0"
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
        <Form {...form}>
          <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" onSubmit={onSubmit}>
            <SelectController
              control={control}
              name="kind"
              label="Hạng mục"
              required
              rules={{ required: true }}
              className="space-y-1 text-xs font-medium"
            >
              <SelectItem value="KPI">KPI</SelectItem>
              <SelectItem value="OKR">OKR</SelectItem>
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
                <SelectItem key={m.userId} value={m.userId}>
                  {(m.displayName ?? m.email ?? 'chưa có tên').slice(0, 48)}
                </SelectItem>
              ))}
            </SelectController>
            <SelectController
              control={control}
              name="priority"
              label="Thứ tự ưu tiên"
              required
              rules={{ required: true, min: 0, max: 99 }}
              className="space-y-1 text-xs font-medium"
            >
              <SelectItem value="0">Không xếp (0)</SelectItem>
              <SelectItem value="1">Ưu tiên 1</SelectItem>
              <SelectItem value="2">Ưu tiên 2</SelectItem>
              <SelectItem value="3">Ưu tiên 3</SelectItem>
            </SelectController>
            <DateController
              control={control}
              name="kpiSetAt"
              label="Ngày xét KPI/OKR"
              className="space-y-1 text-xs font-medium"
              datePickerClassName={cn(XL_INPUT, 'h-9')}
            />
            <InputController
              control={control}
              name="targetMetric"
              label="Chỉ số mục tiêu"
              className="space-y-1 text-xs font-medium"
              inputClassName={cn(XL_INPUT, 'h-9 tabular-nums')}
              placeholder="VD: 60"
            />
            <InputController
              control={control}
              name="reviewerName"
              label="Người đánh giá (tùy chọn)"
              className="space-y-1 text-xs font-medium"
              inputClassName={cn(XL_INPUT, 'h-9')}
              placeholder="Họ tên QL / Leader"
            />
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
        </Form>
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
  prioritizeAssigneeUserId,
  viewerVariant,
}: {
  rows: PerformanceSummaryRow[]
  loading: boolean
  teamId: string
  year: number
  month: number
  canRecalculate: boolean
  onRecalculated: () => void
  /** Leader: đưa dòng user này lên đầu. Member: chỉ hiển thị dòng của user này. */
  prioritizeAssigneeUserId?: string
  viewerVariant: 'leader' | 'member'
}) {
  const [recalcBusy, setRecalcBusy] = useState(false)
  const displayRows = useMemo(() => {
    const selfId = prioritizeAssigneeUserId?.trim()
    if (viewerVariant === 'member') {
      if (!selfId) return [] as PerformanceSummaryRow[]
      return rows.filter((r) => r.assigneeUserId === selfId)
    }
    if (!selfId) return rows
    const i = rows.findIndex((r) => r.assigneeUserId === selfId)
    if (i <= 0) return rows
    const next = [...rows]
    const [mine] = next.splice(i, 1)
    return mine ? [mine, ...next] : rows
  }, [rows, viewerVariant, prioritizeAssigneeUserId])

  const emptyBlurb = useMemo(() => {
    if (viewerVariant !== 'member') {
      return `Chưa có bản tổng hợp cho kỳ T${month}/${year} — nhập đánh giá tháng trước rồi bấm tính lại (leader).`
    }
    if (!prioritizeAssigneeUserId?.trim()) {
      return 'Không thể hiển thị tổng hợp cá nhân (thiếu thông tin tài khoản).'
    }
    if (rows.length > 0) {
      return `Chưa có bản tổng hợp cho bạn trong kỳ T${month}/${year}. Khi leader đã tính lại tổng hợp, dòng của bạn sẽ hiển thị tại đây.`
    }
    return `Chưa có bản tổng hợp cho kỳ T${month}/${year}.`
  }, [viewerVariant, rows.length, prioritizeAssigneeUserId, month, year])

  const rowName = useCallback(
    (r: PerformanceSummaryRow) =>
      r.assigneeDisplayName?.trim() || r.assigneeEmail?.trim() || 'Thành viên',
    []
  )

  if (loading) {
    return (
      <Card id="summary-section" className={cn('scroll-mt-24', CARD_ENTRANCE)}>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-bold text-amber-700">
            Tổng chỉ số hiệu suất — T{month}/{year}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    )
  }
  if (displayRows.length === 0) {
    return (
      <Card
        id="summary-section"
        className={cn(
          'scroll-mt-24 relative overflow-hidden border-amber-200/50 shadow-md shadow-amber-500/10 dark:border-amber-900/35',
          CARD_ENTRANCE
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400"
        />
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-bold text-amber-700">
            Tổng chỉ số hiệu suất — T{month}/{year}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canRecalculate && teamId && !isMockApiEnabled() && (
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={recalcBusy}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 shadow-sm transition-[transform,box-shadow] hover:bg-amber-100 disabled:opacity-50 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md motion-safe:active:translate-y-0"
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
          <p className="text-sm text-muted-foreground">{emptyBlurb}</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card
      id="summary-section"
      className={cn(
        'scroll-mt-24 relative overflow-hidden border-amber-200/50 shadow-lg shadow-amber-500/10 transition-shadow duration-300 motion-safe:hover:shadow-xl motion-safe:hover:shadow-amber-500/15 dark:border-amber-900/35',
        CARD_ENTRANCE
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400"
      />
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl font-bold text-amber-700">
          Tổng chỉ số hiệu suất — T{month}/{year}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canRecalculate && teamId && !isMockApiEnabled() && (
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={recalcBusy}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-amber-600/30 transition-[transform,box-shadow] hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg motion-safe:active:translate-y-0"
              onClick={() => {
                setRecalcBusy(true)
                void performanceApi
                  .recalculateSummaries(teamId, year, month)
                  .then(() => onRecalculated())
                  .finally(() => setRecalcBusy(false))
              }}
            >
              Tính lại tổng hợp (A–C)
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
            {displayRows.map((r) => (
              <TableRow key={r.id} className="transition-colors motion-safe:hover:bg-muted/40">
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
  readOnly = false,
}: {
  teamId: string
  year: number
  month: number
  canEditTeam: boolean
  currentUserId: string
  readOnly?: boolean
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
  const isManagerViewOnly = readOnly

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
      <Card id="form-section" className={cn('scroll-mt-24', CARD_ENTRANCE)}>
        <CardHeader>
          <CardTitle className="text-xl">Form câu hỏi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      id="form-section"
      className={cn(
        'scroll-mt-24 relative overflow-hidden border-fuchsia-200/45 shadow-lg shadow-fuchsia-500/10 transition-shadow duration-300 motion-safe:hover:shadow-xl motion-safe:hover:shadow-fuchsia-500/15 dark:border-fuchsia-900/40',
        CARD_ENTRANCE
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500"
      />
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl font-bold text-fuchsia-700">
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
            {isManagerViewOnly
              ? 'Chưa có form câu hỏi cho kỳ này.'
              : 'Chưa có form cho kỳ này (leader cần tạo câu hỏi).'}
          </p>
        )}

        {data?.questions?.length && !isManagerViewOnly ? (
          <div className="space-y-4">
            {data.questions.map((qs) => (
              <label key={qs.id} className="block rounded-lg border border-border/80 p-3">
                <span className="text-sm font-medium text-foreground">{qs.prompt}</span>
                <textarea
                  className="mt-2 min-h-[72px] w-full rounded border border-input bg-background p-2 text-sm"
                  value={answerDraft[qs.id] ?? ''}
                  onChange={(e) => setAnswerDraft((prev) => ({ ...prev, [qs.id]: e.target.value }))}
                  disabled={!currentUserId || readOnly}
                />
              </label>
            ))}
            {!isMockApiEnabled() && currentUserId && !readOnly && (
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

        {(canEditTeam || isManagerViewOnly) && data?.questions?.length ? (
          <div className="space-y-3 rounded-xl border border-border/80 p-4">
            <div className="text-sm font-semibold text-foreground">
              {isManagerViewOnly
                ? 'Danh sách câu hỏi & câu trả lời theo nhân sự'
                : 'Tổng hợp câu trả lời theo nhân sự'}
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
