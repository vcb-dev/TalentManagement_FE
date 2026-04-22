import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  CheckCircle2,
  FileUp,
  ListPlus,
  Lock,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react'
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
import {
  clampKpiPeriod,
  getMaxViewableYm,
  isKpiPeriodSelectable,
} from '@/features/kpi-okr/kpiPeriodLimits'
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

/**
 * Cửa sổ mở form khảo sát: từ 00:00 ngày 01 của `month/year` đến 23:59 ngày 05 tháng liền sau.
 * Ví dụ kỳ T4/2026 mở từ 01/04/2026 đến 05/05/2026 23:59. Hết hạn thì FE khoá form,
 * BE (`assertAnswerWindowOpen` ở performance.service.ts) sẽ trả 403 nếu client cố gọi.
 */
function isAnswerWindowOpen(year: number, month: number, now: Date = new Date()): boolean {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 5, 23, 59, 59, 999)
  return now >= start && now <= end
}

function formatAnswerWindow(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const mm = String(month).padStart(2, '0')
  const nmm = String(nextMonth).padStart(2, '0')
  return `01/${mm}/${year} → 05/${nmm}/${nextYear}`
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

  const maxViewYm = getMaxViewableYm()

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
          'mb-8 border-none bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-2xl rounded-3xl relative overflow-hidden',
          SECTION_FADE_UP
        )}
      >
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 [mask-image:linear-gradient(to_left,white,transparent)]" />
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">{title}</h1>
          <p className="text-blue-50/80 max-w-2xl font-medium">{description}</p>
        </div>
      </div>

      <Card
        className={cn(
          'mb-8 border-slate-200 bg-white/50 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/50',
          CARD_ENTRANCE
        )}
        style={{ animationDelay: '50ms' }}
      >
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {!isManagerReadOnly && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                      <SelectValue placeholder="Chọn phòng ban" />
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
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Team / Đội nhóm
                </Label>
                <Select
                  value={selectedTeamId || '__none'}
                  disabled={isMemberView}
                  onValueChange={(value) => setSelectedTeamId(value === '__none' ? '' : value)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <SelectValue placeholder="Chọn team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Chọn team —</SelectItem>
                    {(isManagerReadOnly ? allTeamsFlat : teamsInDept).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {isManagerReadOnly && 'deptName' in t && t.deptName ? (
                          <span className="ml-1 text-[11px] text-slate-400">· {t.deptName}</span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tháng
                </Label>
                <Select
                  value={String(month)}
                  onValueChange={(value) => {
                    const next = clampKpiPeriod(year, Number(value))
                    setYear(next.year)
                    setMonth(next.month)
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem
                        key={m}
                        value={String(m)}
                        disabled={!isKpiPeriodSelectable(year, m)}
                      >
                        Tháng {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Năm
                </Label>
                <Input
                  type="number"
                  value={year}
                  min={2020}
                  max={maxViewYm.year}
                  className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (!Number.isFinite(v)) return
                    const next = clampKpiPeriod(v, month)
                    setYear(next.year)
                    setMonth(next.month)
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 lg:border-l lg:pl-6 lg:border-slate-100 dark:lg:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl border-slate-200 transition-all hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                onClick={() => {
                  void treeQ.refetch()
                  void qc.invalidateQueries({ queryKey: ORG_TREE_KEY })
                  refresh()
                }}
              >
                <RefreshCw className="h-4 w-4 text-slate-500" />
                <span className="sr-only">Làm mới</span>
              </Button>
              <div className="flex flex-col gap-1">
                <Badge
                  variant="outline"
                  className="h-5 rounded-md border-blue-100 bg-blue-50 text-[10px] font-bold text-blue-600 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  KỲ CHỌN: T{month}/{year}
                </Badge>
                <Badge
                  variant="outline"
                  className="h-5 rounded-md border-fuchsia-100 bg-fuchsia-50 text-[10px] font-bold text-fuchsia-600 dark:border-fuchsia-900/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-400"
                >
                  KQ TRƯỚC: T{prevMonth}/{prevYear}
                </Badge>
              </div>
            </div>
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
          isMemberView={isMemberView}
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

/** Bảng KPI/OKR — viền & nền theo style doanh nghiệp tinh gọn. */
const XL_BORDER = 'border border-slate-200/60 dark:border-slate-800/50'
const XL_TH = cn(
  XL_BORDER,
  'sticky top-0 z-10 whitespace-nowrap bg-slate-50/80 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 shadow-sm backdrop-blur-md dark:bg-slate-900/90 dark:text-slate-400'
)
const xlTd = (stripe: boolean) =>
  cn(
    XL_BORDER,
    'px-4 py-3 align-middle text-[13px] leading-relaxed',
    stripe ? 'bg-slate-50/30 dark:bg-slate-900/20' : 'bg-transparent'
  )

const XL_INPUT = cn(
  'box-border h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10',
  'placeholder:text-slate-400'
)
const XL_TEXTAREA = cn(
  'box-border min-h-[80px] w-full min-w-[200px] max-w-[420px] resize-y rounded-lg border border-slate-200 bg-white p-3 text-[13px] text-slate-700 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10',
  'placeholder:text-slate-400'
)

const XL_SAVE_BTN =
  'rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50'

const ASSIGN_TABLE_HEAD = [
  'Kỳ',
  'Ngày xét',
  'Hạng mục',
  'Ưu tiên',
  'Nội dung',
  'Chỉ tiêu',
  'Kết quả',
  'Thao tác',
] as const

function EvalStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status || status === '__none') return <span className="text-slate-400">—</span>

  const isOk = status === 'OK'
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 px-1.5 text-[10px] font-bold shadow-none rounded-md',
        isOk
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
      )}
    >
      {status}
    </Badge>
  )
}

function KindBadge({ kind }: { kind: PerformanceAssignment['kind'] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 px-1.5 text-[10px] font-black uppercase tracking-widest shadow-none rounded-md',
        kind === 'KPI'
          ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300'
          : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
      )}
    >
      {kind}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: number }) {
  const configs: Record<number, { label: string; className: string }> = {
    1: {
      label: 'P1 - Cao',
      className:
        'border-rose-400/30 bg-rose-500/10 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
    },
    2: {
      label: 'P2 - Trung bình',
      className:
        'border-amber-400/30 bg-amber-500/10 text-amber-600 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    },
    3: {
      label: 'P3 - Thấp',
      className:
        'border-slate-400/30 bg-slate-500/10 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
    },
  }

  const config = configs[priority] || {
    label: priority === 0 ? 'Chưa xếp' : `P${priority}`,
    className:
      'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 px-1.5 text-[10px] font-black shadow-none whitespace-nowrap rounded-md uppercase tracking-wider',
        config.className
      )}
    >
      {config.label}
    </Badge>
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
    <TableRow className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
      <TableCell className={cn(td, 'whitespace-nowrap tabular-nums text-slate-500 font-medium')}>
        {periodLabel(row)}
      </TableCell>
      <TableCell className={cn(td, 'whitespace-nowrap tabular-nums text-slate-500')}>
        {formatKpiSetAt(row.kpiSetAt)}
      </TableCell>
      <TableCell className={td}>
        <KindBadge kind={row.kind} />
      </TableCell>
      <TableCell className={td}>
        <PriorityBadge priority={row.priority} />
      </TableCell>
      <TableCell
        className={cn(td, 'min-w-[300px] max-w-xl font-medium text-slate-900 dark:text-slate-100')}
      >
        {row.content}
      </TableCell>
      <TableCell className={cn(td, 'tabular-nums font-semibold text-primary')}>
        {row.targetMetric || '—'}
      </TableCell>
      <TableCell className={td}>
        <div className="flex flex-col gap-1">
          <EvalStatusBadge status={row.managerEvalStatus} />
          {row.managerReviewNote && (
            <div
              className="text-[10px] text-slate-500 italic max-w-[150px] truncate"
              title={row.managerReviewNote}
            >
              {row.managerReviewNote}
            </div>
          )}
        </div>
      </TableCell>
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
        'group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
        mode === 'results' &&
          'bg-amber-50/10 hover:bg-amber-50/20 dark:bg-amber-900/5 dark:hover:bg-amber-900/10'
      )}
    >
      <TableCell className={cn(td, 'whitespace-nowrap tabular-nums text-slate-500 font-medium')}>
        {periodLabel(row)}
      </TableCell>
      <TableCell className={cn(td, 'whitespace-nowrap tabular-nums text-slate-500')}>
        {formatKpiSetAt(row.kpiSetAt)}
      </TableCell>
      <TableCell className={td}>
        <KindBadge kind={row.kind} />
      </TableCell>
      <TableCell className={td}>
        <PriorityBadge priority={row.priority} />
      </TableCell>
      <TableCell
        className={cn(td, 'min-w-[300px] max-w-xl font-medium text-slate-900 dark:text-slate-100')}
      >
        {row.content}
      </TableCell>
      <TableCell className={cn(td, 'tabular-nums font-semibold text-primary')}>
        {row.targetMetric || '—'}
      </TableCell>
      <TableCell className={td}>
        <div className="flex flex-col gap-1">
          <EvalStatusBadge status={row.managerEvalStatus} />
          {row.managerReviewNote && (
            <div
              className="text-[10px] text-slate-500 italic max-w-[150px] truncate"
              title={row.managerReviewNote}
            >
              {row.managerReviewNote}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className={cn(td, 'whitespace-nowrap text-right')}>
        {editable ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Sửa</span>
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
                      datePickerClassName="h-9 rounded-lg border-slate-200"
                      lockToMonth={{ year: row.year, month: row.month }}
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
                        inputClassName="h-9 rounded-lg border-slate-200"
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
                          textareaClassName="min-h-[96px] rounded-lg border-slate-200"
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
                          textareaClassName="min-h-[96px] rounded-lg border-slate-200"
                          placeholder="Nhận xét…"
                        />
                      </label>
                    </>
                  )}

                  <div className="flex items-end justify-end gap-2 md:col-span-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      className="rounded-lg"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg bg-primary px-6 font-semibold"
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
  const isPlanning = leaderMode === 'planning'

  return (
    <div
      className={cn(
        XL_BORDER,
        'overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-950',
        isPlanning ? 'border-t-4 border-t-blue-500' : 'border-t-4 border-t-emerald-500'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isPlanning
            ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-100/50'
            : 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100/50'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full font-bold',
              isPlanning ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
            )}
          >
            {nameForMember(members, userId).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {nameForMember(members, userId)}
            </div>
            <div className="text-xs text-slate-500">{memberMetaForDisplay(members, userId)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              'h-6 rounded-md shadow-none border-none',
              isPlanning ? 'bg-blue-100/50 text-blue-700' : 'bg-emerald-100/50 text-emerald-700'
            )}
          >
            {rows.length} hạng mục
          </Badge>
        </div>
      </div>
      <div className="max-h-[calc(100vh-400px)] overflow-auto">
        <Table className="w-full min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-slate-100 dark:border-b-slate-800">
              {ASSIGN_TABLE_HEAD.map((h) => (
                <TableHead key={h} className={XL_TH}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={ASSIGN_TABLE_HEAD.length}
                  className="h-32 text-center text-slate-400"
                >
                  Chưa có dữ liệu cho nhân sự này.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, idx) =>
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
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
        <p className="text-sm text-slate-400">{emptyText}</p>
      </div>
    )
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
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          <Users
            className={cn(
              'h-4 w-4',
              leaderMode === 'planning' ? 'text-blue-500' : 'text-emerald-500'
            )}
          />
          Danh sách nhân sự
        </div>
        <div className="space-y-2 overflow-y-auto pr-1 max-h-[calc(100vh-400px)]">
          {userEntries.map(([uid, rows]) => {
            const active = uid === activeUserId
            const isPlanning = leaderMode === 'planning'
            return (
              <button
                key={uid}
                type="button"
                onClick={() => setSelectedUserId(uid)}
                className={cn(
                  'group flex w-full flex-col gap-1 rounded-2xl px-4 py-3 text-left transition-all duration-300 relative overflow-hidden',
                  active
                    ? isPlanning
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-1 ring-blue-600 dark:shadow-none'
                      : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-1 ring-emerald-600 dark:shadow-none'
                    : 'bg-white hover:bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-800'
                )}
              >
                {active && (
                  <div className="absolute right-0 top-0 h-full w-24 bg-white/10 [mask-image:linear-gradient(to_left,white,transparent)]" />
                )}
                <div className="flex items-center justify-between relative z-10">
                  <span
                    className={cn(
                      'truncate text-sm font-bold',
                      active
                        ? 'text-white'
                        : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900'
                    )}
                  >
                    {nameForMember(members, uid)}
                  </span>
                </div>
                <div
                  className={cn(
                    'truncate text-[11px] relative z-10',
                    active ? 'text-blue-100/80' : 'text-slate-500'
                  )}
                >
                  {memberMetaForDisplay(members, uid)}
                </div>
                <div className="mt-2 flex items-center gap-2 relative z-10">
                  <span
                    className={cn(
                      'inline-flex h-5 items-center rounded-lg px-2 text-[10px] font-bold uppercase tracking-wider transition-colors',
                      active
                        ? 'bg-white/20 text-white'
                        : isPlanning
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-emerald-50 text-emerald-600'
                    )}
                  >
                    {rows.length} hạng mục
                  </span>
                  {prioritizeUserId && uid === prioritizeUserId ? (
                    <span
                      className={cn(
                        'inline-flex h-5 items-center rounded-lg px-2 text-[10px] font-bold uppercase tracking-wider',
                        active ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'
                      )}
                    >
                      Bạn
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>
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
  isMemberView,
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
  isMemberView: boolean
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
    <div className="space-y-12">
      <section id="planning-section" className="scroll-mt-24">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-1 rounded-full bg-blue-600" />
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                1. Mục tiêu KPI/OKR tháng này — T{month}/{year}
              </h2>
            </div>
            <p className="text-[13px] text-slate-500">
              Lập mục tiêu công việc cho từng nhân sự trong team.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {members.slice(0, 5).map((m, i) => (
                <div
                  key={i}
                  className="inline-block h-7 w-7 rounded-full bg-slate-200 ring-2 ring-white dark:bg-slate-800 dark:ring-slate-950 flex items-center justify-center text-[10px] font-bold text-slate-600"
                >
                  {(m.displayName || '?').charAt(0)}
                </div>
              ))}
              {members.length > 5 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white dark:bg-slate-800 dark:ring-slate-950 text-[10px] font-medium text-slate-500">
                  +{members.length - 5}
                </div>
              )}
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
          </div>
        </div>
        <UserAssignmentWorkbench
          byUser={byUserThis}
          members={members}
          canEditTeam={canEditTeam}
          onRefresh={onRefresh}
          leaderMode="planning"
          emptyText="Chưa có mục tiêu cho tháng này."
          prioritizeUserId={currentUserId}
          showUserList={!isMemberView}
        />
      </section>

      <section id="results-section" className="scroll-mt-24">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-1 rounded-full bg-emerald-600" />
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                2. Kết quả & đánh giá tháng trước — T{prevMonth}/{prevYear}
              </h2>
            </div>
            <p className="text-[13px] text-slate-500">
              Cập nhật tiến độ và nhận xét đánh giá cho kỳ trước.
            </p>
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
          showUserList={!isMemberView}
        />
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
          className="rounded-lg bg-primary px-4 font-semibold shadow-sm transition-all hover:bg-primary/90"
        >
          Thêm mục tiêu KPI/OKR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl rounded-2xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-bold tracking-tight">
            Tạo hạng mục KPI/OKR mới
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Nhập nhanh mục tiêu công việc cho kỳ T{month}/{year}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={onSubmit}>
            <SelectController
              control={control}
              name="kind"
              label="Hạng mục"
              required
              rules={{ required: true }}
              className="space-y-1.5"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500"
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
              className="space-y-1.5"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500"
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
              className="space-y-1.5"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              <SelectItem value="0">Không xếp (0)</SelectItem>
              <SelectItem value="1">Ưu tiên 1 - Cao</SelectItem>
              <SelectItem value="2">Ưu tiên 2 - Trung bình</SelectItem>
              <SelectItem value="3">Ưu tiên 3 - Thấp</SelectItem>
            </SelectController>
            <DateController
              control={control}
              name="kpiSetAt"
              label="Ngày xét KPI/OKR"
              className="space-y-1.5"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500"
              datePickerClassName={cn(XL_INPUT, 'h-10 rounded-xl')}
              lockToMonth={{ year, month }}
            />
            <InputController
              control={control}
              name="targetMetric"
              label="Chỉ số mục tiêu"
              className="space-y-1.5"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500"
              inputClassName={cn(XL_INPUT, 'h-10 rounded-xl tabular-nums')}
              placeholder="VD: 60"
            />
            <InputController
              control={control}
              name="reviewerName"
              label="Người đánh giá (tùy chọn)"
              className="space-y-1.5"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500"
              inputClassName={cn(XL_INPUT, 'h-10 rounded-xl')}
              placeholder="Họ tên QL / Leader"
            />
            <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
              <TextareaController
                control={control}
                name="content"
                label="Nội dung KPI/OKR"
                required
                rules={{ required: true, maxLength: 500 }}
                className="space-y-1.5"
                labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500"
                maxLength={500}
                textareaClassName={cn(XL_TEXTAREA, 'max-w-none min-h-[100px] rounded-xl')}
                placeholder="Mô tả cụ thể mục tiêu cần đạt được..."
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 md:col-span-2 lg:col-span-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="rounded-xl px-6 font-bold text-slate-500 hover:bg-slate-100"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !members.length}
                className="rounded-xl bg-primary px-8 font-bold shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
              >
                {isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Đang tạo...' : 'Tạo mục tiêu'}
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
          'scroll-mt-24 overflow-hidden border-slate-200/60 shadow-sm dark:border-slate-800/50 dark:bg-slate-950/50',
          CARD_ENTRANCE
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Tổng chỉ số hiệu suất — T{month}/{year}
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Bảng tổng hợp kết quả KPI/OKR của các thành viên.
            </p>
          </div>
          {canRecalculate && teamId && !isMockApiEnabled() && (
            <Button
              type="button"
              disabled={recalcBusy}
              variant="outline"
              className="h-9 rounded-lg border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              onClick={() => {
                setRecalcBusy(true)
                void performanceApi
                  .recalculateSummaries(teamId, year, month)
                  .then(() => onRecalculated())
                  .finally(() => setRecalcBusy(false))
              }}
            >
              {recalcBusy ? 'Đang tính...' : 'Tính lại tổng hợp'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/30">
            <p className="text-sm text-slate-400 text-center">{emptyBlurb}</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card
      id="summary-section"
      className={cn(
        'scroll-mt-24 overflow-hidden border-slate-200/60 shadow-sm dark:border-slate-800/50 dark:bg-slate-950/50',
        CARD_ENTRANCE
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tổng chỉ số hiệu suất — T{month}/{year}
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Bảng tổng hợp kết quả KPI/OKR của các thành viên.
          </p>
        </div>
        {canRecalculate && teamId && !isMockApiEnabled() && (
          <Button
            type="button"
            disabled={recalcBusy}
            variant="outline"
            className="h-9 rounded-lg border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            onClick={() => {
              setRecalcBusy(true)
              void performanceApi
                .recalculateSummaries(teamId, year, month)
                .then(() => onRecalculated())
                .finally(() => setRecalcBusy(false))
            }}
          >
            {recalcBusy ? 'Đang tính...' : 'Tính lại tổng hợp'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-slate-100 dark:border-b-slate-800">
                <TableHead className="w-[200px] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Nhân sự
                </TableHead>
                <TableHead
                  className="bg-amber-50/50 text-center text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-900/10"
                  colSpan={3}
                >
                  KPI
                </TableHead>
                <TableHead
                  className="bg-blue-50/50 text-center text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-900/10"
                  colSpan={3}
                >
                  OKR
                </TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent border-b-slate-100 dark:border-b-slate-800">
                <TableHead />
                <TableHead className="text-center text-[10px] font-bold uppercase text-slate-400">
                  Đạt
                </TableHead>
                <TableHead className="text-center text-[10px] font-bold uppercase text-slate-400">
                  Chưa
                </TableHead>
                <TableHead className="text-center text-[10px] font-bold uppercase text-slate-400">
                  Xếp loại
                </TableHead>
                <TableHead className="text-center text-[10px] font-bold uppercase text-slate-400">
                  Đạt
                </TableHead>
                <TableHead className="text-center text-[10px] font-bold uppercase text-slate-400">
                  Chưa
                </TableHead>
                <TableHead className="text-center text-[10px] font-bold uppercase text-slate-400">
                  Xếp loại
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((r) => (
                <TableRow
                  key={r.id}
                  className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-b-slate-50 dark:border-b-slate-900"
                >
                  <TableCell className="py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{rowName(r)}</div>
                    <div className="text-[11px] text-slate-500">
                      {r.assigneeEmployeeCode?.trim() || r.assigneeEmail?.trim() || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-slate-700 dark:text-slate-300 bg-amber-50/20 dark:bg-amber-900/5">
                    {r.kpiOkCount}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-slate-700 dark:text-slate-300 bg-amber-50/20 dark:bg-amber-900/5">
                    {r.kpiNotCount}
                  </TableCell>
                  <TableCell className="text-center bg-amber-50/20 dark:bg-amber-900/5">
                    <span className="inline-flex h-6 items-center rounded-md bg-amber-100 px-2 text-[11px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {r.kpiGrade || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-slate-700 dark:text-slate-300 bg-blue-50/20 dark:bg-blue-900/5">
                    {r.okrOkCount}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-slate-700 dark:text-slate-300 bg-blue-50/20 dark:bg-blue-900/5">
                    {r.okrNotCount}
                  </TableCell>
                  <TableCell className="text-center bg-blue-50/20 dark:bg-blue-900/5">
                    <span className="inline-flex h-6 items-center rounded-md bg-blue-100 px-2 text-[11px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {r.okrGrade || '—'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function newSurveyQuestionRow(): { id: string; prompt: string } {
  return { id: `sq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, prompt: '' }
}

export function FormPanel({
  teamId,
  year,
  month,
  canEditTeam,
  currentUserId,
  readOnly = false,
  showResponses,
  showQuestionForm,
}: {
  teamId: string
  year: number
  month: number
  canEditTeam: boolean
  currentUserId: string
  readOnly?: boolean
  /** Nếu undefined: theo mặc định (hiện khi `canEditTeam` hoặc chế độ read-only của Leader/Manager).
   *  Nếu `false`: luôn ẩn cột "Phản hồi từ nhân sự" (Manager chỉ xem câu hỏi, không xem trả lời). */
  showResponses?: boolean
  /** Nếu false: ẩn cột câu hỏi/trả lời khảo sát bên trái, chỉ giữ phản hồi nhân sự. */
  showQuestionForm?: boolean
}) {
  const q = useQuery({
    queryKey: ['kpi-form', teamId, year, month],
    queryFn: () =>
      teamId ? performanceApi.getQuestionnaire(teamId, year, month) : Promise.resolve(null),
    enabled: Boolean(teamId) && !isMockApiEnabled(),
  })

  const data = q.data as PerformanceQuestionnaire | null

  const [questionDrafts, setQuestionDrafts] = useState<{ id: string; prompt: string }[]>([
    { id: 'init-a', prompt: 'Câu 1?' },
    { id: 'init-b', prompt: 'Câu 2?' },
  ])
  const [leaderQMode, setLeaderQMode] = useState<'upload' | 'compose'>('compose')
  const [rawBulk, setRawBulk] = useState('')
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({})
  const [busySaveQuestions, setBusySaveQuestions] = useState(false)
  const [busySaveAnswers, setBusySaveAnswers] = useState(false)
  const [isEditingAnswers, setIsEditingAnswers] = useState(false)
  const isManagerViewOnly = readOnly
  const shouldShowResponses = showResponses ?? (canEditTeam || isManagerViewOnly)
  const shouldShowQuestionForm = showQuestionForm ?? true
  const windowOpen = useMemo(() => isAnswerWindowOpen(year, month), [year, month])
  const myAnswers = useMemo(
    () => data?.answers?.filter((a) => a.respondentUserId === currentUserId) ?? [],
    [data?.answers, currentUserId]
  )
  const hasExistingAnswer = myAnswers.length > 0
  const lastSubmittedAt = useMemo(() => {
    const iso = myAnswers
      .map((a) => a.updatedAt)
      .filter((x): x is string => Boolean(x))
      .sort()
      .pop()
    if (!iso) return null
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? null : d.toLocaleString('vi-VN')
  }, [myAnswers])
  const answerInputDisabled =
    readOnly || !currentUserId || !windowOpen || (hasExistingAnswer && !isEditingAnswers)

  useEffect(() => {
    if (!data?.questions?.length) return
    const id = window.setTimeout(
      () => setQuestionDrafts(data.questions.map((item) => ({ id: item.id, prompt: item.prompt }))),
      0
    )
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

  const validDraftCount = useMemo(
    () => questionDrafts.filter((q) => q.prompt.trim().length > 0).length,
    [questionDrafts]
  )

  const onUploadSurveyFile = (file: File) => {
    void file.text().then((text) => {
      const lines = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      if (lines.length === 0) {
        toast.error('File không có dòng câu hỏi nào.')
        return
      }
      setQuestionDrafts(
        lines.map((prompt, i) => ({
          id: `u-${i}-${Date.now()}`,
          prompt,
        }))
      )
      toast.success(`Đã đọc ${lines.length} câu từ file.`)
    })
  }

  const parseRawBulk = () => {
    const lines = rawBulk
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (lines.length === 0) {
      toast.error('Nhập ít nhất một dòng câu hỏi.')
      return
    }
    setQuestionDrafts(
      lines.map((prompt, i) => ({
        id: `b-${i}-${Date.now()}`,
        prompt,
      }))
    )
    toast.success(`Đã tách ${lines.length} câu hỏi.`)
  }

  const addQuestionDraft = () => {
    setQuestionDrafts((prev) => [...prev, newSurveyQuestionRow()])
  }

  const removeQuestionDraft = (id: string) => {
    setQuestionDrafts((prev) => {
      const next = prev.filter((q) => q.id !== id)
      return next.length > 0 ? next : [newSurveyQuestionRow()]
    })
  }

  if (!teamId) return null
  if (q.isLoading) {
    return (
      <div id="form-section" className="scroll-mt-24 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div id="form-section" className="scroll-mt-24 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full bg-fuchsia-600" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              3. Form câu hỏi theo tháng
            </h2>
          </div>
          <p className="text-[13px] text-slate-500">
            Khảo sát và ghi nhận ý kiến phản hồi hàng tháng.
          </p>
        </div>
      </div>

      <div
        className={cn(
          'grid gap-6',
          shouldShowQuestionForm && shouldShowResponses ? 'lg:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {shouldShowQuestionForm ? (
          <Card className="border-slate-200/60 shadow-sm dark:border-slate-800/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {isManagerViewOnly ? 'Câu hỏi khảo sát' : 'Trả lời khảo sát'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!data && (
                <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/30">
                  <p className="text-sm text-slate-400">
                    {isManagerViewOnly
                      ? 'Chưa có form câu hỏi cho kỳ này.'
                      : 'Chưa có form cho kỳ này (Quản lý chưa tạo câu hỏi).'}
                  </p>
                </div>
              )}

              {data?.questions?.length ? (
                <div className="space-y-5">
                  {!readOnly && !windowOpen && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">
                          Kỳ khảo sát T{month}/{year}{' '}
                          {(() => {
                            const now = new Date()
                            const start = new Date(year, month - 1, 1)
                            return now < start ? 'chưa mở' : 'đã đóng'
                          })()}
                          .
                        </div>
                        <div className="text-xs opacity-80">
                          Thời hạn trả lời: {formatAnswerWindow(year, month)}.
                        </div>
                      </div>
                    </div>
                  )}
                  {!readOnly && windowOpen && hasExistingAnswer && !isEditingAnswers && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">Bạn đã gửi câu trả lời cho kỳ này.</div>
                        <div className="text-xs opacity-80">
                          {lastSubmittedAt ? <>Lần cập nhật gần nhất: {lastSubmittedAt}. </> : null}
                          Bấm <b>Chỉnh sửa</b> nếu cần cập nhật, trước khi kỳ đóng lúc 05/
                          {String(month === 12 ? 1 : month + 1).padStart(2, '0')}/
                          {month === 12 ? year + 1 : year}.
                        </div>
                      </div>
                    </div>
                  )}
                  {data.questions.map((qs, i) => (
                    <div
                      key={qs.id}
                      className="rounded-xl border border-border bg-background p-3 shadow-sm dark:border-slate-800"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">Câu hỏi {i + 1}</p>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Trả lời văn bản
                        </span>
                      </div>
                      <p className="mb-3 text-sm font-medium leading-relaxed text-foreground">
                        {qs.prompt}
                      </p>
                      <textarea
                        className={cn(
                          'min-h-[100px] w-full rounded-lg border border-slate-200 bg-slate-50/30 p-3 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none dark:border-slate-800 dark:bg-slate-900/30 dark:focus:bg-slate-950',
                          answerInputDisabled && 'cursor-not-allowed opacity-70'
                        )}
                        placeholder="Nhập câu trả lời của bạn..."
                        value={answerDraft[qs.id] ?? ''}
                        onChange={(e) =>
                          setAnswerDraft((prev) => ({ ...prev, [qs.id]: e.target.value }))
                        }
                        disabled={answerInputDisabled}
                      />
                    </div>
                  ))}
                  {!isMockApiEnabled() && currentUserId && !readOnly && windowOpen && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {!hasExistingAnswer ? (
                        <Button
                          type="button"
                          disabled={busySaveAnswers}
                          className="w-full rounded-xl bg-primary font-bold shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                          onClick={() => {
                            setBusySaveAnswers(true)
                            void performanceApi
                              .putAnswers(teamId, year, month, {
                                answers: data.questions.map((qs) => ({
                                  questionId: qs.id,
                                  answerText: answerDraft[qs.id] ?? '',
                                })),
                              })
                              .then(() => {
                                toast.success('Đã gửi câu trả lời thành công.')
                                setIsEditingAnswers(false)
                                q.refetch()
                              })
                              .catch((err) => {
                                const msg =
                                  err?.response?.data?.message ||
                                  'Không gửi được câu trả lời. Vui lòng thử lại.'
                                toast.error(msg)
                              })
                              .finally(() => setBusySaveAnswers(false))
                          }}
                        >
                          {busySaveAnswers ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {busySaveAnswers ? 'Đang gửi...' : 'Gửi câu trả lời'}
                        </Button>
                      ) : !isEditingAnswers ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-xl border-primary/40 font-bold text-primary hover:bg-primary/5"
                          onClick={() => setIsEditingAnswers(true)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa câu trả lời
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            disabled={busySaveAnswers}
                            className="w-full rounded-xl bg-primary font-bold shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                            onClick={() => {
                              setBusySaveAnswers(true)
                              void performanceApi
                                .putAnswers(teamId, year, month, {
                                  answers: data.questions.map((qs) => ({
                                    questionId: qs.id,
                                    answerText: answerDraft[qs.id] ?? '',
                                  })),
                                })
                                .then(() => {
                                  toast.success('Đã cập nhật câu trả lời.')
                                  setIsEditingAnswers(false)
                                  q.refetch()
                                })
                                .catch((err) => {
                                  const msg =
                                    err?.response?.data?.message ||
                                    'Không cập nhật được câu trả lời. Vui lòng thử lại.'
                                  toast.error(msg)
                                })
                                .finally(() => setBusySaveAnswers(false))
                            }}
                          >
                            {busySaveAnswers ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {busySaveAnswers ? 'Đang lưu...' : 'Lưu thay đổi'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busySaveAnswers}
                            className="w-full rounded-xl sm:w-auto"
                            onClick={() => {
                              const reset: Record<string, string> = {}
                              for (const qs of data.questions) {
                                const ans = myAnswers.find((a) => a.questionId === qs.id)
                                reset[qs.id] = ans?.answerText ?? ''
                              }
                              setAnswerDraft(reset)
                              setIsEditingAnswers(false)
                            }}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Huỷ
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* Phần quản lý câu hỏi (dành cho Leader) */}
        {shouldShowResponses && (
          <div className="space-y-6">
            {canEditTeam && !isMockApiEnabled() && (
              <Card className="border-border shadow-sm dark:border-slate-800/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                    <FileUp className="h-5 w-5 text-primary" strokeWidth={2} />
                    Cấu hình câu hỏi (Leader)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Kỳ T{month}/{year} · Soạn từng câu hoặc nhập nhiều dòng / file — nhân sự trả lời
                    tự luận (cùng kiểu tự luận ngắn như màn Tạo bộ bài thi).
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={leaderQMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLeaderQMode('upload')}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-sm font-semibold',
                        leaderQMode !== 'upload' && 'border-border bg-card hover:bg-muted'
                      )}
                    >
                      Upload file
                    </Button>
                    <Button
                      type="button"
                      variant={leaderQMode === 'compose' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLeaderQMode('compose')}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-sm font-semibold',
                        leaderQMode !== 'compose' && 'border-border bg-card hover:bg-muted'
                      )}
                    >
                      Tự soạn câu hỏi
                    </Button>
                  </div>

                  {leaderQMode === 'upload' ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="mb-1 block text-xs font-semibold text-muted-foreground">
                          Upload file (txt / md)
                        </Label>
                        <Input
                          type="file"
                          accept=".txt,.md,.csv,text/plain,text/markdown"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) onUploadSurveyFile(file)
                            e.target.value = ''
                          }}
                          className="block w-full cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary hover:file:bg-primary/20"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mỗi dòng không rỗng = một câu hỏi (có thể dán nội dung thay vì file).
                        </p>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs font-semibold text-muted-foreground">
                          Nhập nhiều câu (mỗi dòng một câu)
                        </Label>
                        <textarea
                          className="min-h-[120px] w-full rounded-xl border border-border bg-background p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
                          placeholder={'Câu 1?\nCâu 2?\nCâu 3?'}
                          value={rawBulk}
                          onChange={(e) => setRawBulk(e.target.value)}
                        />
                        <div className="mt-2 flex justify-end">
                          <Button type="button" variant="outline" size="sm" onClick={parseRawBulk}>
                            Tách câu hỏi
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-3">
                      {questionDrafts.map((row, qIdx) => (
                        <div
                          key={row.id}
                          className="rounded-xl border border-border bg-background p-3 shadow-sm"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-foreground">Câu hỏi {qIdx + 1}</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-auto gap-1 rounded-md px-2 py-1 text-xs font-normal normal-case tracking-normal text-muted-foreground"
                              onClick={() => removeQuestionDraft(row.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa
                            </Button>
                          </div>
                          <Input
                            value={row.prompt}
                            onChange={(e) =>
                              setQuestionDrafts((prev) =>
                                prev.map((x) =>
                                  x.id === row.id ? { ...x, prompt: e.target.value } : x
                                )
                              )
                            }
                            placeholder="Câu hỏi chưa có tiêu đề"
                            className="mb-2 w-full rounded-lg text-sm focus-visible:border-primary focus-visible:ring-primary/20"
                          />
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground/80">Tự luận ngắn</span>
                            <span>·</span>
                            <span>Bắt buộc trả lời khi gửi khảo sát</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" onClick={addQuestionDraft}>
                          <ListPlus className="mr-2 h-4 w-4" />
                          Thêm câu hỏi
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                      Xem trước ({validDraftCount} câu)
                    </p>
                    <div className="max-h-56 space-y-2 overflow-auto pr-1">
                      {validDraftCount === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Chưa có câu hỏi hợp lệ. Vui lòng nhập tiêu đề cho từng câu hoặc dùng
                          Upload / Tách câu hỏi.
                        </p>
                      ) : (
                        questionDrafts
                          .filter((q) => q.prompt.trim().length > 0)
                          .map((q, idx) => (
                            <div
                              key={`${q.id}-prev`}
                              className="rounded-lg border border-border bg-background px-3 py-2"
                            >
                              <p className="text-sm font-semibold text-foreground">
                                Câu {idx + 1}: {q.prompt.trim()}
                              </p>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={busySaveQuestions}
                    className="w-full font-bold"
                    onClick={() => {
                      const lines = questionDrafts
                        .map((s) => s.prompt.trim())
                        .filter(Boolean)
                        .map((prompt, i) => ({ prompt, sortOrder: i + 1 }))
                      if (lines.length === 0) {
                        toast.error('Cần ít nhất một câu hỏi có nội dung.')
                        return
                      }
                      setBusySaveQuestions(true)
                      void performanceApi
                        .upsertQuestionnaire(teamId, { year, month, questions: lines })
                        .then(() => {
                          toast.success('Đã cập nhật bộ câu hỏi.')
                          q.refetch()
                        })
                        .finally(() => setBusySaveQuestions(false))
                    }}
                  >
                    {busySaveQuestions ? 'Đang lưu...' : 'Lưu bộ câu hỏi'}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-200/60 shadow-sm dark:border-slate-800/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Phản hồi từ nhân sự
                </CardTitle>
              </CardHeader>
              <CardContent>
                {answersByRespondent.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/30">
                    <p className="text-sm text-slate-400 text-center">
                      Chưa có nhân sự nào trả lời khảo sát.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-auto pr-1">
                    {answersByRespondent.map((entry) => (
                      <div
                        key={entry.respondentUserId}
                        className="rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {entry.respondentName}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {data?.questions?.map((qs) => (
                            <div
                              key={qs.id}
                              className="rounded-lg bg-slate-50/80 p-3 dark:bg-slate-800/40"
                            >
                              <div className="text-[11px] font-bold text-slate-400 uppercase">
                                {qs.prompt}
                              </div>
                              <div className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {entry.answers[qs.id]?.trim() || '—'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
