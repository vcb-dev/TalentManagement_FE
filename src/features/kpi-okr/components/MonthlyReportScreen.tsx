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
import { Skeleton } from '@/components/ui/skeleton'
import { CARD_ENTRANCE, CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { performanceApi } from '@/features/kpi-okr/api'
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

function assignmentStatusLabel(status: 'not_started' | 'in_progress' | 'done' | 'blocked') {
  if (status === 'done') return 'Hoàn thành'
  if (status === 'in_progress') return 'Đang thực hiện'
  if (status === 'blocked') return 'Bị chặn'
  return 'Chưa bắt đầu'
}

/** Báo cáo hàng tháng — member (cá nhân) / leader (team). Nội dung nối API sau. */
export function MonthlyReportScreen() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const user = useAuthStore((s) => s.user)
  const userId = user?.id
  const isLeader = role === 'LEADER'
  const { year: currentYear, month: currentMonth } = nowYm()
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

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
    !userId || isLeader ? summariesData : summariesData.filter((x) => x.assigneeUserId === userId)

  const assignmentsByUser = new Map<string, typeof assignmentsData>()
  for (const item of assignmentsData) {
    const rows = assignmentsByUser.get(item.assigneeUserId) ?? []
    rows.push(item)
    assignmentsByUser.set(item.assigneeUserId, rows)
  }

  const selectedDetailUserId = (() => {
    if (selectedUserId && assignmentsByUser.has(selectedUserId)) return selectedUserId
    if (!isLeader && userId && assignmentsByUser.has(userId)) return userId
    const first = assignmentsByUser.keys().next().value
    return typeof first === 'string' ? first : ''
  })()

  const detailRows = selectedDetailUserId ? (assignmentsByUser.get(selectedDetailUserId) ?? []) : []

  const doneCount = assignmentsData.filter((x) => x.status === 'done').length

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
            {isLeader ? 'Báo cáo hàng tháng (team)' : 'Báo cáo hàng tháng'}
          </span>
        </h1>
        <p className={PAGE_HEADER_DESCRIPTION}>
          {isLeader
            ? 'Tổng hợp báo cáo theo tháng của các thành viên trong team.'
            : 'Theo dõi báo cáo tiến độ KPI/OKR theo từng tháng.'}
        </p>
      </div>

      <Card
        className={cn(
          'rounded-2xl border border-primary/20 bg-gradient-to-br from-blue-50/90 via-card to-fuchsia-50/85 shadow-[0_12px_30px_-12px_rgb(106_90_224/0.28)] backdrop-blur-[2px]',
          CARD_ENTRANCE_HOVER
        )}
      >
        <CardHeader className="pb-4">
          <CardTitle className="text-xl md:text-2xl text-game-soft-foreground">
            Chọn kỳ báo cáo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Phòng ban
              </Label>
              <select
                className="h-10 rounded-lg border border-input bg-background/90 px-3 text-sm"
                value={selectedDept?.id ?? ''}
                onChange={(e) => {
                  const dept = departments.find((d) => d.id === e.target.value)
                  setSelectedTeamId(dept?.teams[0]?.id ?? '')
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
                className="h-10 rounded-lg border border-input bg-background/90 px-3 text-sm"
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
                className="h-10 rounded-lg border border-input bg-background/90 px-3 text-sm"
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
                min={2020}
                max={2035}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-violet-300 bg-violet-50 text-violet-700 shadow-sm"
            >
              Kỳ: T{month + '/' + year}
            </Badge>
            <Badge className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
              Tổng mục tiêu: {assignmentsData.length}
            </Badge>
            <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              Hoàn thành: {doneCount}
            </Badge>
            <Button
              type="button"
              variant="outline"
              className="ml-auto inline-flex items-center gap-1 border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
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
              {isLeader ? (
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
                      <TableHead>Hạng mục</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Tiến độ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>QL đánh giá</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailRows.map((item) => (
                      <TableRow key={item.id} className="transition-colors hover:bg-blue-500/5">
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
                        <TableCell className="max-w-[680px] whitespace-pre-wrap">
                          {item.content}
                        </TableCell>
                        <TableCell>{item.progressPercent}%</TableCell>
                        <TableCell>{assignmentStatusLabel(item.status)}</TableCell>
                        <TableCell>{item.managerEvalStatus?.trim() || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
