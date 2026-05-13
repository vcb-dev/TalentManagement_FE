import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2, ChevronDown, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import { performanceApi, type PerformanceKind } from '@/features/kpi-okr/api'
import { useHrOrgSelectOptions } from '@/features/hr-admin/useHrOrgTree'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useEffect } from 'react'
import {
  rewardAdminApi,
  type RewardThreshold,
  TEMPLATE_METRIC_LABELS,
} from '@/features/reward-admin/api'

// ─── Types ──────────────────────────────────────────────────────────────────

type TeamInfo = { id: string; name: string; deptId: string; deptName: string }

type MetricEntry = {
  content: string
  kind: PerformanceKind
  priority: number
  targetMetric: string | null
  numericUnit: string | null
  teamIds: Set<string>
  isMandatory: boolean
  isRanking: boolean
}

const PRIORITY_OPTIONS = [
  { value: 1, label: 'P1 — Cao' },
  { value: 2, label: 'P2 — Trung bình' },
  { value: 3, label: 'P3 — Thấp' },
  { value: 4, label: 'P4 — Tùy chọn' },
]

// ─── Add / Edit dialog ───────────────────────────────────────────────────────

function AddEditDialog({
  open,
  onClose,
  allTeams,
  initial,
  year,
  month,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  allTeams: TeamInfo[]
  initial?: MetricEntry | null
  year: number
  month: number
  onSaved: () => void
}) {
  const [content, setContent] = useState(initial?.content ?? '')
  const [kind, setKind] = useState<PerformanceKind>(initial?.kind ?? 'KPI')
  const [priority, setPriority] = useState(initial?.priority ?? 2)
  const [targetMetric, setTargetMetric] = useState(initial?.targetMetric ?? '')
  const [numericUnit, setNumericUnit] = useState(initial?.numericUnit ?? '')
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(
    () => new Set(initial?.teamIds ?? [])
  )
  const [saving, setSaving] = useState(false)
  const [deptOpen, setDeptOpen] = useState<Set<string>>(
    () => new Set(allTeams.map((t) => t.deptId))
  )

  const teamsByDept = useMemo(() => {
    const map = new Map<string, { deptName: string; teams: TeamInfo[] }>()
    for (const t of allTeams) {
      if (!map.has(t.deptId)) map.set(t.deptId, { deptName: t.deptName, teams: [] })
      map.get(t.deptId)!.teams.push(t)
    }
    return map
  }, [allTeams])

  const toggleTeam = (id: string) =>
    setSelectedTeamIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleDept = (deptId: string) => {
    const teams = teamsByDept.get(deptId)?.teams ?? []
    const allSel = teams.every((t) => selectedTeamIds.has(t.id))
    setSelectedTeamIds((prev) => {
      const next = new Set(prev)
      teams.forEach((t) => (allSel ? next.delete(t.id) : next.add(t.id)))
      return next
    })
  }

  const toggleDeptOpen = (deptId: string) =>
    setDeptOpen((prev) => {
      const next = new Set(prev)
      next.has(deptId) ? next.delete(deptId) : next.add(deptId)
      return next
    })

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung chỉ số')
      return
    }
    if (!selectedTeamIds.size) {
      toast.error('Vui lòng chọn ít nhất 1 team')
      return
    }
    setSaving(true)
    try {
      if (initial) {
        const toAdd = [...selectedTeamIds].filter((id) => !initial.teamIds.has(id))
        const toRemove = [...initial.teamIds].filter((id) => !selectedTeamIds.has(id))
        const toUpdate = [...selectedTeamIds].filter((id) => initial.teamIds.has(id))
        await Promise.all([
          ...toAdd.map((teamId) =>
            performanceApi.cascadeAddAssignment(teamId, {
              year,
              month,
              content: content.trim(),
              kind,
              priority,
              targetMetric: targetMetric || null,
              numericUnit: numericUnit || null,
              category: 'KPI_BONUS',
              syncTemplate: true,
            })
          ),
          ...toRemove.map((teamId) =>
            performanceApi.cascadeDeleteByContent(teamId, {
              year,
              month,
              content: initial.content,
              syncTemplate: true,
            })
          ),
          ...toUpdate.map((teamId) =>
            performanceApi.cascadeUpdateByContent(teamId, {
              year,
              month,
              oldContent: initial.content,
              newContent: content.trim() !== initial.content ? content.trim() : undefined,
              targetMetric: targetMetric || null,
              numericUnit: numericUnit || null,
              priority,
              syncTemplate: true,
            })
          ),
        ])
        toast.success('Đã cập nhật chỉ số.')
      } else {
        await Promise.all(
          [...selectedTeamIds].map((teamId) =>
            performanceApi.cascadeAddAssignment(teamId, {
              year,
              month,
              content: content.trim(),
              kind,
              priority,
              targetMetric: targetMetric || null,
              numericUnit: numericUnit || null,
              category: 'KPI_BONUS',
              syncTemplate: true,
            })
          )
        )
        toast.success(`Đã thêm chỉ số cho ${selectedTeamIds.size} team.`)
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Sửa chỉ số' : 'Thêm chỉ số mới'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {initial
              ? 'Cập nhật nội dung và team áp dụng.'
              : 'Chỉ số sẽ được tạo cho tất cả thành viên active trong team đã chọn.'}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Content */}
          <div className="space-y-1.5">
            <Label>
              Nội dung <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Tên chỉ số / mục tiêu"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={initial?.isMandatory}
            />
          </div>

          {/* Kind + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Loại</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as PerformanceKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KPI">KPI</SelectItem>
                  <SelectItem value="OKR">OKR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ưu tiên</Label>
              <Select value={String(priority)} onValueChange={(v) => setPriority(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Chỉ tiêu</Label>
              <Input
                placeholder="VD: 100,000,000"
                value={targetMetric}
                onChange={(e) => setTargetMetric(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Đơn vị</Label>
              <Input
                placeholder="VD: VND, views"
                value={numericUnit}
                onChange={(e) => setNumericUnit(e.target.value)}
              />
            </div>
          </div>

          {/* Team multi-select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                Áp dụng cho team <span className="text-destructive">*</span>
              </Label>
              {selectedTeamIds.size > 0 && (
                <span className="text-xs font-medium text-primary">
                  {selectedTeamIds.size} team đã chọn
                </span>
              )}
            </div>
            <div className="max-h-52 overflow-y-auto rounded-lg border divide-y bg-white dark:bg-slate-950">
              {[...teamsByDept.entries()].map(([deptId, { deptName, teams }]) => {
                const allSel = teams.every((t) => selectedTeamIds.has(t.id))
                const someSel = !allSel && teams.some((t) => selectedTeamIds.has(t.id))
                const isOpen = deptOpen.has(deptId)
                return (
                  <div key={deptId}>
                    <div className="flex items-center gap-0 bg-slate-50 dark:bg-slate-900">
                      <div
                        className="flex flex-1 items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => toggleDept(deptId)}
                      >
                        <Checkbox
                          checked={allSel ? true : someSel ? 'indeterminate' : false}
                          onCheckedChange={() => toggleDept(deptId)}
                        />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {deptName}
                        </span>
                        <span className="ml-auto text-[11px] text-slate-400">
                          {teams.filter((t) => selectedTeamIds.has(t.id)).length}/{teams.length}
                        </span>
                      </div>
                      <button
                        className="px-2 py-2.5 text-slate-400 hover:text-slate-600"
                        onClick={() => toggleDeptOpen(deptId)}
                      >
                        <ChevronDown
                          className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')}
                        />
                      </button>
                    </div>
                    {isOpen &&
                      teams.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-2.5 px-3 py-2 pl-9 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          onClick={() => toggleTeam(t.id)}
                        >
                          <Checkbox
                            checked={selectedTeamIds.has(t.id)}
                            onCheckedChange={() => toggleTeam(t.id)}
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {t.name}
                          </span>
                        </div>
                      ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : initial ? 'Lưu thay đổi' : 'Thêm cho team đã chọn'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function ManagerKpiOkrScreen() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<MetricEntry | null>(null)
  const [activeTab, setActiveTab] = useState<'metrics' | 'thresholds'>('metrics')
  const [thresholds, setThresholds] = useState<RewardThreshold[]>([])
  const [thresholdsLoading, setThresholdsLoading] = useState(false)
  const qc = useQueryClient()

  const { departments, teamsByDept: teamsByDeptMap } = useHrOrgSelectOptions()

  const allTeams = useMemo<TeamInfo[]>(
    () =>
      departments.flatMap((d) =>
        (teamsByDeptMap.get(d.value) ?? []).map((t) => ({
          id: t.value,
          name: t.label,
          deptId: d.value,
          deptName: d.label,
        }))
      ),
    [departments, teamsByDeptMap]
  )

  // Server-side aggregated summary — 1 request, BE handles grouping + isMandatory/isRanking flags
  const { data: summaryData = [], isLoading: summaryLoading } = useQuery({
    queryKey: ['mgr-kpi-summary', year, month],
    queryFn: () => performanceApi.getManagerAssignmentSummary(year, month),
    staleTime: 30_000,
    enabled: !isMockApiEnabled(),
  })

  const isLoading = summaryLoading

  const metrics = useMemo<MetricEntry[]>(
    () => summaryData.map((r) => ({ ...r, teamIds: new Set(r.teamIds) })),
    [summaryData]
  )

  const filtered = useMemo(() => {
    const mandatory = metrics.filter((m) => m.isMandatory)
    if (!search.trim()) return mandatory
    const q = search.toLowerCase()
    return mandatory.filter((m) => m.content.toLowerCase().includes(q))
  }, [metrics, search])

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['mgr-kpi-cfg-batch'] })
  }

  // Fetch thresholds when tab switches
  const fetchThresholds = async () => {
    setThresholdsLoading(true)
    try {
      const data = await rewardAdminApi.listThresholds(year, month)
      setThresholds(data)
    } catch {
      setThresholds([])
    } finally {
      setThresholdsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'thresholds') fetchThresholds()
  }, [activeTab, year, month])

  const handleDelete = async (entry: MetricEntry) => {
    if (!confirm(`Xóa chỉ số "${entry.content}" khỏi ${entry.teamIds.size} team?`)) return
    try {
      await Promise.all(
        [...entry.teamIds].map((teamId) =>
          performanceApi.cascadeDeleteByContent(teamId, {
            year,
            month,
            content: entry.content,
            allowMandatory: true,
            syncTemplate: true,
          })
        )
      )
      toast.success('Đã xóa chỉ số.')
      invalidateAll()
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Cấu hình chỉ số cố định KPI/OKR
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quản lý các chỉ số bắt buộc cho từng team. Thay đổi sẽ đồng bộ xuống trưởng nhóm và nhân
            viên.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/leader/kpi-sales-config">
              <Settings2 className="h-4 w-4" />
              Cấu hình KPI Kinh doanh
            </Link>
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Thêm chỉ số cố định
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            className="pl-9 h-9"
            placeholder="Tìm chỉ số..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="h-9 w-32">
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
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="h-9 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('metrics')}
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'metrics'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          📋 Chỉ số cố định
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('thresholds')}
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'thresholds'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          🎯 Ngưỡng Min khen thưởng
        </button>
      </div>

      {activeTab === 'metrics' && (
        <>
          {/* Summary + legend */}
          {!isLoading && filtered.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800">
                {filtered.length} chỉ số cố định
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                <span>🏆</span>
                <span>Thi đua</span>
              </span>
              <span className="text-slate-400">
                = tính vào xếp hạng &amp; khen thưởng hàng tháng
              </span>
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl border bg-white shadow-sm dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[2fr_72px_88px_160px_1fr_72px] gap-4 border-b bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900/60">
              <span>Nội dung</span>
              <span>Loại</span>
              <span>Ưu tiên</span>
              <span>Chỉ tiêu</span>
              <span>Team áp dụng</span>
              <span className="text-right">Thao tác</span>
            </div>

            {isLoading ? (
              <div className="divide-y">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-slate-400">
                  {search ? 'Không tìm thấy chỉ số phù hợp.' : 'Chưa có chỉ số nào cho kỳ này.'}
                </p>
                {!search && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm chỉ số đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((entry) => (
                  <div
                    key={entry.content}
                    className="group grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40 md:grid-cols-[2fr_72px_88px_160px_1fr_72px] md:items-center md:gap-4 md:py-3"
                  >
                    {/* Content */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {entry.content}
                      </span>
                      {entry.isRanking && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                          🏆 Thi đua
                        </span>
                      )}
                    </div>

                    {/* Kind */}
                    <div className="flex md:block">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[11px] font-semibold',
                          entry.kind === 'KPI'
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                        )}
                      >
                        {entry.kind}
                      </Badge>
                    </div>

                    {/* Priority */}
                    <div className="flex md:block">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[11px]',
                          entry.priority === 1
                            ? 'border-rose-200 bg-rose-50 text-rose-600'
                            : entry.priority === 2
                              ? 'border-amber-200 bg-amber-50 text-amber-600'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                        )}
                      >
                        P{entry.priority}
                      </Badge>
                    </div>

                    {/* Target */}
                    <span className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {entry.targetMetric ? (
                        `${entry.targetMetric}${entry.numericUnit ? ` ${entry.numericUnit}` : ''}`
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </span>

                    {/* Teams */}
                    <div className="flex flex-wrap items-center gap-1">
                      {[...entry.teamIds].slice(0, 4).map((tid) => {
                        const t = allTeams.find((x) => x.id === tid)
                        return t ? (
                          <span
                            key={tid}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {t.name}
                          </span>
                        ) : null
                      })}
                      {entry.teamIds.size > 4 && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-400 dark:bg-slate-800">
                          +{entry.teamIds.size - 4} team
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => setEditEntry(entry)}
                        title="Sửa"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => void handleDelete(entry)}
                        title="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add dialog */}
          {addOpen && (
            <AddEditDialog
              open
              onClose={() => setAddOpen(false)}
              allTeams={allTeams}
              year={year}
              month={month}
              onSaved={invalidateAll}
            />
          )}

          {/* Edit dialog */}
          {editEntry && (
            <AddEditDialog
              open
              onClose={() => setEditEntry(null)}
              allTeams={allTeams}
              initial={editEntry}
              year={year}
              month={month}
              onSaved={() => {
                invalidateAll()
                setEditEntry(null)
              }}
            />
          )}
        </>
      )}

      {activeTab === 'thresholds' && (
        <div className="rounded-xl border bg-white shadow-sm dark:bg-slate-950 overflow-hidden">
          <div className="border-b bg-slate-50 px-5 py-3 dark:bg-slate-900/60">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              🎯 Ngưỡng tối thiểu để xét khen thưởng — Tháng {month}/{year}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Chỉ những KPI đạt ngưỡng Min mới được tính vào bảng xếp hạng và khen thưởng.
            </p>
          </div>
          {thresholdsLoading ? (
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : thresholds.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400">Chưa có ngưỡng Min nào cho kỳ này.</p>
              <p className="mt-1 text-xs text-slate-300">
                HR có thể cấu hình trong mục Quản lý khen thưởng.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              <div className="hidden md:grid grid-cols-[2fr_100px_1fr_80px] gap-4 border-b bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900/60">
                <span>Chỉ số</span>
                <span>Template</span>
                <span>Ngưỡng Min</span>
                <span className="text-right">Đơn vị</span>
              </div>
              {thresholds.map((t) => {
                const labelMap = TEMPLATE_METRIC_LABELS[t.templateCode] ?? {}
                const friendlyLabel = labelMap[t.metricKey] ?? t.metricKey
                return (
                  <div
                    key={t.id}
                    className="grid grid-cols-1 gap-2 px-5 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40 md:grid-cols-[2fr_100px_1fr_80px] md:items-center md:gap-4"
                  >
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {friendlyLabel}
                    </span>
                    <Badge variant="outline" className="text-[10px] w-fit">
                      {t.templateCode}
                    </Badge>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {t.minValue.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 md:text-right">
                      {t.minUnit}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
