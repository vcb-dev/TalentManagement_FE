import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  UserRound,
  Target,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import { performanceApi, type PerformanceAssignment } from '@/features/kpi-okr/api'
import {
  clampKpiPeriod,
  getMaxViewableYm,
  isKpiPeriodSelectable,
} from '@/features/kpi-okr/kpiPeriodLimits'
import { isTrafficTeam, MANDATORY_METRICS_BY_TEMPLATE } from '@/features/kpi-okr/catalogHelpers'
import { FormPanel } from '@/features/kpi-okr/components/KpiOkrWorkspace'
import { useMonthlyReportSelfEdit } from '@/features/kpi-okr/components/hooks/useMonthlyReportSelfEdit'
import { useHrOrgTree, ORG_TREE_KEY } from '@/features/hr-admin/useHrOrgTree'
import { organizationApi } from '@/features/organization/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useAuthStore } from '@/stores/auth.store'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { Textarea } from '@/components/ui/textarea'
import {
  EvidenceImagePreviews,
  KpiEvidenceInput,
} from '@/features/kpi-okr/components/KpiEvidenceInput'
import { CustomSelect } from '@/components/shared/CustomSelect'
import { WorkReportTab } from './WorkReportTab'

function nowYm() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function formatKpiSetAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN')
}

function PriorityText({ priority }: { priority: number }) {
  if (priority === 1) return <span className="font-semibold text-rose-600">P1 - Cao</span>
  if (priority === 2) return <span className="font-semibold text-amber-600">P2 - TB</span>
  if (priority === 3) return <span className="font-semibold text-slate-600">P3 - Thấp</span>
  return <span className="text-slate-400">—</span>
}

function EvalBadge({ status }: { status: string | null | undefined }) {
  const v = status?.trim().toUpperCase()
  if (!v || v === '__NONE') return <span className="text-slate-400">—</span>
  const isOk = v === 'OK'
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 px-1.5 text-xs font-bold shadow-none rounded-md',
        isOk
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
      )}
    >
      {v}
    </Badge>
  )
}

/** Epic 4 — nhập liệu dạng stack (mobile) */
function MonthlyReportEpic4EditableStack({
  evidence,
  setEvidence,
  numericRaw,
  setNumericRaw,
  numericUnit,
  setNumericUnit,
  selfEvalStatus,
  setSelfEvalStatus,
  selfReviewNote,
  setSelfReviewNote,
  disabled,
}: {
  evidence: string
  setEvidence: (v: string) => void
  numericRaw: string
  setNumericRaw: (v: string) => void
  numericUnit: string
  setNumericUnit: (v: string) => void
  selfEvalStatus: string
  setSelfEvalStatus: (v: string) => void
  selfReviewNote: string
  setSelfReviewNote: (v: string) => void
  disabled?: boolean
}) {
  const inputCls =
    'h-8 min-w-[72px] rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Số liệu</Label>
          <Input
            value={numericRaw}
            onChange={(e) => setNumericRaw(e.target.value)}
            className={inputCls}
            placeholder="—"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Đơn vị</Label>
          <Input
            value={numericUnit}
            onChange={(e) => setNumericUnit(e.target.value)}
            className={inputCls}
            placeholder="Đơn vị"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-bold uppercase text-muted-foreground">Minh chứng</Label>
        <KpiEvidenceInput value={evidence} onChange={setEvidence} disabled={disabled} />
      </div>
      <CustomSelect
        label="Tự đánh giá"
        value={selfEvalStatus || '__none'}
        onValueChange={(v) => setSelfEvalStatus(v === '__none' ? '' : v)}
        options={[
          { label: '—', value: '__none' },
          { label: 'OK', value: 'OK' },
          { label: 'NOT', value: 'NOT' },
        ]}
        disabled={disabled}
      />
      <div className="space-y-1">
        <Label className="text-xs font-bold uppercase text-muted-foreground">Tự nhận xét</Label>
        <Textarea
          value={selfReviewNote}
          onChange={(e) => setSelfReviewNote(e.target.value)}
          rows={2}
          disabled={disabled}
          className="min-h-[52px] resize-y rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
          placeholder="Tự nhận xét"
        />
      </div>
    </div>
  )
}

