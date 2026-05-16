import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Calendar, Download, RefreshCw, UserRound } from 'lucide-react'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
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
import { CARD_ENTRANCE } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import { performanceApi, type PerformanceAssignment } from '@/features/kpi-okr/api'
import {
  clampKpiPeriod,
  getMaxViewableYm,
  isKpiPeriodSelectable,
} from '@/features/kpi-okr/kpiPeriodLimits'
import {
  isMandatoryMetric,
  isTrafficTeam,
  MANDATORY_METRICS_BY_TEMPLATE,
} from '@/features/kpi-okr/catalogHelpers'
import { FormPanel } from '@/features/kpi-okr/components/KpiOkrWorkspace'
import { useHrOrgTree, ORG_TREE_KEY } from '@/features/hr-admin/useHrOrgTree'
import { organizationApi } from '@/features/organization/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useAuthStore } from '@/stores/auth.store'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import {
  EvidenceImagePreviews,
  KpiEvidenceInput,
} from '@/features/kpi-okr/components/KpiEvidenceInput'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
        'h-5 px-1.5 text-[10px] font-bold shadow-none rounded-md',
        isOk
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
      )}
    >
      {v}
    </Badge>
  )
}

function MonthlyReportEpic4ReadCells({ item }: { item: PerformanceAssignment }) {
  const num =
    item.numericValue !== undefined && item.numericValue !== null ? String(item.numericValue) : '—'
  const ev = item.evidence?.trim()
  return (
    <>
      <TableCell className="whitespace-nowrap tabular-nums text-[13px]">{num}</TableCell>
      <TableCell className="text-[11px] uppercase text-slate-600">
        {item.numericUnit ?? '—'}
      </TableCell>
      <TableCell className="max-w-[180px] text-[12px]" title={ev ?? ''}>
        {ev ? (
          <span className="line-clamp-3 whitespace-pre-wrap break-all">{ev}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
        <EvidenceImagePreviews evidence={item.evidence} maxHeightClass="h-12 max-w-[88px]" />
      </TableCell>
      <TableCell>
        <EvalBadge status={item.selfEvalStatus} />
      </TableCell>
      <TableCell className="max-w-[200px] text-[12px] text-slate-600">
        {item.selfReviewNote?.trim() ? (
          <span className="line-clamp-2 italic">{item.selfReviewNote.trim()}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </TableCell>
    </>
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
    'h-8 min-w-[72px] rounded-md border border-slate-200 bg-white px-2 text-[12px] dark:border-slate-700 dark:bg-slate-950'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Số liệu</Label>
          <Input
            value={numericRaw}
            onChange={(e) => setNumericRaw(e.target.value)}
            className={inputCls}
            placeholder="—"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Đơn vị</Label>
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
        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Minh chứng</Label>
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
        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tự nhận xét</Label>
        <Textarea
          value={selfReviewNote}
          onChange={(e) => setSelfReviewNote(e.target.value)}
          rows={2}
          disabled={disabled}
          className="min-h-[52px] resize-y rounded-md border border-slate-200 bg-white p-2 text-[12px] dark:border-slate-700 dark:bg-slate-950"
          placeholder="Tự nhận xét"
        />
      </div>
    </div>
  )
}

function useMonthlyReportSelfEdit(item: PerformanceAssignment, onSaved: () => void) {
  const [evidence, setEvidence] = useState(item.evidence ?? '')
  const [numericRaw, setNumericRaw] = useState(
    item.numericValue != null ? String(item.numericValue) : ''
  )
  const [numericUnit, setNumericUnit] = useState(item.numericUnit ?? '')
  const [selfEvalStatus, setSelfEvalStatus] = useState(item.selfEvalStatus ?? '')
  const [selfReviewNote, setSelfReviewNote] = useState(item.selfReviewNote ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEvidence(item.evidence ?? '')
    setNumericRaw(item.numericValue != null ? String(item.numericValue) : '')
    setNumericUnit(item.numericUnit ?? '')
    setSelfEvalStatus(item.selfEvalStatus ?? '')
    setSelfReviewNote(item.selfReviewNote ?? '')
  }, [
    item.id,
    item.evidence,
    item.numericValue,
    item.numericUnit,
    item.selfEvalStatus,
    item.selfReviewNote,
  ])

  const save = async () => {
    const nTrim = numericRaw.trim()
    let numericValue: number | null = null
    if (nTrim.length > 0) {
      const n = Number(nTrim.replace(',', '.'))
      if (!Number.isFinite(n)) {
        toast.error('Số liệu không hợp lệ.')
        return
      }
      numericValue = n
    }
    if (item.status === 'done' && !evidence.trim()) {
      toast.warning('Trạng thái Hoàn thành nhưng minh chứng đang trống.')
    }
    setSaving(true)
    try {
      await performanceApi.patchAssignmentSelf(item.id, {
        evidence: evidence.trim() ? evidence.trim() : null,
        numericValue,
        numericUnit: numericUnit.trim() ? numericUnit.trim().toUpperCase() : null,
        selfEvalStatus: selfEvalStatus.trim() ? selfEvalStatus.trim() : null,
        selfReviewNote: selfReviewNote.trim() ? selfReviewNote.trim() : null,
      })
      toast.success('Đã lưu.')
      onSaved()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return {
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
  }
}

/** Epic 4 — ô nhập (member); nút Lưu đặt sau cột QL (parent render). */
function MonthlyReportEpic4EditableCells({
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
    'h-8 min-w-[72px] rounded-md border border-slate-200 bg-white px-2 text-[12px] dark:border-slate-700 dark:bg-slate-950'

  return (
    <>
      <TableCell className="align-top p-2">
        <Input
          value={numericRaw}
          onChange={(e) => setNumericRaw(e.target.value)}
          className={inputCls}
          placeholder="—"
          disabled={disabled}
        />
      </TableCell>
      <TableCell className="align-top p-2">
        <Input
          value={numericUnit}
          onChange={(e) => setNumericUnit(e.target.value)}
          className={inputCls}
          placeholder="Đơn vị"
          disabled={disabled}
        />
      </TableCell>
      <TableCell className="max-w-[220px] align-top p-2">
        <KpiEvidenceInput value={evidence} onChange={setEvidence} disabled={disabled} />
      </TableCell>
      <TableCell className="align-top p-2">
        <CustomSelect
          value={selfEvalStatus || '__none'}
          onValueChange={(v) => setSelfEvalStatus(v === '__none' ? '' : v)}
          options={[
            { label: '—', value: '__none' },
            { label: 'OK', value: 'OK' },
            { label: 'NOT', value: 'NOT' },
          ]}
          disabled={disabled}
        />
      </TableCell>
      <TableCell className="max-w-[200px] align-top p-2">
        <Textarea
          value={selfReviewNote}
          onChange={(e) => setSelfReviewNote(e.target.value)}
          rows={2}
          disabled={disabled}
          className="min-h-[52px] resize-y rounded-md border border-slate-200 bg-white p-2 text-[12px] dark:border-slate-700 dark:bg-slate-950"
          placeholder="Tự nhận xét"
        />
      </TableCell>
    </>
  )
}

function MonthlyReportMemberEditableRow({
  item,
  onSaved,
}: {
  item: PerformanceAssignment
  onSaved: () => void
}) {
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

  return (
    <>
      <MonthlyReportEpic4EditableCells
        evidence={evidence}
        setEvidence={setEvidence}
        numericRaw={numericRaw}
        setNumericRaw={setNumericRaw}
        numericUnit={numericUnit}
        setNumericUnit={setNumericUnit}
        selfEvalStatus={selfEvalStatus}
        setSelfEvalStatus={setSelfEvalStatus}
        selfReviewNote={selfReviewNote}
        setSelfReviewNote={setSelfReviewNote}
        disabled={saving}
      />
      <TableCell>
        <EvalBadge status={item.managerEvalStatus} />
      </TableCell>
      <TableCell className="max-w-[280px] text-[12px] italic text-slate-500">
        {item.managerReviewNote?.trim() || '—'}
      </TableCell>
      <TableCell className="align-top whitespace-nowrap p-2">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? '…' : 'Lưu'}
        </Button>
      </TableCell>
    </>
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
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Số liệu</span>
          <p className="tabular-nums">
            {item.numericValue !== undefined && item.numericValue !== null
              ? String(item.numericValue)
              : '—'}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Đơn vị</span>
          <p className="text-[11px] uppercase text-slate-600">{item.numericUnit ?? '—'}</p>
        </div>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Minh chứng</span>
        {item.evidence?.trim() ? (
          <p className="break-all text-xs">{item.evidence.trim()}</p>
        ) : (
          <span className="text-slate-400">—</span>
        )}
        <EvidenceImagePreviews evidence={item.evidence} maxHeightClass="h-16 max-w-full" />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Tự đánh giá</span>
        <div className="mt-1">
          <EvalBadge status={item.selfEvalStatus} />
        </div>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Tự nhận xét</span>
        <p className="text-xs text-slate-600">
          {item.selfReviewNote?.trim() ? (
            <span className="italic">{item.selfReviewNote.trim()}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </p>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase text-muted-foreground">QL đánh giá</span>
        <div className="mt-1">
          <EvalBadge status={item.managerEvalStatus} />
        </div>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase text-muted-foreground">QL nhận xét</span>
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
        <span className="text-[10px] font-bold uppercase text-muted-foreground">QL đánh giá</span>
        <div className="mt-1">
          <EvalBadge status={item.managerEvalStatus} />
        </div>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase text-muted-foreground">QL nhận xét</span>
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
  const detailSectionRef = useRef<HTMLDivElement>(null)

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
    <div className="relative isolate mx-auto max-w-[1400px] px-3 py-6 md:px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl"
      >
        <div className="absolute -left-20 -top-14 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl motion-safe:animate-[dash-glow-orb_9s_ease-in-out_infinite] motion-reduce:animate-none" />
        <div className="absolute -right-20 top-20 h-80 w-80 rounded-full bg-cyan-500/18 blur-3xl motion-safe:animate-[dash-glow-orb_12s_ease-in-out_infinite_1s] motion-reduce:animate-none" />
        <div className="absolute bottom-8 left-1/3 h-60 w-60 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl motion-safe:animate-[dash-glow-orb_14s_ease-in-out_infinite_0.2s] motion-reduce:animate-none" />
      </div>
      <div
        className={cn(
          'mb-6 border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-card to-violet-500/[0.06] shadow-[var(--shadow-card)]',
          PAGE_HEADER_SURFACE
        )}
      >
        <h1 className={PAGE_HEADER_TITLE}>
          <span className={PAGE_HEADER_GRADIENT}>
            {canSeeTeamWide ? 'Báo cáo hàng tháng (nhóm)' : 'Báo cáo hàng tháng'}
          </span>
        </h1>
        <p className={PAGE_HEADER_DESCRIPTION}>
          {isManager
            ? 'Tổng hợp KPI/OKR, chi tiết mục tiêu từng nhân sự và form khảo sát hàng tháng của nhóm đã chọn.'
            : isLeader
              ? 'Tổng hợp báo cáo theo tháng của các thành viên trong nhóm kèm danh sách phản hồi khảo sát.'
              : 'Theo dõi báo cáo tiến độ KPI/OKR và trả lời form khảo sát của trưởng nhóm theo từng tháng.'}
        </p>
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
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Phòng ban
                </Label>
                <Select
                  value={selectedDept?.id ?? '__none'}
                  onValueChange={(value) => {
                    const dept = departments.find((d) => d.id === value)
                    setSelectedTeamId(dept?.teams[0]?.id ?? '')
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
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Nhóm
                </Label>
                <Select
                  value={selectedTeamId || '__none'}
                  onValueChange={(value) => setSelectedTeamId(value === '__none' ? '' : value)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <SelectValue placeholder="Chọn nhóm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Chọn nhóm —</SelectItem>
                    {teamsInDept.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
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
                  void membersQ.refetch()
                  void summariesQ.refetch()
                  void assignmentsQ.refetch()
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
                  KỲ: T{month}/{year}
                </Badge>
                <Badge
                  variant="outline"
                  className="h-5 rounded-md border-cyan-100 bg-cyan-50 text-[10px] font-bold text-cyan-600 dark:border-cyan-900/30 dark:bg-cyan-900/20 dark:text-cyan-400"
                >
                  TỔNG MỤC TIÊU: {assignmentsData.length}
                </Badge>
                <Badge
                  variant="outline"
                  className="h-5 rounded-md border-emerald-100 bg-emerald-50 text-[10px] font-bold text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                >
                  ĐẠT (OK): {okCount}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab nav */}
      <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-slate-100/60 p-1 dark:border-slate-800 dark:bg-slate-900/60">
        <button
          type="button"
          onClick={() => setActiveTab('kpi-okr')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'kpi-okr'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          KPI / OKR
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('work-report')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'work-report'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          Báo cáo tổng kết
        </button>
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
          {/* HR Counters */}
          {canSeeTeamWide && selectedDept?.id && hrCounters && (
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{hrCounters.promoted}</div>
                  <div className="text-xs text-emerald-500">Lên cấp</div>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{hrCounters.notLearned}</div>
                  <div className="text-xs text-amber-500">Chưa hoàn thành học</div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{hrCounters.newJoiners}</div>
                  <div className="text-xs text-blue-500">Mới vào</div>
                </CardContent>
              </Card>
              <Card className="border-rose-200 bg-rose-50/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-rose-600">{hrCounters.leavers}</div>
                  <div className="text-xs text-rose-500">Nghỉ việc</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Export button */}
          {canSeeTeamWide && summaryRows.length > 0 && (
            <div className="mb-4 flex justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
                <Download className="h-4 w-4" />
                Xuất dữ liệu Excel
              </Button>
            </div>
          )}

          {isMockApiEnabled() ? (
            <div className="mb-4 flex items-center gap-2 text-game-soft-foreground">
              <BarChart3 className="h-4 w-4 text-amber-700" strokeWidth={2} />
              <span className="text-sm text-amber-800">
                Chế độ giả lập đang bật — báo cáo đầy đủ khi kết nối máy chủ thật.
              </span>
            </div>
          ) : null}

          {!selectedTeamId ? (
            <Card
              className={cn(
                'mt-6 border-dashed border-primary/25 bg-gradient-to-r from-muted/30 via-card to-violet-500/[0.05]',
                CARD_ENTRANCE
              )}
            >
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Chọn nhóm để tải báo cáo hàng tháng.
              </CardContent>
            </Card>
          ) : membersQ.isLoading || summariesQ.isLoading || assignmentsQ.isLoading ? (
            <Card
              className={cn(
                'mt-6 border border-blue-200/40 bg-gradient-to-r from-blue-50/80 via-card to-cyan-50/75',
                CARD_ENTRANCE
              )}
            >
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                  Đang tải dữ liệu báo cáo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-28 w-full" />
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 space-y-6">
              <Card
                className={cn(
                  'relative overflow-hidden border-amber-200/50 bg-gradient-to-br from-amber-50/70 via-card to-orange-50/70 shadow-lg shadow-amber-500/10',
                  CARD_ENTRANCE
                )}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400"
                />
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-amber-700 via-orange-700 to-rose-700 bg-clip-text text-xl md:text-2xl font-bold text-transparent">
                    Tổng hợp KPI/OKR tháng {month}/{year}
                  </CardTitle>
                </CardHeader>
                <CardContent className="min-w-0">
                  {summaryRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Chưa có dữ liệu tổng hợp cho kỳ đã chọn. Trưởng nhóm có thể tính lại tổng hợp
                      ở màn KPI & OKR.
                    </p>
                  ) : (
                    <>
                      <div className="divide-y divide-amber-200/50 md:hidden">
                        {summaryRows.map((row) => (
                          <div key={row.id} className="space-y-2 py-4 first:pt-0">
                            <p className="font-semibold text-foreground">
                              {row.assigneeDisplayName?.trim() ||
                                row.assigneeEmail?.trim() ||
                                'Thành viên'}
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                  KPI đạt
                                </span>
                                <p className="font-bold tabular-nums">{row.kpiOkCount}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                  KPI chưa đạt
                                </span>
                                <p className="font-bold tabular-nums">{row.kpiNotCount}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                  Loại KPI
                                </span>
                                <p className="font-semibold">{row.kpiGrade ?? '—'}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                  OKR đạt
                                </span>
                                <p className="font-bold tabular-nums">{row.okrOkCount}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                  OKR chưa đạt
                                </span>
                                <p className="font-bold tabular-nums">{row.okrNotCount}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                  Loại OKR
                                </span>
                                <p className="font-semibold">{row.okrGrade ?? '—'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="-mx-1 hidden overflow-x-auto px-1 md:block">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-amber-500/10">
                              <TableHead>Nhân sự</TableHead>
                              <TableHead>KPI đạt</TableHead>
                              <TableHead>KPI chưa đạt</TableHead>
                              <TableHead>Loại KPI</TableHead>
                              <TableHead>OKR đạt</TableHead>
                              <TableHead>OKR chưa đạt</TableHead>
                              <TableHead>Loại OKR</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summaryRows.map((row) => (
                              <TableRow
                                key={row.id}
                                className="transition-colors hover:bg-amber-500/5"
                              >
                                <TableCell>
                                  {row.assigneeDisplayName?.trim() ||
                                    row.assigneeEmail?.trim() ||
                                    'Thành viên'}
                                </TableCell>
                                <TableCell>{row.kpiOkCount}</TableCell>
                                <TableCell>{row.kpiNotCount}</TableCell>
                                <TableCell className="font-semibold">
                                  {row.kpiGrade ?? '—'}
                                </TableCell>
                                <TableCell>{row.okrOkCount}</TableCell>
                                <TableCell>{row.okrNotCount}</TableCell>
                                <TableCell className="font-semibold">
                                  {row.okrGrade ?? '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                  {fixedMetricsProgress.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Tổng hợp chỉ số cố định tháng này
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {fixedMetricsProgress.map(({ content, filled, total, sum }) => (
                          <div
                            key={content}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
                          >
                            <p
                              className="mb-1 truncate text-[11px] text-slate-500 dark:text-slate-400"
                              title={content}
                            >
                              {content}
                            </p>
                            <p className="text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                              {sum > 0
                                ? sum >= 1_000_000
                                  ? `${(sum / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`
                                  : sum.toLocaleString('vi-VN')
                                : '—'}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {filled}/{total} người đã nhập
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div ref={detailSectionRef}>
                <Card
                  className={cn(
                    'relative overflow-hidden border-blue-200/55 bg-gradient-to-br from-blue-50/70 via-card to-fuchsia-50/65 shadow-lg shadow-blue-500/10',
                    CARD_ENTRANCE
                  )}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500"
                  />
                  <CardHeader>
                    <CardTitle className="bg-gradient-to-r from-blue-700 via-indigo-700 to-fuchsia-700 bg-clip-text text-xl md:text-2xl font-bold text-transparent">
                      Chi tiết mục tiêu trong tháng
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {canSeeTeamWide ? (
                      <div className="flex flex-wrap gap-2">
                        {Array.from(assignmentsByUser.keys()).map((uid) => (
                          <Button
                            key={uid}
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
                              uid === selectedDetailUserId &&
                                'border-fuchsia-400 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white hover:from-fuchsia-700 hover:to-indigo-700'
                            )}
                            onClick={() => {
                              setSelectedUserId(uid)
                              setTimeout(() => {
                                detailSectionRef.current?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start',
                                })
                              }, 0)
                            }}
                          >
                            <UserRound className="mr-1 h-3.5 w-3.5" />
                            {teamMemberName(uid)}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    {detailRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Không có mục tiêu KPI/OKR trong kỳ này.
                      </p>
                    ) : (
                      <>
                        <p className="mb-3 text-[13px] text-muted-foreground">
                          {allowEpic4SelfEdit
                            ? 'Cập nhật số liệu, minh chứng và tự đánh giá; bấm Lưu từng dòng. Đánh giá của quản lý do trưởng nhóm cập nhật.'
                            : canSeeTeamWide
                              ? 'Theo dõi minh chứng, số liệu và tự đánh giá của nhân sự (chỉ xem).'
                              : 'Bạn xem minh chứng và tự đánh giá ở đây (chỉ xem). Để chỉnh sửa cần quyền cập nhật KPI của bản thân — có thể chỉnh thêm tại mục KPI & OKR trong workspace.'}
                        </p>
                        <div className="divide-y divide-blue-100/50 md:hidden dark:divide-blue-900/30">
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
                        <div className="hidden overflow-x-auto rounded-lg border border-blue-100/50 md:block dark:border-blue-900/30">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-blue-500/10">
                                <TableHead className="whitespace-nowrap">Ngày xét</TableHead>
                                <TableHead>Hạng mục</TableHead>
                                <TableHead className="whitespace-nowrap">Ưu tiên</TableHead>
                                <TableHead>Nội dung</TableHead>
                                <TableHead>Chỉ tiêu</TableHead>
                                <TableHead className="whitespace-nowrap">Số liệu</TableHead>
                                <TableHead className="whitespace-nowrap">Đơn vị</TableHead>
                                <TableHead className="min-w-[140px]">Minh chứng</TableHead>
                                <TableHead className="whitespace-nowrap">Tự đánh giá</TableHead>
                                <TableHead className="min-w-[120px]">Tự nhận xét</TableHead>
                                <TableHead className="whitespace-nowrap">QL đánh giá</TableHead>
                                <TableHead>QL nhận xét</TableHead>
                                <TableHead className="whitespace-nowrap text-right">
                                  Thao tác
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailRows.map((item) => (
                                <TableRow
                                  key={item.id}
                                  className="transition-colors hover:bg-blue-500/5"
                                >
                                  <TableCell className="whitespace-nowrap tabular-nums text-slate-500">
                                    {formatKpiSetAt(item.kpiSetAt)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      className={
                                        item.kind === 'KPI'
                                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                                          : 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white'
                                      }
                                    >
                                      {item.kind}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    <PriorityText priority={item.priority} />
                                  </TableCell>
                                  <TableCell className="max-w-[520px] whitespace-pre-wrap">
                                    {item.content}
                                  </TableCell>
                                  <TableCell className="tabular-nums font-semibold text-primary">
                                    {item.targetMetric?.trim() || '—'}
                                  </TableCell>
                                  {allowEpic4SelfEdit ? (
                                    <MonthlyReportMemberEditableRow
                                      item={item}
                                      onSaved={invalidateMonthlyAssignments}
                                    />
                                  ) : (
                                    <>
                                      <MonthlyReportEpic4ReadCells item={item} />
                                      <TableCell>
                                        <EvalBadge status={item.managerEvalStatus} />
                                      </TableCell>
                                      <TableCell className="max-w-[280px] text-[12px] italic text-slate-500">
                                        {item.managerReviewNote?.trim() || '—'}
                                      </TableCell>
                                      <TableCell className="text-center text-slate-400">
                                        —
                                      </TableCell>
                                    </>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card
                className={cn(
                  'relative overflow-hidden border-fuchsia-200/55 bg-gradient-to-br from-fuchsia-50/70 via-card to-violet-50/60 shadow-lg shadow-fuchsia-500/10',
                  CARD_ENTRANCE
                )}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500"
                />
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-fuchsia-700 via-violet-700 to-indigo-700 bg-clip-text text-xl md:text-2xl font-bold text-transparent">
                    {canSeeTeamWide ? 'Phản hồi từ nhân sự' : 'Form khảo sát tháng này'}
                  </CardTitle>
                  <p className="text-[13px] text-slate-500">
                    {canSeeTeamWide
                      ? 'Danh sách câu trả lời của từng nhân sự trong nhóm theo kỳ đã chọn.'
                      : 'Trả lời câu hỏi khảo sát hàng tháng do trưởng nhóm thiết lập. Bấm "Gửi câu trả lời" để lưu.'}
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
