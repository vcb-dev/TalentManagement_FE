import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TextareaController, SelectController } from '@/components/ui/form-controllers'
import { Form } from '@/components/ui/form'
import { performanceApi, type LeaderEvaluationRow } from '@/features/kpi-okr/api'
import { useHrOrgTree } from '@/features/hr-admin/useHrOrgTree'
import { useAuthStore } from '@/stores/auth.store'
import { PencilIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const PERIOD_YEARS = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function LeaderReviewScreen() {
  const user = useAuthStore((s) => s.user)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [departmentId, setDepartmentId] = useState<string>('')
  const queryClient = useQueryClient()

  const treeQ = useHrOrgTree()
  const divisions = treeQ.data?.departments ?? []
  const treeReady = treeQ.isSuccess && divisions.length > 0
  /** Manager chỉ thấy một phòng ban trong cây org → không cần dropdown lọc. */
  const fixedDivisionOnly = treeReady && divisions.length === 1
  const fixedDivisionName = fixedDivisionOnly ? divisions[0]?.name : null

  useEffect(() => {
    if (!treeReady) return
    setDepartmentId((prev) => {
      if (prev) return prev
      if (divisions.length === 1) return divisions[0]!.id
      const sid = user?.departmentId?.trim()
      if (sid && divisions.some((d) => d.id === sid)) return sid
      /** Session cũ / mapping sai: suy division từ team của user trong cây org */
      const tid = user?.teamIds?.[0]
      if (tid) {
        for (const d of divisions) {
          if (d.teams.some((t) => t.id === tid)) return d.id
        }
      }
      return prev
    })
  }, [treeReady, divisions, user?.departmentId, user?.teamIds])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['performance', 'leader-evaluations', departmentId, year, month],
    queryFn: () => performanceApi.listLeaderEvaluations(departmentId, year, month),
    enabled: !!departmentId,
  })

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Đánh giá Leader
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manager chấm điểm KPI/OKR cho Leader thuộc phòng ban quản lý.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phòng ban</Label>
              {fixedDivisionOnly ? (
                <div className="flex h-9 min-w-[220px] items-center rounded-lg border border-transparent px-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {fixedDivisionName ?? '—'}
                </div>
              ) : (
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="w-[220px] h-9 rounded-lg">
                    <SelectValue placeholder="Chọn phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Năm</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[100px] h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tháng</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[90px] h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      T{m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leader List */}
      {!departmentId ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-sm text-slate-400">
            {treeQ.isLoading
              ? 'Đang tải danh sách phòng ban…'
              : divisions.length === 0
                ? 'Không có phòng ban trong phạm vi của bạn.'
                : 'Chọn phòng ban để xem danh sách Leader.'}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError || !data ? (
        <Card className="border-dashed border-rose-200">
          <CardContent className="pt-6 text-center text-sm text-rose-500">
            Lỗi khi tải dữ liệu — vui lòng thử lại.
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-sm text-slate-400">
            Phòng ban này chưa có Leader.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((leader) => (
            <LeaderEvaluationRow
              key={leader.userId}
              leader={leader}
              year={year}
              month={month}
              onSaved={() =>
                queryClient.invalidateQueries({
                  queryKey: ['performance', 'leader-evaluations', departmentId, year, month],
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LeaderEvaluationRow({
  leader,
  year,
  month,
  onSaved,
}: {
  leader: LeaderEvaluationRow
  year: number
  month: number
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)

  const form = useForm({
    defaultValues: {
      overallComment: leader.evaluation?.overallComment ?? '',
      managerScoreLabel: leader.evaluation?.managerScoreLabel ?? '',
    },
  })

  const { control, handleSubmit, reset } = form

  const onSubmit = handleSubmit(async (values) => {
    try {
      await performanceApi.patchLeaderEvaluation(leader.userId, year, month, {
        overallComment: values.overallComment || null,
        managerScoreLabel: values.managerScoreLabel || null,
      })
      toast.success(`Da danh gia ${leader.displayName}`)
      setOpen(false)
      onSaved()
    } catch {
      toast.error('Danh gia that bai')
    }
  })

  const kpiTotal = leader.kpiOkCount + leader.kpiNotCount
  const evalScore = leader.evaluation?.managerScoreLabel

  return (
    <Card className="group transition-all hover:shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-950">
            {leader.displayName?.charAt(0) ?? '?'}
          </div>
          <div>
            <div className="font-medium text-slate-800 dark:text-slate-200">
              {leader.displayName || leader.email || 'Chưa rõ'}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span>
                KPI: {leader.kpiOkCount}/{kpiTotal}
              </span>
              {evalScore && (
                <Badge
                  variant="outline"
                  className={cn(
                    'h-4 text-[9px] font-extrabold px-1',
                    evalScore === 'A'
                      ? 'border-emerald-200 text-emerald-600'
                      : evalScore === 'B'
                        ? 'border-amber-200 text-amber-600'
                        : 'border-rose-200 text-rose-600'
                  )}
                >
                  {evalScore}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                reset({
                  overallComment: leader.evaluation?.overallComment ?? '',
                  managerScoreLabel: leader.evaluation?.managerScoreLabel ?? '',
                })
              }}
            >
              <PencilIcon className="h-3.5 w-3.5" />
              {leader.evaluation?.managerScoreLabel ? 'Sua danh gia' : 'Cham diem'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Đánh giá Leader — T{month}/{year}
              </DialogTitle>
              <DialogDescription>
                Chấm điểm và nhận xét cho <strong>{leader.displayName}</strong>.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                <SelectController
                  control={control}
                  name="managerScoreLabel"
                  label="Danh gia"
                  className="space-y-1.5 text-xs font-medium"
                >
                  <SelectItem value="A">A — Xuat sac</SelectItem>
                  <SelectItem value="B">B — Kha</SelectItem>
                  <SelectItem value="C">C — Can cai thien</SelectItem>
                </SelectController>
                <TextareaController
                  control={control}
                  name="overallComment"
                  label="Nhan xet"
                  placeholder="Nhan xet tong quat ve Leader..."
                  className="space-y-1.5 text-xs font-medium"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Huỷ
                  </Button>
                  <Button type="submit" size="sm">
                    Lưu đánh giá
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