// ─── Expandable editable row (member) ────────────────────────────────────────

function MonthlyReportMemberExpandableRow({
  item,
  onSaved,
  colCount,
}: {
  item: PerformanceAssignment
  onSaved: () => void
  colCount: number
}) {
  const [open, setOpen] = useState(false)
  const {
    evidence,
    setEvidence,
    numericRaw,
    setNumericRaw,
    numericUnit,
    setNumericUnit,
    selfEvalStatus,
    setSelfEvalStatus,
    selfReviewNote,
    setSelfReviewNote,
    saving,
    save,
  } = useMonthlyReportSelfEdit(item, onSaved)

  const inputCls =
    'h-8 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950'

  return (
    <Fragment>
      {/* ── Compact main row ── */}
      <tr className="border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-500">
          {formatKpiSetAt(item.kpiSetAt)}
        </td>
        <td className="px-3 py-2.5">
          <Badge
            className={
              item.kind === 'KPI'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white'
            }
          >
            {item.kind}
          </Badge>
        </td>
        <td className="whitespace-nowrap px-3 py-2.5">
          <PriorityText priority={item.priority} />
        </td>
        <td className="px-3 py-2.5 max-w-[280px] whitespace-pre-wrap text-sm">{item.content}</td>
        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-semibold text-primary">
          {item.targetMetric?.trim() || '—'}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600 tabular-nums">
          {item.numericValue != null
            ? `${item.numericValue}${item.numericUnit ? ' ' + item.numericUnit : ''}`
            : '—'}
        </td>
        <td className="px-3 py-2.5">
          <EvalBadge status={item.selfEvalStatus} />
        </td>
        <td className="px-3 py-2.5">
          <EvalBadge status={item.managerEvalStatus} />
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 text-right">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              open
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
            )}
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {open ? 'Thu gọn' : 'Chi tiết'}
          </button>
        </td>
      </tr>

      {/* ── Expanded detail panel ── */}
      {open && (
        <tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">
          <td colSpan={colCount} className="px-4 py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Left: Số liệu + Tự đánh giá + Tự nhận xét */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Số liệu
                    </label>
                    <Input
                      value={numericRaw}
                      onChange={(e) => setNumericRaw(e.target.value)}
                      className={cn(inputCls, 'w-28')}
                      placeholder="—"
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Đơn vị
                    </label>
                    <Input
                      value={numericUnit}
                      onChange={(e) => setNumericUnit(e.target.value)}
                      className={cn(inputCls, 'w-24')}
                      placeholder="VNĐ, %..."
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tự đánh giá
                    </label>
                    <CustomSelect
                      value={selfEvalStatus || '__none'}
                      onValueChange={(v) => setSelfEvalStatus(v === '__none' ? '' : v)}
                      options={[
                        { label: '—', value: '__none' },
                        { label: 'OK', value: 'OK' },
                        { label: 'NOT', value: 'NOT' },
                      ]}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tự nhận xét
                  </label>
                  <Textarea
                    value={selfReviewNote}
                    onChange={(e) => setSelfReviewNote(e.target.value)}
                    rows={4}
                    disabled={saving}
                    placeholder="Nhận xét về kết quả thực hiện mục tiêu này..."
                    className="w-full resize-y rounded-md border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                {item.managerReviewNote?.trim() && (
                  <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      QL nhận xét
                    </p>
                    <p className="text-sm italic text-slate-600 dark:text-slate-400">
                      {item.managerReviewNote}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Minh chứng */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Minh chứng
                </label>
                <KpiEvidenceInput value={evidence} onChange={setEvidence} disabled={saving} />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => void save().then(() => setOpen(false))}
                className="px-6"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

// ─── Expandable read-only row ─────────────────────────────────────────────────

function MonthlyReportReadOnlyExpandableRow({
  item,
  colCount,
}: {
  item: PerformanceAssignment
  colCount: number
}) {
  const [open, setOpen] = useState(false)
  const num =
    item.numericValue != null
      ? `${item.numericValue}${item.numericUnit ? ' ' + item.numericUnit : ''}`
      : '—'

  return (
    <Fragment>
      <tr className="border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-500">
          {formatKpiSetAt(item.kpiSetAt)}
        </td>
        <td className="px-3 py-2.5">
          <Badge
            className={
              item.kind === 'KPI'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white'
            }
          >
            {item.kind}
          </Badge>
        </td>
        <td className="whitespace-nowrap px-3 py-2.5">
          <PriorityText priority={item.priority} />
        </td>
        <td className="px-3 py-2.5 max-w-[280px] whitespace-pre-wrap text-sm">{item.content}</td>
        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-semibold text-primary">
          {item.targetMetric?.trim() || '—'}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600 tabular-nums">{num}</td>
        <td className="px-3 py-2.5">
          <EvalBadge status={item.selfEvalStatus} />
        </td>
        <td className="px-3 py-2.5">
          <EvalBadge status={item.managerEvalStatus} />
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 text-right">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              open
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
            )}
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {open ? 'Thu gọn' : 'Chi tiết'}
          </button>
        </td>
      </tr>

      {open && (
        <tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">
          <td colSpan={colCount} className="px-4 py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                {item.selfReviewNote?.trim() && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tự nhận xét
                    </p>
                    <p className="text-sm italic text-slate-700 dark:text-slate-300">
                      {item.selfReviewNote}
                    </p>
                  </div>
                )}
                {item.managerReviewNote?.trim() && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      QL nhận xét
                    </p>
                    <p className="text-sm italic text-slate-600 dark:text-slate-400">
                      {item.managerReviewNote}
                    </p>
                  </div>
                )}
                {!item.selfReviewNote?.trim() && !item.managerReviewNote?.trim() && (
                  <p className="text-sm text-slate-400">Chưa có nhận xét</p>
                )}
              </div>
              <div>
                {item.evidence?.trim() && (
                  <>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Minh chứng
                    </p>
                    <p className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400">
                      {item.evidence}
                    </p>
                    <EvidenceImagePreviews
                      evidence={item.evidence}
                      maxHeightClass="h-16 max-w-[120px]"
                    />
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function MonthlyReportDetailReadOnlyCard({ item }: { item: PerformanceAssignment }) {
  return (
    <div className="space-y-3 border-b border-blue-100/50 py-4 first:pt-0 last:border-0 dark:border-blue-900/30">
      <div className="tabular-nums text-xs text-slate-500">{formatKpiSetAt(item.kpiSetAt)}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={
            item.kind === 'KPI'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              : 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white'
          }
        >
          {item.kind}
        </Badge>
        <PriorityText priority={item.priority} />
      </div>
      <p className="whitespace-pre-wrap break-words text-sm">{item.content}</p>
      <p className="text-sm font-semibold tabular-nums text-primary">
        {item.targetMetric?.trim() || '—'}
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-xs font-bold uppercase text-muted-foreground">Số liệu</span>
          <p className="tabular-nums">
            {item.numericValue !== undefined && item.numericValue !== null
              ? String(item.numericValue)
              : '—'}
          </p>
        </div>
        <div>
          <span className="text-xs font-bold uppercase text-muted-foreground">Đơn vị</span>
          <p className="text-xs uppercase text-slate-600">{item.numericUnit ?? '—'}</p>
        </div>
      </div>
      <div>
        <span className="text-xs font-bold uppercase text-muted-foreground">Minh chứng</span>
        {item.evidence?.trim() ? (
          <p className="break-all text-xs">{item.evidence.trim()}</p>
        ) : (
          <span className="text-slate-400">—</span>
        )}
        <EvidenceImagePreviews evidence={item.evidence} maxHeightClass="h-16 max-w-full" />
      </div>
      <div>
        <span className="text-xs font-bold uppercase text-muted-foreground">Tự đánh giá</span>
        <div className="mt-1">
          <EvalBadge status={item.selfEvalStatus} />
        </div>
      </div>
      <div>
        <span className="text-xs font-bold uppercase text-muted-foreground">Tự nhận xét</span>
        <p className="text-xs text-slate-600">
          {item.selfReviewNote?.trim() ? (
            <span className="italic">{item.selfReviewNote.trim()}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase text-muted-foreground">QL đánh giá</span>
        <div className="mt-1">
          <EvalBadge status={item.managerEvalStatus} />
        </div>
      </div>
      <div>
        <span className="text-xs font-bold uppercase text-muted-foreground">QL nhận xét</span>
        <p className="break-words text-xs italic text-slate-500">
          {item.managerReviewNote?.trim() || '—'}
        </p>
      </div>
    </div>
  )
}

function MonthlyReportDetailEditableMobileCard({
  item,
  onSaved,
}: {
  item: PerformanceAssignment
  onSaved: () => void
}) {
  const edit = useMonthlyReportSelfEdit(item, onSaved)
  return (
    <div className="space-y-3 border-b border-blue-100/50 py-4 first:pt-0 last:border-0 dark:border-blue-900/30">
      <div className="tabular-nums text-xs text-slate-500">{formatKpiSetAt(item.kpiSetAt)}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={
            item.kind === 'KPI'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              : 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white'
          }
        >
          {item.kind}
        </Badge>
        <PriorityText priority={item.priority} />
      </div>
      <p className="whitespace-pre-wrap break-words text-sm">{item.content}</p>
      <p className="text-sm font-semibold tabular-nums text-primary">
        {item.targetMetric?.trim() || '—'}
      </p>
      <MonthlyReportEpic4EditableStack
        evidence={edit.evidence}
        setEvidence={edit.setEvidence}
        numericRaw={edit.numericRaw}
        setNumericRaw={edit.setNumericRaw}
        numericUnit={edit.numericUnit}
        setNumericUnit={edit.setNumericUnit}
        selfEvalStatus={edit.selfEvalStatus}
        setSelfEvalStatus={edit.setSelfEvalStatus}
        selfReviewNote={edit.selfReviewNote}
        setSelfReviewNote={edit.setSelfReviewNote}
        disabled={edit.saving}
      />
      <div>
        <span className="text-xs font-bold uppercase text-muted-foreground">QL đánh giá</span>
        <div className="mt-1">
          <EvalBadge status={item.managerEvalStatus} />
        </div>
      </div>
      <div>
        <span className="text-xs font-bold uppercase text-muted-foreground">QL nhận xét</span>
        <p className="text-xs italic text-slate-500">{item.managerReviewNote?.trim() || '—'}</p>
      </div>
      <Button
        type="button"
        size="sm"
        className="h-10 w-full"
        disabled={edit.saving}
        onClick={() => void edit.save()}
      >
        {edit.saving ? '…' : 'Lưu'}
      </Button>
    </div>
  )
}

/** Báo cáo hàng tháng — member (cá nhân) / leader (team). Nội dung nối API sau. */
export function MonthlyReportScreen() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const user = useAuthStore((s) => s.user)
  const userId = user?.id
  const isLeader = role === 'LEADER'
  const isManager = role === 'MANAGER'
  const canSeeTeamWide = isLeader || isManager
  const [year, setYear] = useState(() => nowYm().year)
  const [month, setMonth] = useState(() => nowYm().month)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [activeTab, setActiveTab] = useState<'kpi-okr' | 'work-report'>('kpi-okr')
  const [summaryExpanded, setSummaryExpanded] = useState(true)
  const [detailExpanded, setDetailExpanded] = useState(true)

  const maxViewYm = getMaxViewableYm()

  const treeQ = useHrOrgTree()
  const departments = useMemo(() => treeQ.data?.departments ?? [], [treeQ.data])
  const selectedDept = useMemo(
    () => departments.find((d) => d.teams.some((t) => t.id === selectedTeamId)),
    [departments, selectedTeamId]
  )
  const teamsInDept = selectedDept?.teams ?? departments[0]?.teams ?? []

  useEffect(() => {
    if (selectedTeamId) return
    const myFirstTeam = user?.teamIds?.[0]
    const fallback = departments[0]?.teams[0]?.id ?? ''
    const id = window.setTimeout(() => setSelectedTeamId(myFirstTeam ?? fallback), 0)
    return () => window.clearTimeout(id)
  }, [selectedTeamId, user?.teamIds, departments])

  const membersQ = useQuery({
    queryKey: ['monthly-report-members', selectedTeamId],
    queryFn: () => organizationApi.getTeamMembers(selectedTeamId),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })

  const summariesQ = useQuery({
    queryKey: ['monthly-report-summaries', selectedTeamId, year, month],
    queryFn: () => performanceApi.listSummaries(selectedTeamId, year, month),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })

  const assignmentsQ = useQuery({
    queryKey: ['monthly-report-assignments', selectedTeamId, year, month],
    queryFn: () => performanceApi.listAssignments(selectedTeamId, year, month),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })
  const assignmentsData = assignmentsQ.data ?? []

  const monthlyReportQ = useQuery({
    queryKey: ['monthly-report', selectedDept?.id, year, month],
    queryFn: () => performanceApi.getMonthlyReport(selectedDept?.id ?? '', year, month),
    enabled: Boolean(selectedDept?.id) && canSeeTeamWide && !isMockApiEnabled(),
  })
  const hrCounters = monthlyReportQ.data?.hrCounters

  const summariesData = summariesQ.data ?? []

  const summaryRows =
    !userId || canSeeTeamWide
      ? summariesData
      : summariesData.filter((x) => x.assigneeUserId === userId)

  const assignmentsByUser = new Map<string, typeof assignmentsData>()
  for (const item of assignmentsData) {
    const rows = assignmentsByUser.get(item.assigneeUserId) ?? []
    rows.push(item)
    assignmentsByUser.set(item.assigneeUserId, rows)
  }

  const selectedDetailUserId = (() => {
    if (selectedUserId && assignmentsByUser.has(selectedUserId)) return selectedUserId
    if (!canSeeTeamWide && userId && assignmentsByUser.has(userId)) return userId
    const first = assignmentsByUser.keys().next().value
    return typeof first === 'string' ? first : ''
  })()

  const detailRows = selectedDetailUserId ? (assignmentsByUser.get(selectedDetailUserId) ?? []) : []

  // Tính tiến độ chỉ số cố định theo team type
  const selectedTeamForReport = useMemo(
    () => departments.flatMap((d) => d.teams).find((t) => t.id === selectedTeamId) ?? null,
    [departments, selectedTeamId]
  )
  useEffect(() => {
    if (!selectedTeamId) return
    window.localStorage.setItem(
      'assistant.kpiContext',
      JSON.stringify({ teamId: selectedTeamId, year, month })
    )
  }, [selectedTeamId, year, month])
  const isTrafficTeamReport = isTrafficTeam(
    selectedTeamId || null,
    null,
    selectedTeamForReport?.name ?? null
  )
  const fixedTemplateCode = isTrafficTeamReport ? 'TRAFFIC_TEAM_NV' : 'SALES_NV'
  const fixedMetricsList = MANDATORY_METRICS_BY_TEMPLATE[fixedTemplateCode] ?? []

  const fixedMetricsProgress = useMemo(() => {
    if (!fixedMetricsList.length || !assignmentsData.length) return []
    const totalMembers = new Set(assignmentsData.map((a) => a.assigneeUserId)).size
    return fixedMetricsList.map((metricContent) => {
      const matching = assignmentsData.filter((a) => a.content === metricContent)
      const filled = matching.filter((a) => a.numericValue != null).length
      const total = matching.length || totalMembers
      const sum = matching.reduce(
        (acc, a) => acc + (a.numericValue != null ? Number(a.numericValue) : 0),
        0
      )
      return { content: metricContent, filled, total, sum }
    })
  }, [assignmentsData, fixedMetricsList])

  const eff = useMemo(() => resolveEffectivePermissionSet(user), [user])
  const allowEpic4SelfEdit =
    Boolean(userId) &&
    !canSeeTeamWide &&
    selectedDetailUserId === userId &&
    eff.has('kpi.edit_own') &&
    !isMockApiEnabled()

  const invalidateMonthlyAssignments = useCallback(() => {
    void qc.invalidateQueries({
      queryKey: ['monthly-report-assignments', selectedTeamId, year, month],
    })
  }, [qc, selectedTeamId, year, month])

  const handleExportExcel = () => {
    import('xlsx')
      .then((XLSX) => {
        const wsData = [
          ['Nhân sự', 'KPI đạt', 'KPI chưa đạt', 'Loại KPI', 'OKR đạt', 'OKR chưa đạt', 'Loại OKR'],
          ...summaryRows.map(function (row) {
            return [
              row.assigneeDisplayName || row.assigneeEmail || 'Thành viên',
              row.kpiOkCount,
              row.kpiNotCount,
              row.kpiGrade ?? '',
              row.okrOkCount,
              row.okrNotCount,
              row.okrGrade ?? '',
            ]
          }),
        ]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'KPI-OKR')
        const deptName = selectedDept?.name || 'tat-ca'
        XLSX.writeFile(wb, `bao-cao-T${month}-${year}-${deptName}.xlsx`)
      })
      .catch(() => {
        alert('Không tải được thư viện xuất Excel. Kiểm tra kết nối và thử lại.')
      })
  }

  const okCount = assignmentsData.filter(
    (x) => (x.managerEvalStatus ?? '').trim().toUpperCase() === 'OK'
  ).length

  const teamMemberName = (userId: string) => {
    const row = membersQ.data?.members.find((m) => m.userId === userId)
    return row?.displayName?.trim() || row?.email?.trim() || 'Thành viên'
  }

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-6 md:px-4">
      {/* ── Page header: title + actions ── */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[1.75rem]">
            Báo cáo{' '}
            <span className="text-indigo-600 dark:text-indigo-400">
              T{month}/{year}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {canSeeTeamWide
              ? `${selectedDept?.name ?? 'Tất cả phòng ban'} · ${assignmentsData.length} mục tiêu · ${summaryRows.length} nhân sự`
              : 'Theo dõi tiến độ KPI/OKR cá nhân'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={() => {
              void treeQ.refetch()
              void qc.invalidateQueries({ queryKey: ORG_TREE_KEY })
              void membersQ.refetch()
              void summariesQ.refetch()
              void assignmentsQ.refetch()
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Làm mới
          </Button>
          {canSeeTeamWide && summaryRows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={handleExportExcel}
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </Button>
          )}
        </div>
      </div>

      {/* ── Control toolbar: filters + view switcher ── */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
        {/* Phòng ban */}
        <Select
          value={selectedDept?.id ?? '__none'}
          onValueChange={(value) => {
            const dept = departments.find((d) => d.id === value)
            setSelectedTeamId(dept?.teams[0]?.id ?? '')
          }}
        >
          <SelectTrigger className="h-8 w-[160px] rounded-lg border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-800 [&>span]:truncate [&>span]:whitespace-nowrap">
            <SelectValue placeholder="Phòng ban" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Tất cả</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Nhóm */}
        <Select
          value={selectedTeamId || '__none'}
          onValueChange={(value) => setSelectedTeamId(value === '__none' ? '' : value)}
        >
          <SelectTrigger className="h-8 w-[145px] rounded-lg border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-800 [&>span]:truncate [&>span]:whitespace-nowrap">
            <SelectValue placeholder="Nhóm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Tất cả</SelectItem>
            {teamsInDept.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

        {/* Tháng */}
        <Select
          value={String(month)}
          onValueChange={(value) => {
            const next = clampKpiPeriod(year, Number(value))
            setYear(next.year)
            setMonth(next.month)
          }}
        >
          <SelectTrigger className="h-8 w-[112px] rounded-lg border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)} disabled={!isKpiPeriodSelectable(year, m)}>
                Tháng {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Năm */}
        <Input
          type="number"
          value={year}
          min={2020}
          max={maxViewYm.year}
          className="h-8 w-[90px] rounded-lg border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-800"
          onChange={(e) => {
            const v = Number(e.target.value)
            if (!Number.isFinite(v)) return
            const next = clampKpiPeriod(v, month)
            setYear(next.year)
            setMonth(next.month)
          }}
        />

        {/* Tab switcher — flush right */}
        <div className="ml-auto flex rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          {(['kpi-okr', 'work-report'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all',
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              {tab === 'kpi-okr' ? 'KPI/OKR' : 'Tổng kết'}
            </button>
          ))}
        </div>
      </div>

      {/* Work report tab */}
      {activeTab === 'work-report' && (
        <WorkReportTab
          selectedTeamId={selectedTeamId}
          year={year}
          month={month}
          canSeeTeamWide={canSeeTeamWide}
        />
      )}

      {activeTab === 'kpi-okr' && (
        <>
          {/* ── Modern SaaS metric cards (Linear-style) ── */}
          {canSeeTeamWide && selectedDept?.id && hrCounters && (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: 'Lên cấp',
                  value: hrCounters.promoted,
                  color: 'emerald',
                  Icon: TrendingUp,
                },
                {
                  label: 'Chưa học xong',
                  value: hrCounters.notLearned,
                  color: 'amber',
                  Icon: Calendar,
                },
                { label: 'Mới vào', value: hrCounters.newJoiners, color: 'blue', Icon: Users },
                { label: 'Nghỉ việc', value: hrCounters.leavers, color: 'rose', Icon: UserRound },
              ].map(({ label, value, color, Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      color === 'emerald' &&
                        'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                      color === 'amber' &&
                        'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                      color === 'blue' &&
                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                      color === 'rose' &&
                        'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {value}
                    </div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── KPI Summary: collapsible table (Linear-style expand/collapse) ── */}
          {!selectedTeamId ? (
            <Card className="border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/50">
              <CardContent className="py-10 text-center text-sm text-slate-500">
                Chọn nhóm để xem báo cáo.
              </CardContent>
            </Card>
          ) : membersQ.isLoading || summariesQ.isLoading || assignmentsQ.isLoading ? (
            <Card>
              <CardContent className="space-y-3 py-8">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-28 w-full" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary + Detail: single unified card, expandable sections */}
              <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
                {/* Section 1: KPI Summary — always visible, compact */}
                <button
                  type="button"
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Tổng hợp KPI/OKR
                      </h3>
                      <p className="text-xs text-slate-500">
                        {summaryRows.length} nhân sự · {okCount} mục đạt (OK) ·{' '}
                        {assignmentsData.length} mục tiêu
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">{summaryRows.length}</Badge>
                    {summaryExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>
                {summaryExpanded && summaryRows.length > 0 && (
                  <div className="border-t">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50/80 dark:bg-slate-800/50">
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-500">
                              Nhân sự
                            </th>
                            <th className="px-3 py-2.5 text-center font-semibold text-slate-500">
                              KPI đạt
                            </th>
                            <th className="px-3 py-2.5 text-center font-semibold text-slate-500">
                              KPI chưa
                            </th>
                            <th className="px-3 py-2.5 text-center font-semibold text-slate-500">
                              Loại
                            </th>
                            <th className="px-3 py-2.5 text-center font-semibold text-slate-500">
                              OKR đạt
                            </th>
                            <th className="px-3 py-2.5 text-center font-semibold text-slate-500">
                              OKR chưa
                            </th>
                            <th className="px-3 py-2.5 text-center font-semibold text-slate-500">
                              Loại
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaryRows.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                                {row.assigneeDisplayName?.trim() ||
                                  row.assigneeEmail?.trim() ||
                                  'Thành viên'}
                              </td>
                              <td className="px-3 py-2.5 text-center tabular-nums">
                                {row.kpiOkCount}
                              </td>
                              <td className="px-3 py-2.5 text-center tabular-nums">
                                {row.kpiNotCount}
                              </td>
                              <td className="px-3 py-2.5 text-center font-semibold">
                                {row.kpiGrade ?? '—'}
                              </td>
                              <td className="px-3 py-2.5 text-center tabular-nums">
                                {row.okrOkCount}
                              </td>
                              <td className="px-3 py-2.5 text-center tabular-nums">
                                {row.okrNotCount}
                              </td>
                              <td className="px-3 py-2.5 text-center font-semibold">
                                {row.okrGrade ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {fixedMetricsProgress.length > 0 && (
                      <div className="border-t px-4 py-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Chỉ số cố định
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {fixedMetricsProgress.map(({ content, filled, total, sum }) => (
                            <div
                              key={content}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
                            >
                              <span
                                className="truncate text-xs text-slate-600 dark:text-slate-400"
                                title={content}
                              >
                                {content}
                              </span>
                              <span className="ml-2 shrink-0 text-xs tabular-nums text-slate-500">
                                {sum > 0 ? sum.toLocaleString('vi-VN') : '—'} · {filled}/{total}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {summaryExpanded && summaryRows.length === 0 && (
                  <div className="border-t px-4 py-6 text-center text-xs text-slate-400">
                    Chưa có dữ liệu tổng hợp. Trưởng nhóm tính lại ở màn KPI & OKR.
                  </div>
                )}
              </Card>

              {/* Section 2: Detail — collapsible */}
              <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDetailExpanded(!detailExpanded)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Chi tiết mục tiêu
                      </h3>
                      {selectedDetailUserId && (
                        <p className="text-xs text-slate-500">
                          {teamMemberName(selectedDetailUserId)} · {detailRows.length} mục tiêu
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">{detailRows.length}</Badge>
                    {detailExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {detailExpanded && (
                  <>
                    {/* Member selector tabs — clean horizontal tabs, not pills */}
                    {canSeeTeamWide && (
                      <div className="border-t">
                        <div className="flex overflow-x-auto gap-0 border-b border-slate-200 dark:border-slate-800">
                          {Array.from(assignmentsByUser.keys()).map((uid) => (
                            <button
                              key={uid}
                              type="button"
                              onClick={() => setSelectedUserId(uid)}
                              className={cn(
                                'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                                uid === selectedDetailUserId
                                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
                              )}
                            >
                              {teamMemberName(uid)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {detailRows.length === 0 ? (
                      <div className="border-t px-4 py-6 text-center text-xs text-slate-400">
                        Không có mục tiêu KPI/OKR trong kỳ này.
                      </div>
                    ) : (
                      <div>
                        {/* Mobile: card stack */}
                        <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
                          {detailRows.map((item) =>
                            allowEpic4SelfEdit ? (
                              <MonthlyReportDetailEditableMobileCard
                                key={item.id}
                                item={item}
                                onSaved={invalidateMonthlyAssignments}
                              />
                            ) : (
                              <MonthlyReportDetailReadOnlyCard key={item.id} item={item} />
                            )
                          )}
                        </div>
                        {/* Desktop: expandable row table — no horizontal scroll */}
                        <div className="hidden md:block">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                                <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-500">
                                  Ngày xét
                                </th>
                                <th className="px-3 py-3 text-left font-semibold text-slate-500">
                                  Hạng mục
                                </th>
                                <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-500">
                                  Ưu tiên
                                </th>
                                <th className="px-3 py-3 text-left font-semibold text-slate-500">
                                  Nội dung
                                </th>
                                <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-500">
                                  Chỉ tiêu
                                </th>
                                <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-500">
                                  Kết quả
                                </th>
                                <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-500">
                                  Tự ĐG
                                </th>
                                <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-500">
                                  QL ĐG
                                </th>
                                <th className="px-3 py-3 text-right font-semibold text-slate-500"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailRows.map((item) =>
                                allowEpic4SelfEdit ? (
                                  <MonthlyReportMemberExpandableRow
                                    key={item.id}
                                    item={item}
                                    onSaved={invalidateMonthlyAssignments}
                                    colCount={9}
                                  />
                                ) : (
                                  <MonthlyReportReadOnlyExpandableRow
                                    key={item.id}
                                    item={item}
                                    colCount={9}
                                  />
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Card>

              <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {canSeeTeamWide ? 'Phản hồi từ nhân sự' : 'Form khảo sát tháng này'}
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    {canSeeTeamWide
                      ? 'Danh sách câu trả lời của từng nhân sự trong nhóm theo kỳ đã chọn.'
                      : 'Trả lời câu hỏi khảo sát hàng tháng do trưởng nhóm thiết lập.'}
                  </p>
                </CardHeader>
                <CardContent>
                  <FormPanel
                    teamId={selectedTeamId}
                    year={year}
                    month={month}
                    canEditTeam={false}
                    currentUserId={userId ?? ''}
                    readOnly={canSeeTeamWide}
                    showQuestionForm={!canSeeTeamWide}
                  />
                </CardContent>
              </Card>

              <div className="flex items-start gap-2 rounded-xl border border-dashed border-game-accent/25 bg-game-accent/[0.05] p-3 text-xs text-game-muted">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-game-accent" strokeWidth={2} />
                <span>
                  Quyền xem báo cáo hàng tháng.
                  {isLeader ? (
                    <> Trưởng nhóm có thể điều phối dữ liệu báo cáo ở màn KPI/OKR nhóm.</>
                  ) : null}
                  {isManager ? (
                    <>
                      {' '}
                      Quản lý chỉ xem dữ liệu tổng hợp, chi tiết mục tiêu và phản hồi khảo sát của
                      nhóm.
                    </>
                  ) : null}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
