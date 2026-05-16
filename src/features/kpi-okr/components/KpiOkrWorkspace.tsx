import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import {
  AlignLeft,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileUp,
  ListOrdered,
  ListPlus,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { CustomSelect } from '@/components/shared/CustomSelect'
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
  isAssignmentWindowOpen,
  getAssignmentWindowPhase,
  resolveAssignmentWindowForTeam,
} from '@/features/kpi-okr/kpiPeriodLimits'
import { KpiEvidenceInput } from '@/features/kpi-okr/components/KpiEvidenceInput'
import {
  ASSIGN_TABLE_HEAD,
  AssignmentEpic4ReadCells,
  AssignmentEpic4ReadStack,
  EvalStatusBadge,
  KindBadge,
  PriorityBadge,
  XL_TH,
  XL_BORDER,
  formatKpiSetAt,
  periodLabel,
  xlTd,
} from '@/features/kpi-okr/components/kpiAssignmentTableShared'
import {
  isCatalogEnabledDepartment,
  isMandatoryMetric,
  isTrafficTeam,
  MANDATORY_METRICS_BY_TEMPLATE,
  REMOVED_TRAFFIC_MANDATORY_METRICS,
  resolveTemplateCodeForTeam,
} from '@/features/kpi-okr/catalogHelpers'
import { LeaderKpiGuidance } from '@/features/kpi-okr/components/LeaderKpiGuidance'
import {
  parseKpiOkrImportFile,
  type ImportAssignmentItem,
} from '@/features/kpi-okr/kpiOkrSheetImport'
import { parseQuestionnaireImportFile } from '@/features/kpi-okr/questionnaireGridImport'
import { organizationApi, type TeamMemberRow } from '@/features/organization/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  variant: 'leader' | 'member' | 'manager'
  title: string
  description: string
}

