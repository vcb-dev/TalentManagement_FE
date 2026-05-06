import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarRange, Info, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { performanceApi, type PerformanceWindowConfig } from '@/features/kpi-okr/api'
import { useHrOrgSelectOptions } from '@/features/hr-admin/useHrOrgTree'
import { cn } from '@/lib/utils'
import { isMockApiEnabled } from '@/lib/mockEnv'

function clampDay(n: number): number {
  return Math.min(31, Math.max(1, Math.floor(n)))
}

export function PerformanceWindowConfigScreen() {
  const queryClient = useQueryClient()
  const mock = isMockApiEnabled()
  const { allTeams, isLoading: teamsLoading } = useHrOrgSelectOptions()

  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [scope, setScope] = useState<'global' | 'team'>('global')
  const [teamId, setTeamId] = useState('')
  const [assignStartDay, setAssignStartDay] = useState(1)
  const [assignEndDay, setAssignEndDay] = useState(2)
  const [answerStartDay, setAnswerStartDay] = useState(1)
  const [answerEndDay, setAnswerEndDay] = useState(5)

  const listQ = useQuery({
    queryKey: ['performance', 'window-configs'],
    queryFn: () => performanceApi.listWindowConfigs(),
    enabled: !mock,
    staleTime: 30_000,
  })

  const teamLabel = useMemo(() => {
    const m = new Map(allTeams.map((t) => [t.value, t.label] as const))
    return (id: string | null) => (id ? (m.get(id) ?? id.slice(0, 8)) : 'Toàn hệ thống')
  }, [allTeams])

  const upsertM = useMutation({
    mutationFn: performanceApi.upsertWindowConfig,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['performance', 'window-configs'] })
      toast.success('Đã lưu cấu hình cửa sổ.')
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : ''
      toast.error(msg || 'Không lưu được — kiểm tra quyền kpi.window_override và dữ liệu.')
    },
  })

  const applyRowToForm = (row: PerformanceWindowConfig) => {
    setYear(row.year)
    setMonth(row.month)
    setAssignStartDay(row.assignStartDay)
    setAssignEndDay(row.assignEndDay)
    setAnswerStartDay(row.answerStartDay)
    setAnswerEndDay(row.answerEndDay)
    if (row.teamId) {
      setScope('team')
      setTeamId(row.teamId)
    } else {
      setScope('global')
      setTeamId('')
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mock) return
    if (scope === 'team' && !teamId.trim()) {
      toast.error('Chọn team khi phạm vi là một team.')
      return
    }
    const as = clampDay(assignStartDay)
    const ae = clampDay(assignEndDay)
    const qs = clampDay(answerStartDay)
    const qe = clampDay(answerEndDay)
    if (ae < as || qe < qs) {
      toast.error('Ngày kết thúc phải ≥ ngày bắt đầu trong cùng một cửa sổ.')
      return
    }
    upsertM.mutate({
      teamId: scope === 'global' ? null : teamId.trim(),
      year,
      month,
      assignStartDay: as,
      assignEndDay: ae,
      answerStartDay: qs,
      answerEndDay: qe,
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarRange className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Cửa sổ giao KPI/OKR & khảo sát
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Đường dẫn trang:{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /hr-admin/settings/kpi-windows
            </code>
            . API{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              PUT /performance/window-configs
            </code>
            . Ưu tiên: cấu hình theo team → cấu hình toàn hệ thống (team trống) → mặc định giao ngày
            1–2, khảo sát 1–5.
          </p>
        </div>
      </div>

      {mock ? (
        <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex gap-2 pt-6 text-sm text-amber-900 dark:text-amber-100">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Đang bật mock API — tắt mock để chỉnh cửa sổ thật trên server.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thêm hoặc cập nhật</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Phạm vi</Label>
                <Select
                  value={scope}
                  onValueChange={(v) => setScope(v as 'global' | 'team')}
                  disabled={mock || upsertM.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      Toàn hệ thống (mọi team chưa có cấu hình riêng)
                    </SelectItem>
                    <SelectItem value="team">Một team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scope === 'team' ? (
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select
                    value={teamId}
                    onValueChange={setTeamId}
                    disabled={mock || upsertM.isPending || teamsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={teamsLoading ? 'Đang tải…' : 'Chọn team'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {allTeams.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="hidden sm:block" aria-hidden />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="w-year">Năm</Label>
                <Input
                  id="w-year"
                  type="number"
                  min={2020}
                  max={2035}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  disabled={mock || upsertM.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-month">Tháng</Label>
                <Input
                  id="w-month"
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  disabled={mock || upsertM.isPending}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Giao mục tiêu KPI/OKR (leader)
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="a-start">Ngày bắt đầu (trong tháng)</Label>
                  <Input
                    id="a-start"
                    type="number"
                    min={1}
                    max={31}
                    value={assignStartDay}
                    onChange={(e) => setAssignStartDay(Number(e.target.value))}
                    disabled={mock || upsertM.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="a-end">Ngày kết thúc</Label>
                  <Input
                    id="a-end"
                    type="number"
                    min={1}
                    max={31}
                    value={assignEndDay}
                    onChange={(e) => setAssignEndDay(Number(e.target.value))}
                    disabled={mock || upsertM.isPending}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trả lời khảo sát
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="q-start">Ngày bắt đầu</Label>
                  <Input
                    id="q-start"
                    type="number"
                    min={1}
                    max={31}
                    value={answerStartDay}
                    onChange={(e) => setAnswerStartDay(Number(e.target.value))}
                    disabled={mock || upsertM.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-end">Ngày kết thúc</Label>
                  <Input
                    id="q-end"
                    type="number"
                    min={1}
                    max={31}
                    value={answerEndDay}
                    onChange={(e) => setAnswerEndDay(Number(e.target.value))}
                    disabled={mock || upsertM.isPending}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={mock || upsertM.isPending}>
              {upsertM.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đã cấu hình (50 bản ghi gần nhất)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {listQ.isLoading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : listQ.isError ? (
            <p className="text-sm text-destructive">Không tải được danh sách.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phạm vi</TableHead>
                  <TableHead>Kỳ</TableHead>
                  <TableHead>Giao KPI/OKR</TableHead>
                  <TableHead>Khảo sát</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(listQ.data ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{teamLabel(row.teamId)}</TableCell>
                    <TableCell className="tabular-nums">
                      T{row.month}/{row.year}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {row.assignStartDay} → {row.assignEndDay}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {row.answerStartDay} → {row.answerEndDay}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => applyRowToForm(row)}
                        disabled={mock}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {(listQ.data ?? []).length === 0 && !listQ.isLoading ? (
            <p className={cn('mt-3 text-center text-sm text-muted-foreground')}>
              Chưa có bản ghi — đang dùng mặc định (giao 1–2, khảo sát 1–5).
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
