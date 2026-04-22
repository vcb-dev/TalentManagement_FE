import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Calendar, RefreshCw, UserRound } from 'lucide-react'
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
import { performanceApi } from '@/features/kpi-okr/api'
import {
  clampKpiPeriod,
  getMaxViewableYm,
  isKpiPeriodSelectable,
} from '@/features/kpi-okr/kpiPeriodLimits'
import { FormPanel } from '@/features/kpi-okr/components/KpiOkrWorkspace'
import { useHrOrgTree, ORG_TREE_KEY } from '@/features/hr-admin/useHrOrgTree'
import { organizationApi } from '@/features/organization/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useAuthStore } from '@/stores/auth.store'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
            {canSeeTeamWide ? 'Báo cáo hàng tháng (team)' : 'Báo cáo hàng tháng'}
          </span>
        </h1>
        <p className={PAGE_HEADER_DESCRIPTION}>
          {isManager
            ? 'Tổng hợp KPI/OKR, chi tiết mục tiêu từng nhân sự và form khảo sát hàng tháng của team đã chọn.'
            : isLeader
              ? 'Tổng hợp báo cáo theo tháng của các thành viên trong team kèm danh sách phản hồi khảo sát.'
              : 'Theo dõi báo cáo tiến độ KPI/OKR và trả lời form khảo sát của Leader theo từng tháng.'}
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
                  Team / Đội nhóm
                </Label>
                <Select
                  value={selectedTeamId || '__none'}
                  onValueChange={(value) => setSelectedTeamId(value === '__none' ? '' : value)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <SelectValue placeholder="Chọn team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Chọn team —</SelectItem>
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

      {isMockApiEnabled() ? (
        <div className="mb-4 flex items-center gap-2 text-game-soft-foreground">
          <BarChart3 className="h-4 w-4 text-amber-700" strokeWidth={2} />
          <span className="text-sm text-amber-800">
            Mock API đang bật, màn báo cáo chỉ hiển thị khi gọi API thật.
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
            Chọn team để tải báo cáo hàng tháng.
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
            <CardContent>
              {summaryRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có dữ liệu tổng hợp cho kỳ đã chọn. Leader có thể tính lại tổng hợp ở màn KPI
                  & OKR.
                </p>
              ) : (
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
                      <TableRow key={row.id} className="transition-colors hover:bg-amber-500/5">
                        <TableCell>
                          {row.assigneeDisplayName?.trim() ||
                            row.assigneeEmail?.trim() ||
                            'Thành viên'}
                        </TableCell>
                        <TableCell>{row.kpiOkCount}</TableCell>
                        <TableCell>{row.kpiNotCount}</TableCell>
                        <TableCell className="font-semibold">{row.kpiGrade ?? '—'}</TableCell>
                        <TableCell>{row.okrOkCount}</TableCell>
                        <TableCell>{row.okrNotCount}</TableCell>
                        <TableCell className="font-semibold">{row.okrGrade ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

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
                      onClick={() => setSelectedUserId(uid)}
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-500/10">
                      <TableHead className="whitespace-nowrap">Ngày xét</TableHead>
                      <TableHead>Hạng mục</TableHead>
                      <TableHead className="whitespace-nowrap">Ưu tiên</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Chỉ tiêu</TableHead>
                      <TableHead className="whitespace-nowrap">QL đánh giá</TableHead>
                      <TableHead>QL nhận xét</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailRows.map((item) => (
                      <TableRow key={item.id} className="transition-colors hover:bg-blue-500/5">
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
                        <TableCell>
                          <EvalBadge status={item.managerEvalStatus} />
                        </TableCell>
                        <TableCell className="max-w-[280px] text-[12px] italic text-slate-500">
                          {item.managerReviewNote?.trim() || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

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
                  ? 'Danh sách câu trả lời của từng nhân sự trong team theo kỳ đã chọn.'
                  : 'Trả lời câu hỏi khảo sát hàng tháng do Leader thiết lập. Bấm "Gửi câu trả lời" để lưu.'}
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
              Quyền: <span className="font-semibold text-game-soft-foreground">view</span> trên{' '}
              <code className="rounded bg-white/80 px-1 py-0.5">monthly_report</code>
              {isLeader ? (
                <> · Leader có thể điều phối dữ liệu báo cáo ở màn KPI/OKR team.</>
              ) : null}
              {isManager ? (
                <>
                  {' '}
                  · Manager chỉ xem (read-only) dữ liệu tổng hợp, chi tiết mục tiêu và phản hồi khảo
                  sát của team.
                </>
              ) : null}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