export function KpiOkrWorkspace({ variant, title, description }: KpiOkrWorkspaceProps) {
  const user = useAuthStore((s) => s.user)
  const isMemberView = variant === 'member'
  const isManagerVariant = variant === 'manager'
  const isManagerReadOnly = user?.role === 'MANAGER' && !isManagerVariant
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
    if (variant === 'manager') return eff.has('kpi.team_edit')
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

  const windowConfigsQ = useQuery({
    queryKey: ['performance', 'window-configs'],
    queryFn: () => performanceApi.listWindowConfigs(),
    staleTime: 60_000,
    enabled: !isMockApiEnabled(),
  })

  const catalogAllowlistQ = useQuery({
    queryKey: ['performance', 'catalog-division-allowlist'],
    queryFn: () => performanceApi.getCatalogDivisionAllowlist(),
    staleTime: 60_000,
    enabled: !isMockApiEnabled(),
  })

  const assignmentWindowBounds = useMemo(
    () =>
      selectedTeamId
        ? resolveAssignmentWindowForTeam(selectedTeamId, year, month, windowConfigsQ.data ?? [])
        : { startDay: 1, endDay: 2 },
    [selectedTeamId, year, month, windowConfigsQ.data]
  )

  const assignmentWindowPhase = useMemo(() => {
    if (!selectedTeamId) return null
    return getAssignmentWindowPhase(year, month, {
      startDay: assignmentWindowBounds.startDay,
      endDay: assignmentWindowBounds.endDay,
    })
  }, [selectedTeamId, year, month, assignmentWindowBounds])

  const assignmentWindowOpen = useMemo(
    () =>
      Boolean(selectedTeamId) &&
      isAssignmentWindowOpen(year, month, {
        startDay: assignmentWindowBounds.startDay,
        endDay: assignmentWindowBounds.endDay,
      }),
    [selectedTeamId, year, month, assignmentWindowBounds]
  )

  // Epic 4 — PATCH .../me; áp dụng mục tiêu tháng này và kết quả tháng trước
  const canMemberEditSelfResults = useMemo(
    () => Boolean(user?.id) && eff.has('kpi.edit_own') && !isMockApiEnabled(),
    [user?.id, eff]
  )

  const isKinhDoanhTeam = Boolean(
    selectedDept &&
    isCatalogEnabledDepartment(selectedDept, catalogAllowlistQ.data?.mergedDivisionIds ?? null)
  )

  const selectedTeamForSeed = useMemo(() => {
    if (!selectedTeamId) return null
    for (const d of departments) {
      const t = d.teams.find((x) => x.id === selectedTeamId)
      if (t) return { id: t.id, name: t.name }
    }
    return null
  }, [departments, selectedTeamId])

  const isTrafficTeamSelected = isTrafficTeam(
    selectedTeamId,
    catalogAllowlistQ.data?.trafficTeamIds ?? null,
    selectedTeamForSeed?.name ?? null
  )

  const selectedTemplateCode = useMemo(() => {
    if (isTrafficTeamSelected) return 'TRAFFIC_TEAM_NV'
    if (selectedTeamForSeed) return resolveTemplateCodeForTeam(selectedTeamForSeed)
    return 'SALES_NV'
  }, [isTrafficTeamSelected, selectedTeamForSeed])

  const mandatoryList = useMemo(
    () => MANDATORY_METRICS_BY_TEMPLATE[selectedTemplateCode] ?? [],
    [selectedTemplateCode]
  )

  const periodKey = `${selectedTeamId}|${year}|${month}`
  const autoSeedDoneRef = useRef<Set<string>>(new Set())
  const cleanupDoneRef = useRef<Set<string>>(new Set())
  const templateSeedDoneRef = useRef<Set<string>>(new Set())

  // Template chỉ số tùy chỉnh do manager cấu hình — dùng để auto-seed tháng mới
  const templateQ = useQuery({
    queryKey: ['team-metric-templates', selectedTeamId],
    queryFn: () => performanceApi.listTeamMetricTemplates(selectedTeamId!),
    enabled: !!selectedTeamId && !isMockApiEnabled() && !!canEditTeam,
    staleTime: 60_000,
  })

  const assignmentsThisMonth = assignmentsQ.data ?? []
  const loadingThis = assignmentsQ.isLoading

  // Seed mandatory metrics if missing
  useEffect(() => {
    if (
      !selectedTeamId ||
      loadingThis ||
      !canEditTeam ||
      isMockApiEnabled() ||
      !(isKinhDoanhTeam || isTrafficTeamSelected) ||
      !mandatoryList.length ||
      autoSeedDoneRef.current.has(periodKey)
    )
      return

    const presentContents = new Set(assignmentsThisMonth.map((a) => a.content))
    const missing = mandatoryList.filter((m) => !presentContents.has(m))
    if (!missing.length) return

    autoSeedDoneRef.current.add(periodKey)
    void Promise.all(
      missing.map((content) =>
        performanceApi.cascadeAddAssignment(selectedTeamId, {
          year,
          month,
          content,
          kind: 'KPI',
          priority: 1,
          category: 'KPI_BONUS',
        })
      )
    )
      .then(() => {
        void qc.invalidateQueries({ queryKey: assignKey })
      })
      .catch((err: unknown) => {
        autoSeedDoneRef.current.delete(periodKey)
        toast.error('Không thể khởi tạo chỉ số cố định: ' + getApiErrorMessage(err))
      })
  }, [
    selectedTeamId,
    year,
    month,
    loadingThis,
    assignmentsThisMonth,
    mandatoryList,
    isKinhDoanhTeam,
    isTrafficTeamSelected,
    canEditTeam,
    periodKey,
    qc,
    assignKey,
  ])

  // Cleanup removed mandatory metrics
  useEffect(() => {
    if (
      !selectedTeamId ||
      loadingThis ||
      !canEditTeam ||
      isMockApiEnabled() ||
      !isTrafficTeamSelected ||
      cleanupDoneRef.current.has(periodKey)
    )
      return

    const presentContents = new Set(assignmentsThisMonth.map((a) => a.content))
    const toRemove = (REMOVED_TRAFFIC_MANDATORY_METRICS as readonly string[]).filter((m) =>
      presentContents.has(m)
    )
    if (!toRemove.length) return

    cleanupDoneRef.current.add(periodKey)
    void Promise.all(
      toRemove.map((content) =>
        performanceApi.cascadeDeleteByContent(selectedTeamId, { year, month, content })
      )
    )
      .then(() => {
        void qc.invalidateQueries({ queryKey: assignKey })
      })
      .catch(() => {
        cleanupDoneRef.current.delete(periodKey)
      })
  }, [
    selectedTeamId,
    year,
    month,
    loadingThis,
    assignmentsThisMonth,
    isTrafficTeamSelected,
    canEditTeam,
    periodKey,
    qc,
    assignKey,
  ])

  // Seed template metrics (custom metrics configured by manager) for any team type
  useEffect(() => {
    const templates = templateQ.data ?? []
    if (
      !selectedTeamId ||
      loadingThis ||
      !canEditTeam ||
      isMockApiEnabled() ||
      templateQ.isLoading ||
      !templates.length ||
      templateSeedDoneRef.current.has(periodKey)
    )
      return

    const presentContents = new Set(assignmentsThisMonth.map((a) => a.content))
    const missing = templates.filter((t) => !presentContents.has(t.content))
    if (!missing.length) return

    templateSeedDoneRef.current.add(periodKey)
    void Promise.all(
      missing.map((tmpl) =>
        performanceApi.cascadeAddAssignment(selectedTeamId, {
          year,
          month,
          content: tmpl.content,
          kind: tmpl.kind as 'KPI' | 'OKR',
          priority: tmpl.priority,
          category: tmpl.category,
          targetMetric: tmpl.targetMetric,
          numericUnit: tmpl.numericUnit,
        })
      )
    )
      .then(() => void qc.invalidateQueries({ queryKey: assignKey }))
      .catch(() => {
        templateSeedDoneRef.current.delete(periodKey)
      })
  }, [
    selectedTeamId,
    year,
    month,
    loadingThis,
    templateQ.isLoading,
    templateQ.data,
    assignmentsThisMonth,
    canEditTeam,
    periodKey,
    qc,
    assignKey,
  ])

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
          'mb-8 border-none bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-5 text-white shadow-2xl rounded-3xl relative overflow-hidden sm:px-6 sm:py-6 md:p-8',
          SECTION_FADE_UP
        )}
      >
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 [mask-image:linear-gradient(to_left,white,transparent)]" />
        <div className="relative z-10 min-w-0">
          <h1 className="text-2xl font-black tracking-tight mb-2 sm:text-3xl md:text-4xl">
            {title}
          </h1>
          <p className="text-blue-50/80 max-w-2xl text-sm font-medium sm:text-base">
            {description}
          </p>
        </div>
      </div>

      <Card
        className={cn(
          'mb-8 border-slate-200 bg-white/50 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/50',
          CARD_ENTRANCE
        )}
        style={{ animationDelay: '50ms' }}
      >
        <CardContent className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {!isManagerReadOnly && !isManagerVariant && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
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
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nhóm
                </Label>
                <Select
                  value={selectedTeamId || '__none'}
                  disabled={isMemberView}
                  onValueChange={(value) => setSelectedTeamId(value === '__none' ? '' : value)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <SelectValue placeholder="Chọn nhóm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Chọn nhóm —</SelectItem>
                    {(isManagerReadOnly || isManagerVariant ? allTeamsFlat : teamsInDept).map(
                      (t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {(isManagerReadOnly || isManagerVariant) &&
                          'deptName' in t &&
                          t.deptName ? (
                            <span className="ml-1 text-xs text-slate-400">· {t.deptName}</span>
                          ) : null}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
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
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
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
                  className="h-5 rounded-md border-blue-100 bg-blue-50 text-xs font-bold text-blue-600 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  KỲ CHỌN: T{month}/{year}
                </Badge>
                <Badge
                  variant="outline"
                  className="h-5 rounded-md border-fuchsia-100 bg-fuchsia-50 text-xs font-bold text-fuchsia-600 dark:border-fuchsia-900/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-400"
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
          Đang bật chế độ giả lập — không tải được dữ liệu KPI từ máy chủ. Tắt giả lập để dùng đầy
          đủ.
        </p>
      )}

      {canEditTeam && selectedTeamId && !assignmentWindowOpen && !mockHint && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {assignmentWindowPhase === 'before'
                ? 'Cửa sổ giao mục tiêu chưa mở'
                : 'Cửa sổ giao mục tiêu đã đóng'}
            </p>
            <p className="mt-1 text-sm opacity-90">
              {assignmentWindowPhase === 'before' ? (
                <>
                  Kỳ{' '}
                  <strong>
                    T{month}/{year}
                  </strong>{' '}
                  cho phép giao KPI/OKR từ ngày {assignmentWindowBounds.startDay} đến ngày{' '}
                  {assignmentWindowBounds.endDay}. Hiện chưa đến khoảng thời gian này. HR có thể
                  điều chỉnh qua cấu hình cửa sổ trên backend.
                </>
              ) : (
                <>
                  Kỳ{' '}
                  <strong>
                    T{month}/{year}
                  </strong>{' '}
                  chỉ cho phép giao KPI/OKR từ ngày {assignmentWindowBounds.startDay} đến ngày{' '}
                  {assignmentWindowBounds.endDay}. Khoảng thời gian đã kết thúc. HR có thể điều
                  chỉnh qua cấu hình cửa sổ trên backend.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {(isKinhDoanhTeam || isTrafficTeamSelected) && (
        <div className="mb-4">
          <LeaderKpiGuidance variant={isTrafficTeamSelected ? 'TRAFFIC' : 'KINH_DOANH'} />
        </div>
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
          assignmentWindowOpen={assignmentWindowOpen}
          assignmentWindowBounds={assignmentWindowBounds}
          canMemberEditSelfResults={canMemberEditSelfResults}
          templateCode={selectedTemplateCode}
          isManagerCascade={isManagerVariant}
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

function nameForMember(members: TeamMemberRow[], userId: string): string {
  const m = members.find((x) => x.userId === userId)
  const name = m?.displayName?.trim()
  if (name) return name
  return 'chưa có tên'
}

function memberMetaForDisplay(members: TeamMemberRow[], userId: string): string {
  const m = members.find((x) => x.userId === userId)
  const email = m?.email?.trim()
  if (email) return email
  return ''
}

const XL_INPUT = cn(
  'box-border h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10',
  'placeholder:text-slate-400'
)
const XL_TEXTAREA = cn(
  'box-border min-h-[80px] w-full min-w-[200px] max-w-[420px] resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10',
  'placeholder:text-slate-400'
)

function useMemberSelfAssignmentEdit(row: PerformanceAssignment, onSaved: () => void) {
  const [evidence, setEvidence] = useState(row.evidence ?? '')
  const [numericRaw, setNumericRaw] = useState(
    row.numericValue != null ? String(row.numericValue) : ''
  )
  const [numericUnit, setNumericUnit] = useState(row.numericUnit ?? '')
  const [selfEvalStatus, setSelfEvalStatus] = useState(row.selfEvalStatus ?? '')
  const [selfReviewNote, setSelfReviewNote] = useState(row.selfReviewNote ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEvidence(row.evidence ?? '')
    setNumericRaw(row.numericValue != null ? String(row.numericValue) : '')
    setNumericUnit(row.numericUnit ?? '')
    setSelfEvalStatus(row.selfEvalStatus ?? '')
    setSelfReviewNote(row.selfReviewNote ?? '')
  }, [
    row.id,
    row.evidence,
    row.numericValue,
    row.numericUnit,
    row.selfEvalStatus,
    row.selfReviewNote,
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
    if (isMandatoryMetric(row.content) && numericValue === null) {
      toast.error(`"${row.content}" là chỉ số bắt buộc — vui lòng nhập Số liệu trước khi lưu.`)
      return
    }
    if (row.status === 'done' && !evidence.trim()) {
      toast.warning('Trạng thái Hoàn thành nhưng Evidence đang trống.')
    }
    setSaving(true)
    try {
      await performanceApi.patchAssignmentSelf(row.id, {
        evidence: evidence.trim() ? evidence.trim() : null,
        numericValue,
        numericUnit: numericUnit.trim() ? numericUnit.trim().toUpperCase() : null,
        selfEvalStatus: selfEvalStatus.trim() ? selfEvalStatus.trim() : null,
        selfReviewNote: selfReviewNote.trim() ? selfReviewNote.trim() : null,
      })
      toast.success('Đã lưu.')
      onSaved()
    } catch {
      toast.error('Không lưu được. Kiểm tra quyền hoặc thử lại.')
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

function MemberSelfAssignmentRow({
  row,
  rowStripe,
  onSaved,
}: {
  row: PerformanceAssignment
  rowStripe: boolean
  onSaved: () => void
}) {
  const isMandatory = isMandatoryMetric(row.content)
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
  } = useMemberSelfAssignmentEdit(row, onSaved)

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
        className={cn(td, 'min-w-[240px] max-w-xl font-medium text-slate-900 dark:text-slate-100')}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {row.content}
          {row.category === 'VINH_DANH' && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              🏆 Vinh danh
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className={cn(td, 'tabular-nums font-semibold text-primary')}>
        {row.targetMetric || '—'}
      </TableCell>
      <TableCell className={cn(td, 'p-2 align-middle')}>
        <div className="relative">
          <Input
            value={numericRaw}
            onChange={(e) => setNumericRaw(e.target.value)}
            className={cn(
              XL_INPUT,
              isMandatory &&
                !numericRaw.trim() &&
                'border-destructive ring-1 ring-destructive/30 focus:ring-destructive/40'
            )}
            placeholder={isMandatory ? 'Bắt buộc nhập' : '—'}
            aria-required={isMandatory}
          />
          {isMandatory && (
            <span
              className="pointer-events-none absolute -right-1 -top-1 text-xs font-bold text-destructive"
              title="Chỉ số bắt buộc nhập"
            >
              *
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className={cn(td, 'p-2 align-middle')}>
        <Input
          value={numericUnit}
          onChange={(e) => setNumericUnit(e.target.value)}
          className={XL_INPUT}
          placeholder="VND"
        />
      </TableCell>
      <TableCell className={cn(td, 'min-w-[220px] max-w-[320px] p-2 align-top')}>
        <KpiEvidenceInput value={evidence} onChange={setEvidence} disabled={saving} />
      </TableCell>
      <TableCell className={cn(td, 'p-2 align-middle')}>
        <CustomSelect
          value={selfEvalStatus || '__none'}
          onValueChange={(v) => setSelfEvalStatus(v === '__none' ? '' : v)}
          options={[
            { label: '—', value: '__none' },
            { label: 'OK', value: 'OK' },
            { label: 'NOT', value: 'NOT' },
          ]}
        />
        <textarea
          value={selfReviewNote}
          onChange={(e) => setSelfReviewNote(e.target.value)}
          rows={2}
          className={cn(XL_TEXTAREA, 'mt-1 min-h-[52px]')}
          placeholder="Nhận xét"
        />
      </TableCell>
      <TableCell className={td}>
        <div className="flex flex-col gap-1">
          <EvalStatusBadge status={row.managerEvalStatus} />
          {row.managerReviewNote && (
            <div
              className="text-xs text-slate-500 italic max-w-[150px] truncate"
              title={row.managerReviewNote}
            >
              {row.managerReviewNote}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className={cn(td, 'whitespace-nowrap text-right')}>
        {!isMockApiEnabled() ? (
          <Button
            type="button"
            size="sm"
            className="rounded-lg font-semibold"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
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
        <div className="flex flex-wrap items-center gap-1.5">
          {row.content}
          {row.category === 'VINH_DANH' && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              🏆 Vinh danh
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className={cn(td, 'tabular-nums font-semibold text-primary')}>
        {row.targetMetric || '—'}
      </TableCell>
      <AssignmentEpic4ReadCells row={row} td={td} />
      <TableCell className={td}>
        <div className="flex flex-col gap-1">
          <EvalStatusBadge status={row.managerEvalStatus} />
          {row.managerReviewNote && (
            <div
              className="text-xs text-slate-500 italic max-w-[150px] truncate"
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

function ReadOnlyAssignmentMobileCard({
  row,
  rowStripe,
}: {
  row: PerformanceAssignment
  rowStripe: boolean
}) {
  return (
    <div className={cn('space-y-3 p-4', rowStripe ? 'bg-slate-50/30 dark:bg-slate-900/20' : '')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium tabular-nums text-slate-500">{periodLabel(row)}</span>
        <span className="text-xs tabular-nums text-slate-500">{formatKpiSetAt(row.kpiSetAt)}</span>
        <KindBadge kind={row.kind} />
        <PriorityBadge priority={row.priority} />
      </div>
      <p className="break-words text-sm font-medium text-slate-900 dark:text-slate-100">
        {row.content}
        {row.category === 'VINH_DANH' && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            🏆 Vinh danh
          </span>
        )}
      </p>
      <p className="text-sm font-semibold tabular-nums text-primary">
        Chỉ tiêu: {row.targetMetric || '—'}
      </p>
      <AssignmentEpic4ReadStack row={row} />
      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="text-xs font-bold uppercase text-muted-foreground">Đánh giá QL</span>
        <EvalStatusBadge status={row.managerEvalStatus} />
        {row.managerReviewNote ? (
          <p className="break-words text-xs italic text-slate-500">{row.managerReviewNote}</p>
        ) : null}
      </div>
    </div>
  )
}

function MemberSelfAssignmentMobileCard({
  row,
  rowStripe,
  onSaved,
}: {
  row: PerformanceAssignment
  rowStripe: boolean
  onSaved: () => void
}) {
  const isMandatory = isMandatoryMetric(row.content)
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
  } = useMemberSelfAssignmentEdit(row, onSaved)

  return (
    <div className={cn('space-y-3 p-4', rowStripe ? 'bg-slate-50/30 dark:bg-slate-900/20' : '')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium tabular-nums text-slate-500">{periodLabel(row)}</span>
        <span className="text-xs tabular-nums text-slate-500">{formatKpiSetAt(row.kpiSetAt)}</span>
        <KindBadge kind={row.kind} />
        <PriorityBadge priority={row.priority} />
        {isMandatory && (
          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
            Bắt buộc nhập
          </span>
        )}
      </div>
      <p className="break-words text-sm font-medium text-slate-900 dark:text-slate-100">
        {row.content}
        {row.category === 'VINH_DANH' && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            🏆 Vinh danh
          </span>
        )}
      </p>
      <p className="text-sm font-semibold tabular-nums text-primary">
        Chỉ tiêu: {row.targetMetric || '—'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span
            className={cn(
              'text-xs font-bold uppercase',
              isMandatory ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            Số liệu{isMandatory && <span className="ml-0.5">*</span>}
          </span>
          <Input
            value={numericRaw}
            onChange={(e) => setNumericRaw(e.target.value)}
            className={cn(
              XL_INPUT,
              isMandatory && !numericRaw.trim() && 'border-destructive ring-1 ring-destructive/30'
            )}
            placeholder={isMandatory ? 'Bắt buộc nhập' : '—'}
            aria-required={isMandatory}
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase text-muted-foreground">Đơn vị</span>
          <Input
            value={numericUnit}
            onChange={(e) => setNumericUnit(e.target.value)}
            className={XL_INPUT}
            placeholder="VND"
          />
        </div>
      </div>
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase text-muted-foreground">Minh chứng</span>
        <KpiEvidenceInput value={evidence} onChange={setEvidence} disabled={saving} />
      </div>
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase text-muted-foreground">Tự đánh giá</span>
        <CustomSelect
          value={selfEvalStatus || '__none'}
          onValueChange={(v) => setSelfEvalStatus(v === '__none' ? '' : v)}
          options={[
            { label: '—', value: '__none' },
            { label: 'OK', value: 'OK' },
            { label: 'NOT', value: 'NOT' },
          ]}
        />
        <textarea
          value={selfReviewNote}
          onChange={(e) => setSelfReviewNote(e.target.value)}
          rows={2}
          className={cn(XL_TEXTAREA, 'mt-1 min-h-[52px] max-w-none')}
          placeholder="Nhận xét"
        />
      </div>
      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="text-xs font-bold uppercase text-muted-foreground">Đánh giá QL</span>
        <EvalStatusBadge status={row.managerEvalStatus} />
        {row.managerReviewNote ? (
          <p className="break-words text-xs italic text-slate-500">{row.managerReviewNote}</p>
        ) : null}
      </div>
      {!isMockApiEnabled() ? (
        <Button
          type="button"
          size="sm"
          className="h-10 w-full rounded-lg font-semibold"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Đang lưu…' : 'Lưu'}
        </Button>
      ) : null}
    </div>
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
  isMandatory = false,
  isCascade = false,
}: {
  row: PerformanceAssignment
  mode: 'planning' | 'results'
  onSaved: () => void
  rowStripe: boolean
  canEditTeam: boolean
  isMandatory?: boolean
  /** Manager cascade mode: edit/delete áp dụng cho toàn team. */
  isCascade?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      if (isCascade && mode === 'planning') {
        // Manager cascade: update all assignments in team with same content
        await performanceApi.cascadeUpdateByContent(row.teamId, {
          year: row.year,
          month: row.month,
          oldContent: row.content,
          newContent: (patch as { content?: string }).content ?? row.content,
          targetMetric: (patch as { targetMetric?: string | null }).targetMetric,
          priority: (patch as { priority?: number }).priority,
        })
      } else {
        await performanceApi.patchAssignment(row.id, patch)
      }
      toast.success(
        isCascade && mode === 'planning' ? 'Đã cập nhật cho toàn team.' : 'Đã cập nhật.'
      )
      setOpen(false)
      onSaved()
    } catch {
      toast.error('Cập nhật thất bại, vui lòng thử lại.')
    }
  })

  const handleDeleteAssignment = async () => {
    setDeleting(true)
    try {
      if (isCascade) {
        await performanceApi.cascadeDeleteByContent(row.teamId, {
          year: row.year,
          month: row.month,
          content: row.content,
        })
        toast.success('Đã xóa chỉ số cho toàn team.')
      } else {
        await performanceApi.deleteAssignment(row.id)
        toast.success('Đã xóa mục tiêu.')
      }
      setDeleteConfirmOpen(false)
      setOpen(false)
      onSaved()
    } catch {
      toast.error('Không xóa được. Kiểm tra quyền hoặc thử lại.')
    } finally {
      setDeleting(false)
    }
  }

  const td = xlTd(rowStripe)
  const editable = canEditTeam && !isMockApiEnabled()
  const canDelete = editable && !isMandatory

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
        <div className="flex flex-wrap items-center gap-1.5">
          {row.content}
          {row.category === 'VINH_DANH' && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              🏆 Vinh danh
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className={cn(td, 'tabular-nums font-semibold text-primary')}>
        {row.targetMetric || '—'}
      </TableCell>
      <AssignmentEpic4ReadCells row={row} td={td} />
      <TableCell className={td}>
        <div className="flex flex-col gap-1">
          <EvalStatusBadge status={row.managerEvalStatus} />
          {row.managerReviewNote && (
            <div
              className="text-xs text-slate-500 italic max-w-[150px] truncate"
              title={row.managerReviewNote}
            >
              {row.managerReviewNote}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className={cn(td, 'whitespace-nowrap text-right')}>
        {editable ? (
          <>
            <div className="flex items-center justify-end gap-0.5">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={deleting}
                    className="h-8 w-8 rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Sửa</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {mode === 'planning'
                        ? 'Sửa mục tiêu KPI/OKR'
                        : 'Chấm điểm thành viên (OK/NOT)'}
                    </DialogTitle>
                    <DialogDescription>
                      {mode === 'planning'
                        ? 'Cập nhật nội dung/ưu tiên/chỉ tiêu và ngày xét cho kỳ đang chọn.'
                        : 'Chấm OK/NOT và nhận xét cho thành viên (đánh giá của trưởng nhóm). Quản lý chấm trưởng nhóm tại màn Đánh giá trưởng nhóm.'}
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
                            label="Đánh giá thành viên (OK/NOT)"
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
                              label="Nhận xét"
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
                          disabled={isSubmitting || deleting}
                          className="rounded-lg bg-primary px-6 font-semibold"
                        >
                          {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={deleting || isSubmitting}
                  className="h-8 w-8 rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  title="Xóa mục tiêu"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Xóa</span>
                </Button>
              ) : isMandatory ? (
                <span
                  className="flex h-8 w-8 items-center justify-center text-slate-300"
                  title="Chỉ số cố định — không thể xóa"
                >
                  <Lock className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>
            <Dialog
              open={deleteConfirmOpen}
              onOpenChange={(next) => {
                if (next) return
                if (deleting) return
                setDeleteConfirmOpen(false)
              }}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Xóa mục tiêu KPI/OKR?</DialogTitle>
                  <DialogDescription>
                    Dữ liệu evidence và đánh giá liên quan sẽ mất. Thao tác không hoàn tác.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleting}
                    onClick={() => setDeleteConfirmOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => void handleDeleteAssignment()}
                  >
                    {deleting ? 'Đang xóa…' : 'Xóa'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
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
  rows: rawRows,
  members,
  canEditTeam,
  onRefresh,
  leaderMode,
  memberSelfEditableResults,
  prioritizeUserId,
  templateCode,
  isManagerCascade,
}: {
  userId: string
  rows: PerformanceAssignment[]
  members: TeamMemberRow[]
  canEditTeam: boolean
  onRefresh: () => void
  leaderMode: 'planning' | 'results'
  memberSelfEditableResults: boolean
  prioritizeUserId?: string
  templateCode?: string
  isManagerCascade?: boolean
}) {
  // Manager variant: dedup rows by content — each metric shown once for team-wide cascade operations
  const rows = useMemo(() => {
    if (!isManagerCascade) return rawRows
    const seen = new Set<string>()
    return rawRows.filter((r) => {
      if (seen.has(r.content)) return false
      seen.add(r.content)
      return true
    })
  }, [rawRows, isManagerCascade])
  const isPlanning = leaderMode === 'planning'
  /** Epic 4: member chỉnh Evidence / số liệu / tự đánh giá cho đúng user của mình — cả tháng này (planning) lẫn tháng trước (results). */
  const allowSelfEdit =
    memberSelfEditableResults && Boolean(prioritizeUserId && userId === prioritizeUserId)
  const memberMetaLine = memberMetaForDisplay(members, userId)

  /** Epic 5.5: các row bắt buộc nhập Số liệu chưa có giá trị. */
  const mandatoryUnfilled = allowSelfEdit
    ? rows.filter((r) => isMandatoryMetric(r.content) && r.numericValue == null)
    : []

  const tableHeader = (
    <TableHeader>
      <TableRow className="hover:bg-transparent border-b-slate-100 dark:border-b-slate-800">
        {ASSIGN_TABLE_HEAD.map((h) => (
          <TableHead key={h} className={XL_TH}>
            {h}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )

  const tableBody = (
    <TableBody>
      {rows.length === 0 ? (
        <TableRow>
          <TableCell colSpan={ASSIGN_TABLE_HEAD.length} className="h-32 text-center text-slate-400">
            Chưa có dữ liệu cho nhân sự này.
          </TableCell>
        </TableRow>
      ) : (
        rows.map((r, idx) => {
          if (allowSelfEdit && leaderMode === 'results') {
            return (
              <MemberSelfAssignmentRow
                key={r.id}
                row={r}
                rowStripe={idx % 2 === 1}
                onSaved={onRefresh}
              />
            )
          }
          if (canEditTeam) {
            return (
              <LeaderAssignmentRow
                key={r.id}
                row={r}
                mode={leaderMode}
                onSaved={onRefresh}
                rowStripe={idx % 2 === 1}
                canEditTeam={canEditTeam}
                isMandatory={isMandatoryMetric(r.content, templateCode)}
                isCascade={isManagerCascade}
              />
            )
          }
          if (allowSelfEdit) {
            return (
              <MemberSelfAssignmentRow
                key={r.id}
                row={r}
                rowStripe={idx % 2 === 1}
                onSaved={onRefresh}
              />
            )
          }
          return <ReadOnlyAssignmentRow key={r.id} row={r} rowStripe={idx % 2 === 1} />
        })
      )}
    </TableBody>
  )

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
            {memberMetaLine ? <div className="text-xs text-slate-500">{memberMetaLine}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="muted"
            className={cn(
              'h-6 rounded-md shadow-none border-none',
              isPlanning ? 'bg-blue-100/50 text-blue-700' : 'bg-emerald-100/50 text-emerald-700'
            )}
          >
            {rows.length} hạng mục
          </Badge>
        </div>
      </div>
      {mandatoryUnfilled.length > 0 && (
        <div className="flex items-start gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive dark:bg-destructive/10">
          <span className="mt-0.5 shrink-0 font-bold">!</span>
          <span>
            Chỉ số bắt buộc chưa nhập Số liệu:{' '}
            <strong>{mandatoryUnfilled.map((r) => r.content).join(', ')}</strong> — vui lòng điền
            trước khi kết thúc tháng.
          </span>
        </div>
      )}
      {canEditTeam ? (
        <div className="max-h-[min(70vh,calc(100vh-400px))] min-w-0 overflow-auto [scrollbar-width:thin] md:hidden">
          <Table className="w-full min-w-[1180px]">
            {tableHeader}
            {tableBody}
          </Table>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800 md:hidden">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Chưa có dữ liệu cho nhân sự này.
            </div>
          ) : (
            rows.map((r, idx) => {
              if (allowSelfEdit && leaderMode === 'results') {
                return (
                  <MemberSelfAssignmentMobileCard
                    key={r.id}
                    row={r}
                    rowStripe={idx % 2 === 1}
                    onSaved={onRefresh}
                  />
                )
              }
              if (allowSelfEdit) {
                return (
                  <MemberSelfAssignmentMobileCard
                    key={r.id}
                    row={r}
                    rowStripe={idx % 2 === 1}
                    onSaved={onRefresh}
                  />
                )
              }
              return <ReadOnlyAssignmentMobileCard key={r.id} row={r} rowStripe={idx % 2 === 1} />
            })
          )}
        </div>
      )}
      <div className="hidden max-h-[calc(100vh-400px)] min-w-0 overflow-auto [scrollbar-width:thin] md:block">
        <Table className="w-full min-w-[1180px]">
          {tableHeader}
          {tableBody}
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
  memberSelfEditableResults,
  templateCode,
  isManagerCascade,
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
  memberSelfEditableResults: boolean
  templateCode?: string
  isManagerCascade?: boolean
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
        memberSelfEditableResults={memberSelfEditableResults}
        prioritizeUserId={prioritizeUserId}
        templateCode={templateCode}
        isManagerCascade={isManagerCascade}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          <Users
            className={cn(
              'h-4 w-4 shrink-0',
              leaderMode === 'planning' ? 'text-blue-500' : 'text-emerald-500'
            )}
          />
          Danh sách nhân sự
        </div>
        <div
          role="tablist"
          aria-label="Chọn nhân sự"
          className={cn(
            'flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]',
            '[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full',
            leaderMode === 'planning'
              ? '[&::-webkit-scrollbar-thumb]:bg-blue-200 dark:[&::-webkit-scrollbar-thumb]:bg-blue-900/60'
              : '[&::-webkit-scrollbar-thumb]:bg-emerald-200 dark:[&::-webkit-scrollbar-thumb]:bg-emerald-900/60'
          )}
        >
          {userEntries.map(([uid, rows]) => {
            const active = uid === activeUserId
            const isPlanning = leaderMode === 'planning'
            const tabMeta = memberMetaForDisplay(members, uid)
            return (
              <button
                key={uid}
                type="button"
                role="tab"
                aria-selected={active}
                id={`kpi-tab-${leaderMode}-${uid}`}
                onClick={() => setSelectedUserId(uid)}
                className={cn(
                  'flex min-w-[160px] max-w-[240px] shrink-0 snap-start flex-col gap-1 rounded-xl px-4 py-2.5 text-left transition-all duration-200',
                  active
                    ? isPlanning
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-1 ring-blue-600 dark:shadow-none'
                      : 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-1 ring-emerald-600 dark:shadow-none'
                    : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'
                )}
              >
                <span
                  className={cn(
                    'truncate text-sm font-bold',
                    active ? 'text-white' : 'text-slate-800 dark:text-slate-100'
                  )}
                  title={nameForMember(members, uid)}
                >
                  {nameForMember(members, uid)}
                </span>
                {tabMeta ? (
                  <span
                    className={cn(
                      'truncate text-xs',
                      active
                        ? isPlanning
                          ? 'text-blue-100/90'
                          : 'text-emerald-100/90'
                        : 'text-slate-500 dark:text-slate-400'
                    )}
                    title={tabMeta}
                  >
                    {tabMeta}
                  </span>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-flex h-5 items-center rounded-md px-2 text-xs font-bold uppercase tracking-wide',
                      active
                        ? 'bg-white/20 text-white'
                        : isPlanning
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    )}
                  >
                    {rows.length} hạng mục
                  </span>
                  {prioritizeUserId && uid === prioritizeUserId ? (
                    <span
                      className={cn(
                        'inline-flex h-5 items-center rounded-md px-2 text-xs font-bold uppercase tracking-wide',
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
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
      <div
        role="tabpanel"
        id={`kpi-user-panel-${leaderMode}-${activeUserId}`}
        aria-labelledby={`kpi-tab-${leaderMode}-${activeUserId}`}
        className="min-w-0"
      >
        <AssignmentTableSingleUser
          userId={activeUserId}
          rows={activeRows}
          members={members}
          canEditTeam={canEditTeam}
          onRefresh={onRefresh}
          leaderMode={leaderMode}
          memberSelfEditableResults={memberSelfEditableResults}
          prioritizeUserId={prioritizeUserId}
          templateCode={templateCode}
          isManagerCascade={isManagerCascade}
        />
      </div>
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
  assignmentWindowOpen,
  assignmentWindowBounds,
  canMemberEditSelfResults,
  templateCode,
  isManagerCascade,
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
  assignmentWindowOpen: boolean
  assignmentWindowBounds: { startDay: number; endDay: number }
  canMemberEditSelfResults: boolean
  templateCode?: string
  isManagerCascade?: boolean
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
          Chọn nhóm để xem báo cáo công việc.
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
            <p className="text-sm text-slate-500">
              Lập mục tiêu cho team; nhân viên có thể cập nhật Evidence, số liệu và tự đánh giá các
              chỉ tiêu của chính mình trong kỳ này (Epic 4).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {members.slice(0, 5).map((m, i) => (
                <div
                  key={i}
                  className="inline-block h-7 w-7 rounded-full bg-slate-200 ring-2 ring-white dark:bg-slate-800 dark:ring-slate-950 flex items-center justify-center text-xs font-bold text-slate-600"
                >
                  {(m.displayName || '?').charAt(0)}
                </div>
              ))}
              {members.length > 5 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white dark:bg-slate-800 dark:ring-slate-950 text-xs font-medium text-slate-500">
                  +{members.length - 5}
                </div>
              )}
            </div>
            {canEditTeam &&
              selectedTeamId &&
              !isMockApiEnabled() &&
              assignmentWindowOpen &&
              (isManagerCascade ? (
                <ManagerCascadeAddForm
                  teamId={selectedTeamId}
                  year={year}
                  month={month}
                  onCreated={onRefresh}
                />
              ) : (
                <MiniCreateForm
                  teamId={selectedTeamId}
                  year={year}
                  month={month}
                  members={members}
                  defaultAssigneeId={currentUserId ?? ''}
                  onCreated={onRefresh}
                />
              ))}
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
          memberSelfEditableResults={canMemberEditSelfResults}
          templateCode={templateCode}
          isManagerCascade={isManagerCascade}
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
            <p className="text-sm text-slate-500">
              Evidence / số liệu / tự đánh giá của nhân viên và đánh giá QL cho kỳ trước (Epic 4).
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
          memberSelfEditableResults={canMemberEditSelfResults}
          templateCode={templateCode}
          isManagerCascade={isManagerCascade}
        />
      </section>
    </div>
  )
}

/** Leader KPI/OKR của team — khớp `role === LEADER` từ `GET .../teams/:id/members`. */
function reviewerDefaultFromTeamLeader(members: TeamMemberRow[]): string {
  const leader = members.find((m) => m.role === 'LEADER')
  if (!leader) return ''
  return leader.displayName?.trim() || leader.email?.trim() || ''
}

function miniCreateEmptyLine(): {
  kind: 'KPI' | 'OKR'
  priority: number
  content: string
  kpiSetAt: string
  targetMetric: string
} {
  return { kind: 'KPI', priority: 1, content: '', kpiSetAt: '', targetMetric: '' }
}

/** Dialog đơn giản cho manager thêm chỉ số cho toàn team (cascade). */
function ManagerCascadeAddForm({
  teamId,
  year,
  month,
  onCreated,
}: {
  teamId: string
  year: number
  month: number
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<{
    kind: 'KPI' | 'OKR'
    priority: number
    content: string
    targetMetric: string
  }>({ defaultValues: { kind: 'KPI', priority: 2, content: '', targetMetric: '' } })

  const onSubmit = handleSubmit(async (values) => {
    if (!values.content.trim()) {
      toast.error('Nội dung không được trống.')
      return
    }
    try {
      const result = await performanceApi.cascadeAddAssignment(teamId, {
        year,
        month,
        kind: values.kind,
        priority: values.priority,
        content: values.content.trim(),
        targetMetric: values.targetMetric.trim() || null,
      })
      toast.success(`Đã thêm chỉ số cho ${result.created} thành viên.`)
      reset()
      setOpen(false)
      onCreated()
    } catch {
      toast.error('Không thêm được. Vui lòng thử lại.')
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="rounded-lg bg-primary px-4 font-semibold shadow-sm transition-all hover:bg-primary/90"
        >
          Thêm chỉ số cho team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm chỉ số mới cho toàn team</DialogTitle>
          <DialogDescription>
            Chỉ số sẽ được tạo cho tất cả thành viên active trong team.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Loại</Label>
              <select
                {...register('kind')}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="KPI">KPI</option>
                <option value="OKR">OKR</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ưu tiên</Label>
              <select
                {...register('priority', { valueAsNumber: true })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value={1}>P1 — Cao</option>
                <option value={2}>P2 — Trung bình</option>
                <option value={3}>P3 — Thấp</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Nội dung *</Label>
            <Input
              {...register('content')}
              placeholder="Tên chỉ số / mục tiêu"
              className="h-9 rounded-lg border-slate-200"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Chỉ tiêu</Label>
            <Input
              {...register('targetMetric')}
              placeholder="VD: 100,000,000 VND / tháng"
              className="h-9 rounded-lg border-slate-200"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? 'Đang thêm…' : 'Thêm cho toàn team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  const importFileRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<null | {
    fileLabel: string
    items: ImportAssignmentItem[]
    errors: { row: number; message: string }[]
  }>(null)
  const [importSubmitting, setImportSubmitting] = useState(false)

  type MiniCreateValues = {
    assigneeUserIds: string[]
    reviewerName: string
    lines: Array<{
      kind: 'KPI' | 'OKR'
      priority: number
      content: string
      kpiSetAt: string
      targetMetric: string
    }>
  }
  const fallbackAssigneeId = useMemo(() => {
    if (defaultAssigneeId && members.some((m) => m.userId === defaultAssigneeId))
      return defaultAssigneeId
    return members[0]?.userId ?? ''
  }, [members, defaultAssigneeId])
  const form = useForm<MiniCreateValues>({
    defaultValues: {
      assigneeUserIds: fallbackAssigneeId ? [fallbackAssigneeId] : [],
      reviewerName: '',
      lines: [miniCreateEmptyLine()],
    },
    mode: 'onChange',
  })
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { isSubmitting },
  } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const assigneeIdsWatched = useWatch({ control, name: 'assigneeUserIds' })
  const selectedAssigneeCount = Array.isArray(assigneeIdsWatched) ? assigneeIdsWatched.length : 0
  const lineCount = fields.length
  const totalCreates = lineCount * selectedAssigneeCount

  useEffect(() => {
    if (!open) return
    const label = reviewerDefaultFromTeamLeader(members)
    if (!label || getValues('reviewerName').trim()) return
    setValue('reviewerName', label, { shouldValidate: false, shouldDirty: false })
  }, [open, members, getValues, setValue])

  useEffect(() => {
    setValue('assigneeUserIds', fallbackAssigneeId ? [fallbackAssigneeId] : [], {
      shouldValidate: true,
    })
  }, [fallbackAssigneeId, setValue])

  useEffect(() => {
    if (!open) setImportPreview(null)
  }, [open])

  const onImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !members.length) return
    try {
      const { items, errors } = await parseKpiOkrImportFile(f, members)
      setImportPreview({ fileLabel: f.name, items, errors })
      if (items.length === 0 && errors.length > 0) {
        toast.error('Không có dòng hợp lệ. Kiểm tra file và tên nhân sự trong team.')
      } else if (errors.length > 0) {
        toast.message(`Đã đọc ${items.length} dòng; bỏ qua ${errors.length} dòng lỗi.`)
      } else if (items.length > 0) {
        toast.success(`Đã đọc ${items.length} dòng từ file.`)
      }
    } catch {
      toast.error('Không đọc được file. Chỉ hỗ trợ .xlsx, .xls, .csv.')
    }
  }

  const submitImportFromFile = async () => {
    if (!importPreview?.items.length || isMockApiEnabled()) return
    setImportSubmitting(true)
    try {
      await performanceApi.importAssignments(teamId, {
        year,
        month,
        items: importPreview.items,
      })
      toast.success(`Đã tạo ${importPreview.items.length} mục từ file.`)
      setImportPreview(null)
      setOpen(false)
      onCreated()
    } catch {
      toast.error('Import thất bại (kiểm tra giới hạn KPI/OKR mỗi người hoặc quyền).')
    } finally {
      setImportSubmitting(false)
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!values.lines.length) {
      toast.error('Thêm ít nhất một dòng mục tiêu.')
      return
    }
    for (let i = 0; i < values.lines.length; i++) {
      const line = values.lines[i]!
      if (!line.content.trim()) {
        toast.error(`Dòng ${i + 1}: Nội dung KPI/OKR không được trống.`)
        return
      }
      if (line.content.trim().length > 500) {
        toast.error(`Dòng ${i + 1}: Nội dung tối đa 500 ký tự.`)
        return
      }
      if (line.kpiSetAt.trim()) {
        const dt = new Date(`${line.kpiSetAt.trim()}T12:00:00`)
        if (Number.isNaN(dt.getTime())) {
          toast.error(`Dòng ${i + 1}: Ngày xét không hợp lệ.`)
          return
        }
      }
    }

    const nAssign = values.assigneeUserIds.length
    const nLines = values.lines.length
    if (nLines * nAssign > 300) {
      toast.error('Tối đa 300 bản ghi mỗi lần (số dòng × số nhân sự).')
      return
    }

    const linesPayload = values.lines.map((line) => ({
      kind: line.kind,
      priority: Number(line.priority),
      content: line.content.trim(),
      targetMetric: line.targetMetric.trim() ? line.targetMetric.trim() : null,
      kpiSetAt: line.kpiSetAt.trim()
        ? new Date(`${line.kpiSetAt.trim()}T12:00:00`).toISOString()
        : null,
    }))

    try {
      const created = await performanceApi.createAssignmentsBatchMulti(teamId, {
        assigneeUserIds: values.assigneeUserIds,
        year,
        month,
        reviewerName: values.reviewerName.trim() || null,
        lines: linesPayload,
      })
      const n = created.length
      toast.success(
        n === 1 ? 'Đã tạo mục tiêu.' : `Đã tạo ${n} mục tiêu (${nLines} dòng × ${nAssign} nhân sự).`
      )
      reset({
        assigneeUserIds: fallbackAssigneeId ? [fallbackAssigneeId] : [],
        reviewerName: '',
        lines: [miniCreateEmptyLine()],
      })
      setOpen(false)
      onCreated()
    } catch {
      toast.error('Không tạo được mục tiêu. Vui lòng thử lại.')
    }
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
      <DialogContent className="flex max-h-[90vh] max-w-[min(1200px,95vw)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[min(1200px,95vw)]">
        <div className="max-h-[90vh] overflow-y-auto px-6 pb-4 pt-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold tracking-tight">
              Tạo hạng mục KPI/OKR mới
            </DialogTitle>
            <DialogDescription className="text-sm">
              Kỳ T{month}/{year}: thêm nhiều dòng mục tiêu; mỗi dòng áp dụng cho tất cả nhân sự đã
              chọn (tối đa 300 bản ghi mỗi lần).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="sr-only"
                onChange={onImportFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-dashed text-sm font-semibold"
                disabled={!members.length || isMockApiEnabled()}
                onClick={() => importFileRef.current?.click()}
              >
                <FileUp className="h-4 w-4" />
                Import Excel / CSV
              </Button>
              <span className="inline-flex flex-wrap items-center gap-2">
                <a
                  href={`${import.meta.env.BASE_URL}templates/kpi-okr-import-mau.xlsx`}
                  download="kpi-okr-import-mau.xlsx"
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-primary underline-offset-2 hover:underline dark:border-slate-600 dark:bg-slate-900"
                >
                  Tải Excel mẫu
                </a>
                <a
                  href={`${import.meta.env.BASE_URL}templates/kpi-okr-import-mau.csv`}
                  download="kpi-okr-import-mau.csv"
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 underline-offset-2 hover:underline dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  Tải CSV mẫu
                </a>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Hàng đầu: tiêu đề (Nhân sự, Hạng mục, Thứ tự ưu tiên, Nội dung KPI/OKRs, …). Mỗi
                dòng một mục — gắn với kỳ{' '}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">
                  T{month}/{year}
                </strong>{' '}
                đang chọn.
              </span>
            </div>
            {importPreview ? (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-700 dark:text-slate-200">
                    <span className="font-semibold">{importPreview.fileLabel}</span>
                    {' — '}
                    <span className="tabular-nums text-primary">
                      {importPreview.items.length}
                    </span>{' '}
                    dòng hợp lệ
                    {importPreview.errors.length > 0 ? (
                      <span className="text-amber-700 dark:text-amber-400">
                        {' '}
                        · {importPreview.errors.length} dòng bỏ qua
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-lg font-bold"
                    disabled={!importPreview.items.length || importSubmitting || isMockApiEnabled()}
                    onClick={() => void submitImportFromFile()}
                  >
                    {importSubmitting ? (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    {importSubmitting
                      ? 'Đang import…'
                      : importPreview.items.length > 0
                        ? `Tạo ${importPreview.items.length} mục từ file`
                        : 'Không có dòng hợp lệ'}
                  </Button>
                </div>
                {importPreview.errors.length > 0 ? (
                  <ul className="max-h-28 overflow-y-auto rounded-md border border-amber-200/80 bg-amber-50/50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                    {importPreview.errors.slice(0, 20).map((err) => (
                      <li key={`${err.row}-${err.message.slice(0, 24)}`}>
                        Dòng {err.row}: {err.message}
                      </li>
                    ))}
                    {importPreview.errors.length > 20 ? (
                      <li className="text-amber-800/80">
                        … và {importPreview.errors.length - 20} lỗi khác
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
          <Form {...form}>
            <form className="flex flex-col gap-4 pt-4" onSubmit={onSubmit}>
              <FormField
                control={control}
                name="assigneeUserIds"
                rules={{
                  validate: (v) =>
                    (Array.isArray(v) && v.length > 0) || 'Chọn ít nhất một nhân sự nhận việc',
                }}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500 !mt-0">
                        Nhân sự nhận việc <span className="text-destructive">*</span>
                      </FormLabel>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 rounded-lg px-2 text-xs font-semibold text-primary"
                          onClick={() => field.onChange(members.map((m) => m.userId))}
                        >
                          Chọn tất cả
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 rounded-lg px-2 text-xs font-semibold text-slate-500"
                          onClick={() => field.onChange([])}
                        >
                          Bỏ chọn
                        </Button>
                      </div>
                    </div>
                    <FormControl>
                      <div
                        className={cn(
                          'box-border w-full min-w-0 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 text-sm outline-none transition-all',
                          'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10',
                          'dark:border-slate-700 dark:bg-slate-950 space-y-0.5'
                        )}
                      >
                        {members.map((m) => {
                          const checked = field.value.includes(m.userId)
                          return (
                            <label
                              key={m.userId}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => {
                                  const on = c === true
                                  if (on) {
                                    if (!field.value.includes(m.userId)) {
                                      field.onChange([...field.value, m.userId])
                                    }
                                  } else {
                                    field.onChange(field.value.filter((id) => id !== m.userId))
                                  }
                                }}
                              />
                              <span className="text-sm text-slate-800 dark:text-slate-100">
                                {(m.displayName ?? m.email ?? 'chưa có tên').slice(0, 48)}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <InputController
                control={control}
                name="reviewerName"
                label="Người đánh giá (tùy chọn)"
                className="max-w-xl space-y-1.5"
                labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
                inputClassName={cn(XL_INPUT, 'h-10 rounded-xl')}
                placeholder="Họ tên trưởng nhóm"
              />

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Danh sách mục tiêu
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-lg text-sm font-semibold"
                    onClick={() => append(miniCreateEmptyLine())}
                  >
                    <Plus className="h-4 w-4" />
                    Thêm dòng
                  </Button>
                </div>

                <div className="flex flex-col gap-3">
                  {fields.map((fieldRow, index) => (
                    <div
                      key={fieldRow.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-900/30"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Mục {index + 1}
                        </span>
                        {fields.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-destructive hover:text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa dòng
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <SelectController
                          control={control}
                          name={`lines.${index}.kind`}
                          label="Hạng mục"
                          required
                          rules={{ required: true }}
                          className="space-y-1.5"
                          labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          <SelectItem value="KPI">KPI</SelectItem>
                          <SelectItem value="OKR">OKR</SelectItem>
                        </SelectController>
                        <SelectController
                          control={control}
                          name={`lines.${index}.priority`}
                          label="Thứ tự ưu tiên"
                          required
                          rules={{ required: true, min: 0, max: 99 }}
                          className="space-y-1.5"
                          labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          <SelectItem value="0">Không xếp (0)</SelectItem>
                          <SelectItem value="1">Ưu tiên 1 - Cao</SelectItem>
                          <SelectItem value="2">Ưu tiên 2 - Trung bình</SelectItem>
                          <SelectItem value="3">Ưu tiên 3 - Thấp</SelectItem>
                        </SelectController>
                        <DateController
                          control={control}
                          name={`lines.${index}.kpiSetAt`}
                          label="Ngày xét KPI/OKR"
                          className="space-y-1.5"
                          labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
                          datePickerClassName={cn(XL_INPUT, 'h-10 rounded-xl')}
                          lockToMonth={{ year, month }}
                        />
                        <InputController
                          control={control}
                          name={`lines.${index}.targetMetric`}
                          label="Chỉ số mục tiêu"
                          className="space-y-1.5 md:col-span-1"
                          labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
                          inputClassName={cn(XL_INPUT, 'h-10 rounded-xl tabular-nums')}
                          placeholder="VD: 60"
                        />
                        <div className="md:col-span-2 lg:col-span-3">
                          <TextareaController
                            control={control}
                            name={`lines.${index}.content`}
                            label="Nội dung KPI/OKR"
                            required
                            rules={{ required: true, maxLength: 500 }}
                            className="space-y-1.5"
                            labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
                            maxLength={500}
                            textareaClassName={cn(
                              XL_TEXTAREA,
                              'max-w-none min-h-[88px] rounded-xl'
                            )}
                            placeholder="Mô tả cụ thể mục tiêu cần đạt được..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
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
                  {isSubmitting
                    ? 'Đang tạo...'
                    : totalCreates > 1
                      ? `Tạo ${totalCreates} mục tiêu`
                      : 'Tạo mục tiêu'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
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
        <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
          {displayRows.map((r) => (
            <div key={r.id} className="space-y-3 py-4 first:pt-0">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{rowName(r)}</div>
                <div className="text-xs text-slate-500">
                  {r.assigneeEmployeeCode?.trim() || r.assigneeEmail?.trim() || '—'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-amber-100/80 bg-amber-50/25 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                <div>
                  <p className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300">
                    KPI đạt
                  </p>
                  <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-200">
                    {r.kpiOkCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300">
                    KPI chưa
                  </p>
                  <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-200">
                    {r.kpiNotCount}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300">
                    Xếp loại KPI
                  </p>
                  <span className="mt-1 inline-flex h-6 items-center rounded-md bg-amber-100 px-2 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {r.kpiGrade || '—'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-blue-100/80 bg-blue-50/25 p-3 dark:border-blue-900/30 dark:bg-blue-950/20">
                <div>
                  <p className="text-xs font-bold uppercase text-blue-800 dark:text-blue-300">
                    OKR đạt
                  </p>
                  <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-200">
                    {r.okrOkCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-blue-800 dark:text-blue-300">
                    OKR chưa
                  </p>
                  <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-200">
                    {r.okrNotCount}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase text-blue-800 dark:text-blue-300">
                    Xếp loại OKR
                  </p>
                  <span className="mt-1 inline-flex h-6 items-center rounded-md bg-blue-100 px-2 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {r.okrGrade || '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-slate-100 dark:border-b-slate-800">
                <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nhân sự
                </TableHead>
                <TableHead
                  className="bg-amber-50/50 text-center text-xs font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-900/10"
                  colSpan={3}
                >
                  KPI
                </TableHead>
                <TableHead
                  className="bg-blue-50/50 text-center text-xs font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-900/10"
                  colSpan={3}
                >
                  OKR
                </TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent border-b-slate-100 dark:border-b-slate-800">
                <TableHead />
                <TableHead className="text-center text-xs font-bold uppercase text-slate-400">
                  Đạt
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase text-slate-400">
                  Chưa
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase text-slate-400">
                  Xếp loại
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase text-slate-400">
                  Đạt
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase text-slate-400">
                  Chưa
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase text-slate-400">
                  Xếp loại
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((r) => (
                <TableRow
                  key={r.id}
                  className="group border-b-slate-50 transition-colors hover:bg-slate-50/50 dark:border-b-slate-900 dark:hover:bg-slate-900/50"
                >
                  <TableCell className="py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{rowName(r)}</div>
                    <div className="text-xs text-slate-500">
                      {r.assigneeEmployeeCode?.trim() || r.assigneeEmail?.trim() || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="bg-amber-50/20 text-center tabular-nums text-slate-700 dark:bg-amber-900/5 dark:text-slate-300">
                    {r.kpiOkCount}
                  </TableCell>
                  <TableCell className="bg-amber-50/20 text-center tabular-nums text-slate-700 dark:bg-amber-900/5 dark:text-slate-300">
                    {r.kpiNotCount}
                  </TableCell>
                  <TableCell className="bg-amber-50/20 text-center dark:bg-amber-900/5">
                    <span className="inline-flex h-6 items-center rounded-md bg-amber-100 px-2 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {r.kpiGrade || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="bg-blue-50/20 text-center tabular-nums text-slate-700 dark:bg-blue-900/5 dark:text-slate-300">
                    {r.okrOkCount}
                  </TableCell>
                  <TableCell className="bg-blue-50/20 text-center tabular-nums text-slate-700 dark:bg-blue-900/5 dark:text-slate-300">
                    {r.okrNotCount}
                  </TableCell>
                  <TableCell className="bg-blue-50/20 text-center dark:bg-blue-900/5">
                    <span className="inline-flex h-6 items-center rounded-md bg-blue-100 px-2 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
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
  const surveyFileInputRef = useRef<HTMLInputElement>(null)
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
    void (async () => {
      try {
        const lines = await parseQuestionnaireImportFile(file)
        if (lines.length === 0) {
          toast.error(
            'File không có câu hỏi hợp lệ. Với Excel dạng lưới, cần hàng tiêu đề có cột kiểu «TC1 - Câu hỏi 1: …»; hoặc dùng .txt/.md mỗi dòng một câu.'
          )
          return
        }
        setQuestionDrafts(
          lines.map((prompt, i) => ({
            id: `u-${i}-${Date.now()}`,
            prompt,
          }))
        )
        toast.success(`Đã đọc ${lines.length} câu từ file.`)
      } catch {
        toast.error('Không đọc được file. Thử định dạng .xlsx, .csv, .txt hoặc .md.')
      }
    })()
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
          <p className="text-sm text-slate-500">
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
                      className="rounded-xl border border-border bg-background p-4 shadow-sm dark:border-slate-800"
                    >
                      <div className="mb-3 flex gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary"
                          aria-hidden
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-foreground">Câu {i + 1}</p>
                            <Badge
                              variant="outline"
                              className="rounded-md px-2 py-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              Tự luận
                            </Badge>
                          </div>
                          <p className="text-sm font-medium leading-relaxed text-foreground">
                            {qs.prompt}
                          </p>
                        </div>
                      </div>
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
              <Card className="overflow-hidden border-border shadow-md dark:border-slate-800/50">
                <CardHeader className="space-y-4 border-b border-border/80 bg-gradient-to-br from-muted/40 via-background to-background pb-4 dark:from-slate-900/50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-bold tracking-tight text-foreground">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                          <ClipboardList className="h-5 w-5 text-primary" strokeWidth={2} />
                        </span>
                        Soạn form khảo sát
                        <Badge
                          variant="outline"
                          className="ml-0 rounded-md font-mono text-xs font-semibold sm:ml-1"
                        >
                          T{month}/{year}
                        </Badge>
                      </CardTitle>
                      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                        Nhân sự sẽ trả lời tự luận giống bài thi ngắn. Chọn cách nhập bên dưới, kiểm
                        tra phần <span className="font-medium text-foreground">Xem trước</span>, rồi
                        lưu cho cả team.
                      </p>
                    </div>
                    <ol className="flex shrink-0 gap-1 rounded-xl border border-border/80 bg-background/80 p-1 text-xs font-semibold text-muted-foreground shadow-sm dark:bg-slate-950/60">
                      {(['Chọn nguồn', 'Xem trước', 'Lưu'] as const).map((label, i) => (
                        <li
                          key={label}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">
                            {i + 1}
                          </span>
                          <span className="hidden sm:inline">{label}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setLeaderQMode('upload')}
                      className={cn(
                        'flex w-full gap-3 rounded-xl border-2 p-4 text-left transition-all',
                        leaderQMode === 'upload'
                          ? 'border-primary bg-primary/8 shadow-sm ring-2 ring-primary/15 dark:bg-primary/10'
                          : 'border-border bg-card hover:border-primary/35 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12">
                        <FileUp className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground">Import từ file</div>
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          Excel lưới (cột «TC… — Câu hỏi…»), CSV, TXT…
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderQMode('compose')}
                      className={cn(
                        'flex w-full gap-3 rounded-xl border-2 p-4 text-left transition-all',
                        leaderQMode === 'compose'
                          ? 'border-primary bg-primary/8 shadow-sm ring-2 ring-primary/15 dark:bg-primary/10'
                          : 'border-border bg-card hover:border-primary/35 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12">
                        <ListOrdered className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground">Soạn từng câu</div>
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          Thêm, sửa, xóa từng ô — phù hợp ít câu hoặc chỉnh tay sau import.
                        </p>
                      </div>
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-5">
                  {leaderQMode === 'upload' ? (
                    <div className="space-y-5">
                      <div className="rounded-2xl border-2 border-dashed border-primary/25 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/10">
                        <p className="mb-3 text-sm font-bold text-foreground">
                          Bước 1 — Chọn file hoặc dán danh sách
                        </p>
                        <input
                          ref={surveyFileInputRef}
                          type="file"
                          accept=".txt,.md,.csv,.xlsx,.xls,text/plain,text/markdown,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) onUploadSurveyFile(file)
                            e.target.value = ''
                          }}
                        />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Button
                            type="button"
                            variant="default"
                            className="h-11 w-full shrink-0 rounded-xl font-bold sm:w-auto"
                            onClick={() => surveyFileInputRef.current?.click()}
                          >
                            <FileUp className="mr-2 h-4 w-4" />
                            Chọn file (.xlsx, .csv, .txt…)
                          </Button>
                          <ul className="flex-1 space-y-1 text-xs text-muted-foreground">
                            <li className="flex gap-2">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <span>
                                <strong className="text-foreground">Excel lưới:</strong> hàng đầu là
                                tiêu đề cột; hệ thống lấy các cột dạng «TC1 — Câu hỏi 1: …».
                              </span>
                            </li>
                            <li className="flex gap-2">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <span>
                                <strong className="text-foreground">TXT / CSV dọc:</strong> mỗi dòng
                                không trống = một câu hỏi.
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-muted/20 p-4 dark:bg-slate-900/40">
                        <Label
                          htmlFor="survey-bulk-paste"
                          className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground"
                        >
                          <AlignLeft className="h-4 w-4 text-muted-foreground" />
                          Hoặc dán nhanh (mỗi dòng một câu)
                        </Label>
                        <textarea
                          id="survey-bulk-paste"
                          className="min-h-[120px] w-full rounded-xl border border-border bg-background p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/25"
                          placeholder={'Dòng 1: nội dung câu hỏi\nDòng 2: câu tiếp theo\n…'}
                          value={rawBulk}
                          onChange={(e) => setRawBulk(e.target.value)}
                        />
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-lg font-bold"
                            onClick={parseRawBulk}
                          >
                            Áp dụng vào danh sách
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-foreground">Danh sách câu hỏi</p>
                      <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/15 p-3 dark:bg-slate-900/35">
                        {questionDrafts.map((row, qIdx) => (
                          <div
                            key={row.id}
                            className="rounded-xl border border-border bg-background p-3 shadow-sm"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                                  {qIdx + 1}
                                </span>
                                <p className="text-sm font-bold text-foreground">Câu {qIdx + 1}</p>
                              </div>
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
                              placeholder="Nhập nội dung câu hỏi…"
                              className="mb-2 w-full rounded-lg text-sm focus-visible:border-primary focus-visible:ring-primary/20"
                            />
                            <p className="text-xs text-muted-foreground">
                              Trả lời dạng văn bản — bắt buộc khi nhân sự gửi khảo sát.
                            </p>
                          </div>
                        ))}
                        <div className="flex justify-end pt-1">
                          <Button type="button" variant="outline" onClick={addQuestionDraft}>
                            <ListPlus className="mr-2 h-4 w-4" />
                            Thêm câu hỏi
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      'rounded-2xl border-2 p-4 transition-colors',
                      validDraftCount > 0
                        ? 'border-emerald-200/90 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/25'
                        : 'border-border bg-muted/15 dark:bg-slate-900/30'
                    )}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground">Xem trước</span>
                        <Badge
                          variant="outline"
                          className="rounded-md font-mono text-xs tabular-nums font-bold"
                        >
                          {validDraftCount} câu
                        </Badge>
                      </div>
                      {validDraftCount > 0 ? (
                        <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                          Đúng thứ tự này sẽ hiện cho nhân sự
                        </span>
                      ) : null}
                    </div>
                    <div className="max-h-60 space-y-2 overflow-auto rounded-xl border border-border/60 bg-background/80 p-2 dark:bg-slate-950/50">
                      {validDraftCount === 0 ? (
                        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                          Chưa có câu hợp lệ. Hãy import file, dán danh sách, hoặc chuyển sang{' '}
                          <strong className="text-foreground">Soạn từng câu</strong>.
                        </p>
                      ) : (
                        questionDrafts
                          .filter((q) => q.prompt.trim().length > 0)
                          .map((q, idx) => (
                            <div
                              key={`${q.id}-prev`}
                              className="rounded-lg border border-border/80 bg-card px-3 py-2.5"
                            >
                              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                Câu {idx + 1}
                              </p>
                              <p
                                className="mt-1 line-clamp-3 text-sm font-medium leading-snug text-foreground"
                                title={q.prompt.trim()}
                              >
                                {q.prompt.trim()}
                              </p>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      disabled={busySaveQuestions}
                      className="h-12 w-full rounded-xl text-base font-bold shadow-md shadow-primary/15"
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
                      {busySaveQuestions ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Đang lưu…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Lưu bộ câu hỏi cho kỳ T{month}/{year}
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Sau khi lưu, nhân sự thấy form cập nhật ở cột «Trả lời khảo sát» bên trái.
                    </p>
                  </div>
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
                              <div className="text-xs font-bold text-slate-400 uppercase">
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
