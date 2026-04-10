import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, RefreshCw } from 'lucide-react'
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
  type PerformanceStatus,
  type PerformanceSummaryRow,
} from '@/features/kpi-okr/api'
import { organizationApi, type TeamMemberRow } from '@/features/organization/api'
import { isMockApiEnabled } from '@/lib/mockEnv'

type TabKey = 'work' | 'summary' | 'form'

const tabs: { id: TabKey; label: string }[] = [
  { id: 'work', label: 'Báo cáo công việc' },
  { id: 'summary', label: 'Tổng chỉ số hiệu suất' },
  { id: 'form', label: 'Form câu hỏi' },
]

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
  const [tab, setTab] = useState<TabKey>('work')
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

      <div className="mb-6 grid gap-4 rounded-2xl border border-border/60 bg-card/80 p-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
          Phòng ban
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
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
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
          Team
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
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
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
          Tháng
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
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
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
          Năm
          <input
            type="number"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={year}
            min={2020}
            max={2035}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
      </div>

      <p className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Luồng theo tháng:</span> mỗi lần nhập chọn{' '}
        <strong>
          tháng {month}/{year}
        </strong>{' '}
        — phần <strong>1</strong> giao mục tiêu KPI/OKR <em>tháng này</em>; phần <strong>2</strong>{' '}
        cập nhật <em>kết quả</em> (tiến độ, số liệu, đánh giá) cho kỳ{' '}
        <strong>
          tháng {prevMonth}/{prevYear}
        </strong>
        .
      </p>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              tab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
          onClick={() => {
            void treeQ.refetch()
            void qc.invalidateQueries({ queryKey: ORG_TREE_KEY })
            refresh()
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Làm mới dữ liệu
        </button>
      </div>

      {mockHint && (
        <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Đang bật mock API — dữ liệu KPI từ server không tải được. Tắt mock để dùng đầy đủ.
        </p>
      )}

      {tab === 'work' && (
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
      )}
      {tab === 'summary' && (
        <SummaryPanel
          rows={summariesQ.data ?? []}
          loading={summariesQ.isLoading}
          teamId={selectedTeamId}
          year={year}
          month={month}
          canRecalculate={canEditTeam}
          onRecalculated={refresh}
        />
      )}
      {tab === 'form' && (
        <FormPanel
          teamId={selectedTeamId}
          year={year}
          month={month}
          canEditTeam={canEditTeam}
          currentUserId={user?.id ?? ''}
        />
      )}

      <aside className="mt-8 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-xs text-muted-foreground">
        <div className="mb-2 font-semibold text-foreground">Điều hướng nhanh</div>
        <ul className="space-y-1">
          {departments.map((d) => (
            <li key={d.id}>
              <span className="font-medium text-foreground">{d.name}</span>
              <ul className="ml-3 mt-1 space-y-0.5">
                {d.teams.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      onClick={() => setSelectedTeamId(t.id)}
                    >
                      <ChevronRight className="h-3 w-3" />
                      {t.name}
                    </button>
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

const STATUS_OPTS: PerformanceStatus[] = ['not_started', 'on_track', 'done', 'not_met']

const STATUS_LABEL_VI: Record<PerformanceStatus, string> = {
  not_started: 'Chưa bắt đầu',
  on_track: 'Đúng tiến độ',
  done: 'Hoàn thành',
  not_met: 'Chưa đạt',
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
  const n = m?.displayName?.trim() || m?.email?.trim()
  return n || userId.slice(0, 8) + '…'
}

/** Lưới giống Excel: viền ô, header xám, hàng xen kẽ */
const XL_BORDER = 'border border-zinc-400 dark:border-zinc-600'
const XL_TH = cn(
  XL_BORDER,
  'sticky top-0 z-10 bg-[#e7e6e6] px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
)
const xlTd = (stripe: boolean) =>
  cn(
    XL_BORDER,
    'px-1.5 py-1 align-top text-[12px] leading-snug text-zinc-900 dark:text-zinc-100',
    stripe ? 'bg-[#f2f2f2]/90 dark:bg-zinc-800/50' : 'bg-white dark:bg-zinc-950'
  )
const XL_INPUT = cn(
  'box-border h-7 w-full min-w-0 rounded-none border border-zinc-400 bg-white px-1 text-[12px] outline-none',
  'focus:z-[1] focus:border-blue-600 focus:ring-1 focus:ring-blue-500 dark:border-zinc-500 dark:bg-zinc-900'
)
const XL_TEXTAREA = cn(
  'box-border min-h-[52px] w-full min-w-[200px] max-w-[420px] resize-y rounded-none border border-zinc-400 bg-white p-1 text-[12px] outline-none',
  'focus:z-[1] focus:border-blue-600 focus:ring-1 focus:ring-blue-500 dark:border-zinc-500 dark:bg-zinc-900'
)

const ASSIGN_TABLE_HEAD = [
  'Kỳ',
  'Ngày xét',
  'Nhân sự',
  'Hạng mục',
  'Ưu tiên',
  'Nội dung',
  'Chỉ tiêu MT',
  'Số KQ',
  'Tiến độ %',
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
        <span className="tabular-nums text-zinc-800 dark:text-zinc-200">{row.progressPercent}</span>
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
      <button
        type="button"
        disabled={saving}
        className={cn(
          'rounded-sm border border-zinc-500 bg-[#217346] font-semibold text-white hover:bg-[#1e6540] disabled:opacity-50',
          excel
            ? 'px-1.5 py-0.5 text-[10px]'
            : 'w-fit rounded bg-primary px-2 py-1 text-xs text-primary-foreground'
        )}
        onClick={() => {
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
      </button>
    </div>
  )
}

function KindBadge({ kind }: { kind: PerformanceAssignment['kind'] }) {
  return (
    <span
      className={cn(
        'inline-block rounded-sm px-1.5 py-0.5 text-[11px] font-semibold',
        kind === 'KPI'
          ? 'bg-sky-200 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100'
          : 'bg-pink-200 text-pink-900 dark:bg-pink-900/40 dark:text-pink-100'
      )}
    >
      {kind}
    </span>
  )
}

function ReadOnlyAssignmentRow({
  row,
  assigneeUserId,
  members,
  currentUserId,
  canEditOwn,
  onRefresh,
  rowStripe,
}: {
  row: PerformanceAssignment
  assigneeUserId: string
  members: TeamMemberRow[]
  currentUserId: string | undefined
  canEditOwn: boolean
  onRefresh: () => void
  rowStripe: boolean
}) {
  const td = xlTd(rowStripe)
  return (
    <tr className="hover:bg-green-100/40 dark:hover:bg-green-900/20">
      <td className={cn(td, 'whitespace-nowrap tabular-nums text-zinc-600')}>{periodLabel(row)}</td>
      <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{formatKpiSetAt(row.kpiSetAt)}</td>
      <td className={cn(td, 'max-w-[140px] font-medium')}>
        {nameForMember(members, assigneeUserId)}
      </td>
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
      <td className={cn(td, 'min-w-[140px] max-w-[200px] whitespace-pre-wrap text-zinc-700')}>
        {row.managerReviewNote ?? ''}
      </td>
      <td className={td} />
    </tr>
  )
}

function LeaderAssignmentRow({
  row,
  assigneeUserId,
  members,
  mode,
  onSaved,
  rowStripe,
}: {
  row: PerformanceAssignment
  assigneeUserId: string
  members: TeamMemberRow[]
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
        'hover:bg-[#e8f4e8] dark:hover:bg-green-950/30',
        mode === 'results' &&
          'outline outline-1 outline-amber-300/60 -outline-offset-1 dark:outline-amber-700/50'
      )}
    >
      <td className={cn(td, 'whitespace-nowrap tabular-nums text-zinc-600')}>{periodLabel(row)}</td>
      <td className={td}>
        <input
          type="date"
          className={XL_INPUT}
          value={kpiSetAt}
          onChange={(e) => setKpiSetAt(e.target.value)}
        />
      </td>
      <td className={cn(td, 'max-w-[140px] font-medium')}>
        {nameForMember(members, assigneeUserId)}
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
        <button
          type="button"
          disabled={saving}
          className="rounded-sm border border-zinc-500 bg-[#217346] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#1e6540] disabled:opacity-50 dark:border-zinc-400"
          onClick={save}
        >
          Lưu
        </button>
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

function AssignmentTablesForUsers({
  byUser,
  members,
  canEditTeam,
  canEditOwn,
  currentUserId,
  onRefresh,
  leaderMode,
}: {
  byUser: Map<string, PerformanceAssignment[]>
  members: TeamMemberRow[]
  canEditTeam: boolean
  canEditOwn: boolean
  currentUserId: string | undefined
  onRefresh: () => void
  leaderMode: 'planning' | 'results'
}) {
  return (
    <>
      {Array.from(byUser.entries()).map(([uid, rows]) => (
        <div
          key={uid}
          className={cn(
            XL_BORDER,
            'overflow-hidden rounded-sm bg-white shadow-sm dark:bg-zinc-950'
          )}
        >
          <div className="border-b border-zinc-400 bg-[#d9d9d9] px-3 py-2 text-sm font-bold text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
            Nhân sự: <span className="font-semibold">{nameForMember(members, uid)}</span>
            <span className="ml-2 font-mono text-xs font-normal opacity-80">
              · {uid.slice(0, 8)}…
            </span>
          </div>
          <div className="max-h-[min(75vh,720px)] overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead>
                <tr>
                  {ASSIGN_TABLE_HEAD.map((h) => (
                    <th key={h || 'act'} className={XL_TH}>
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
                      assigneeUserId={uid}
                      members={members}
                      mode={leaderMode}
                      onSaved={onRefresh}
                      rowStripe={idx % 2 === 1}
                    />
                  ) : (
                    <ReadOnlyAssignmentRow
                      key={r.id}
                      row={r}
                      assigneeUserId={uid}
                      members={members}
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
      ))}
    </>
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
    return <p className="text-sm text-muted-foreground">Chọn team để xem báo cáo công việc.</p>
  }
  if (loadingThis || loadingPrev || membersLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải…</p>
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            1. Mục tiêu KPI/OKR tháng này — T{month}/{year}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Giao việc, ưu tiên và chỉ tiêu cho kỳ đang chọn. Chỉ tạo dòng mới cho tháng này.
          </p>
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
        <AssignmentTablesForUsers
          byUser={byUserThis}
          members={members}
          canEditTeam={canEditTeam}
          canEditOwn={canEditOwn}
          currentUserId={currentUserId}
          onRefresh={onRefresh}
          leaderMode="planning"
        />
        {assignmentsThisMonth.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có mục tiêu cho tháng này.</p>
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            2. Kết quả & đánh giá tháng trước — T{prevMonth}/{prevYear}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cập nhật tiến độ, số kết quả, ngày xét và đánh giá QL cho kỳ vừa qua. Phần nội dung /
            chỉ tiêu tháng trước chỉ đọc; sửa trực tiếp nếu cần chỉnh rất hạn chế — nên dùng mục
            tiêu tháng mới ở trên.
          </p>
        </div>
        <AssignmentTablesForUsers
          byUser={byUserPrev}
          members={members}
          canEditTeam={canEditTeam}
          canEditOwn={canEditOwn}
          currentUserId={currentUserId}
          onRefresh={onRefresh}
          leaderMode="results"
        />
        {assignmentsPrevMonth.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Chưa có dữ liệu KPI/OKR cho tháng {prevMonth}/{prevYear} — có thể chưa giao hoặc kỳ cũ
            chưa nhập.
          </p>
        )}
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
  const [assigneeUserId, setAssigneeUserId] = useState(defaultAssigneeId)
  const [content, setContent] = useState('')
  const [kind, setKind] = useState<'KPI' | 'OKR'>('KPI')
  const [priority, setPriority] = useState(1)
  const [kpiSetAt, setKpiSetAt] = useState('')
  const [targetMetric, setTargetMetric] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [busy, setBusy] = useState(false)

  const resolvedAssigneeUserId = useMemo(() => {
    if (!members.length) return assigneeUserId
    if (members.some((m) => m.userId === assigneeUserId)) return assigneeUserId
    if (defaultAssigneeId && members.some((m) => m.userId === defaultAssigneeId))
      return defaultAssigneeId
    return members[0]!.userId
  }, [members, defaultAssigneeId, assigneeUserId])

  return (
    <form
      className={cn(
        XL_BORDER,
        'grid gap-3 rounded-sm bg-[#f9f9f9] p-3 md:grid-cols-2 lg:grid-cols-3 dark:bg-zinc-900'
      )}
      onSubmit={(e) => {
        e.preventDefault()
        if (!content.trim() || !resolvedAssigneeUserId.trim()) return
        setBusy(true)
        const kpiIso = kpiSetAt.trim()
          ? new Date(`${kpiSetAt.trim()}T12:00:00`).toISOString()
          : null
        void performanceApi
          .createAssignment(teamId, {
            assigneeUserId: resolvedAssigneeUserId.trim(),
            year,
            month,
            kind,
            content: content.trim(),
            priority,
            targetMetric: targetMetric.trim() || null,
            kpiSetAt: kpiIso,
            reviewerName: reviewerName.trim() || null,
          })
          .then(() => {
            setContent('')
            setTargetMetric('')
            setKpiSetAt('')
            setReviewerName('')
            onCreated()
          })
          .finally(() => setBusy(false))
      }}
    >
      <p className="md:col-span-2 lg:col-span-3 -mb-1 border-b border-zinc-300 pb-2 text-xs font-bold uppercase tracking-wide text-zinc-700 dark:border-zinc-600 dark:text-zinc-300">
        Thêm dòng mới (nhập nhanh như trên sheet)
      </p>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Hạng mục
        <select
          className={cn(XL_INPUT, 'h-9 py-1')}
          value={kind}
          onChange={(e) => setKind(e.target.value as 'KPI' | 'OKR')}
        >
          <option value="KPI">KPI</option>
          <option value="OKR">OKR</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Nhân sự nhận việc
        <select
          className={cn(XL_INPUT, 'h-9 py-1')}
          value={resolvedAssigneeUserId}
          onChange={(e) => setAssigneeUserId(e.target.value)}
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {(m.displayName ?? m.email ?? m.userId).slice(0, 48)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Thứ tự ưu tiên
        <select
          className={cn(XL_INPUT, 'h-9 py-1')}
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
        >
          <option value={0}>Không xếp (0)</option>
          <option value={1}>Ưu tiên 1</option>
          <option value={2}>Ưu tiên 2</option>
          <option value={3}>Ưu tiên 3</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Ngày xét KPI/OKR
        <input
          type="date"
          className={cn(XL_INPUT, 'h-9')}
          value={kpiSetAt}
          onChange={(e) => setKpiSetAt(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Chỉ số mục tiêu
        <input
          type="text"
          className={cn(XL_INPUT, 'h-9 tabular-nums')}
          value={targetMetric}
          onChange={(e) => setTargetMetric(e.target.value)}
          placeholder="VD: 60"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Người đánh giá (tùy chọn)
        <input
          type="text"
          className={cn(XL_INPUT, 'h-9')}
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          placeholder="Họ tên QL / Leader"
        />
      </label>
      <label className="md:col-span-2 lg:col-span-3 flex flex-col gap-1 text-xs font-medium">
        Nội dung KPI/OKR
        <textarea
          required
          className={cn(XL_TEXTAREA, 'max-w-none min-h-[80px]')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Mô tả chỉ tiêu…"
        />
      </label>
      <div className="flex items-end md:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={busy || !members.length}
          className="rounded-sm border border-zinc-600 bg-[#217346] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e6540] disabled:opacity-50"
        >
          Thêm dòng
        </button>
      </div>
    </form>
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

  if (loading) return <p className="text-sm text-muted-foreground">Đang tải…</p>
  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        {canRecalculate && teamId && !isMockApiEnabled() && (
          <div className="flex justify-end">
            <button
              type="button"
              disabled={recalcBusy}
              className="rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary disabled:opacity-50"
              onClick={() => {
                setRecalcBusy(true)
                void performanceApi
                  .recalculateSummaries(teamId, year, month)
                  .then(() => onRecalculated())
                  .finally(() => setRecalcBusy(false))
              }}
            >
              Tính lại tổng hợp
            </button>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Chưa có bản tổng hợp — thêm KPI hoặc bấm tính lại (leader).
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {canRecalculate && teamId && !isMockApiEnabled() && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={recalcBusy}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            onClick={() => {
              setRecalcBusy(true)
              void performanceApi
                .recalculateSummaries(teamId, year, month)
                .then(() => onRecalculated())
                .finally(() => setRecalcBusy(false))
            }}
          >
            Tính lại tổng hợp (A–D)
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="px-3 py-2">Nhân sự</th>
              <th className="bg-amber-500/10 px-3 py-2" colSpan={3}>
                KPI
              </th>
              <th className="bg-sky-500/10 px-3 py-2" colSpan={3}>
                OKR
              </th>
            </tr>
            <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
              <th className="px-3 py-2" />
              <th className="px-3 py-2">Đạt</th>
              <th className="px-3 py-2">Chưa</th>
              <th className="px-3 py-2">Loại</th>
              <th className="px-3 py-2">Đạt</th>
              <th className="px-3 py-2">Chưa</th>
              <th className="px-3 py-2">Loại</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="px-3 py-2 font-mono text-xs">{r.assigneeUserId.slice(0, 8)}…</td>
                <td className="bg-amber-500/5 px-3 py-2">{r.kpiOkCount}</td>
                <td className="bg-amber-500/5 px-3 py-2">{r.kpiNotCount}</td>
                <td className="bg-amber-500/5 px-3 py-2 font-semibold">{r.kpiGrade ?? '—'}</td>
                <td className="bg-sky-500/5 px-3 py-2">{r.okrOkCount}</td>
                <td className="bg-sky-500/5 px-3 py-2">{r.okrNotCount}</td>
                <td className="bg-sky-500/5 px-3 py-2 font-semibold">{r.okrGrade ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

  const data = q.data as {
    id: string
    questions: { id: string; prompt: string; sortOrder: number }[]
    answers?: { questionId: string; respondentUserId: string; answerText: string }[]
  } | null

  const [prompts, setPrompts] = useState('Câu 1?\nCâu 2?')
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({})

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

  if (!teamId) return <p className="text-sm text-muted-foreground">Chọn team.</p>
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Đang tải form…</p>

  return (
    <div className="space-y-6">
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
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() => {
              const lines = prompts
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((prompt) => ({ prompt }))
              void performanceApi
                .upsertQuestionnaire(teamId, { year, month, questions: lines })
                .then(() => q.refetch())
            }}
          >
            Lưu câu hỏi
          </button>
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
            <button
              type="button"
              className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary"
              onClick={() => {
                void performanceApi
                  .putAnswers(teamId, year, month, {
                    answers: data.questions.map((qs) => ({
                      questionId: qs.id,
                      answerText: answerDraft[qs.id] ?? '',
                    })),
                  })
                  .then(() => q.refetch())
              }}
            >
              Gửi câu trả lời
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
