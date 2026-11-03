import { InfoHint } from '@/components/shared/InfoHint'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLearningOpsSummary } from '@/features/dashboard/hooks'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { LEVEL_LABELS, LEVELS, type LevelCode } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import { Link } from '@tanstack/react-router'
import { BookOpen, CalendarRange, GraduationCap, School, Users } from 'lucide-react'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const quartOut = '[transition-timing-function:cubic-bezier(0.25,1,0.48,1)]'

const LEVEL_PIE_COLORS: Record<LevelCode, string> = {
  tap_su: 'hsl(262 83% 55%)',
  biet_viec: 'hsl(199 85% 50%)',
  duoc_viec: 'hsl(160 55% 42%)',
  dong_gop_ket_qua: 'hsl(32 90% 52%)',
  tuong: 'hsl(350 70% 52%)',
}

const LEVELS_HINT = 'Số người theo cấp bậc nghề nghiệp hiện lưu trên hồ sơ (snapshot).'

const ACTIVE_CLASSES_HINT =
  'Chỉ tính lớp có trạng thái Đang mở và khoảng hoạt động giao với kỳ đang lọc. Lớp cũ chưa nhập ngày bắt đầu dùng ngày tạo lớp; không có ngày kết thúc nghĩa là lớp vẫn đang tiếp tục.'

/* ──────────── Bar chart ──────────── */

function LevelBarChart({
  levelData,
}: {
  levelData: { code: string; name: string; value: number }[]
}) {
  const total = levelData.reduce((s, d) => s + d.value, 0)

  const chartData = useMemo(
    () =>
      levelData.map((entry) => ({
        name: entry.name,
        code: entry.code,
        value: entry.value,
        pct: total > 0 ? Math.round((entry.value / total) * 100) : 0,
        fill: LEVEL_PIE_COLORS[entry.code as LevelCode] ?? 'hsl(var(--primary))',
      })),
    [levelData, total]
  )

  const yAxisMax = Math.max(1, ...chartData.map((d) => d.value))

  return (
    <div className="space-y-4">
      <div className="h-40 w-full sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, yAxisMax]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted)/0.3)', rx: 8 }}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                fontSize: 13,
              }}
              formatter={(value: number) => [`${value} người`, 'Số lượng']}
            />
            <Bar
              dataKey="value"
              radius={[8, 8, 0, 0]}
              maxBarSize={64}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            >
              {chartData.map((entry) => (
                <Cell key={entry.code} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-end border-t border-border/40 pt-2.5">
        <span className="text-xs text-muted-foreground">Tổng cộng</span>
        <span className="ml-2 text-sm font-black tabular-nums text-foreground">{total}</span>
        <span className="ml-0.5 text-xs text-muted-foreground">người</span>
      </div>
    </div>
  )
}

function monthRangeLabelVi(year: number, startMonth: number, endMonth: number): string {
  if (startMonth === endMonth) return `T${startMonth} · ${year}`
  return `T${startMonth} – T${endMonth} · ${year}`
}

function formatDateVi(value: string | null): string {
  if (!value) return 'Chưa xác định'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function classPeriodLabel(startDate: string | null, endDate: string | null): string {
  if (startDate && endDate) return `${formatDateVi(startDate)} – ${formatDateVi(endDate)}`
  if (startDate) return `Từ ${formatDateVi(startDate)}`
  if (endDate) return `Đến ${formatDateVi(endDate)}`
  return 'Chưa xác định thời gian'
}

export type ManagerLearningOpsProps = {
  reportYear: number
  rangeStartMonth: number
  rangeEndMonth: number
}

export function ManagerLearningOpsZone({
  reportYear,
  rangeStartMonth,
  rangeEndMonth,
}: ManagerLearningOpsProps) {
  const { canId } = usePermission()
  const { data, isLoading, isError, refetch, isFetching } = useLearningOpsSummary(
    reportYear,
    rangeStartMonth,
    rangeEndMonth,
    { enabled: true }
  )

  const rangeLabel = monthRangeLabelVi(reportYear, rangeStartMonth, rangeEndMonth)

  const levelChart = useMemo(() => {
    const src = data?.peopleByCareerLevel ?? {}
    return LEVELS.map((code) => ({
      code,
      name: LEVEL_LABELS[code],
      value: src[code] ?? 0,
    }))
  }, [data?.peopleByCareerLevel])

  const hasAnyLevel = levelChart.some((d) => d.value > 0)
  const openClasses = (data?.classesActiveInPeriod ?? []).filter((row) => row.status === 'open')
  const openClassMembers = openClasses.reduce((sum, row) => sum + row.memberCount, 0)

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between',
          'motion-safe:animate-[dash-fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Vận hành &amp; phân bổ
          </h2>
          <span
            className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-primary"
            title="Kỳ đang lọc"
          >
            {rangeLabel}
          </span>
        </div>
        {isFetching && !isLoading ? (
          <span className="text-xs font-medium text-muted-foreground">Đang tải…</span>
        ) : null}
      </div>

      {isError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          Không tải được thống kê.{' '}
          <Button
            type="button"
            variant="ghost"
            className="h-auto p-0 font-semibold text-destructive underline hover:bg-transparent"
            onClick={() => void refetch()}
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border/80 bg-card/95 p-3 shadow-[var(--shadow-card)] sm:p-4',
          quartOut,
          CARD_ENTRANCE_HOVER,
          'transition-all duration-300 hover:border-primary/20',
          'motion-safe:animate-[dash-fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'
        )}
        style={{ animationDelay: '40ms', ...staggerStyle(0, 50) }}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-accent/10 text-primary">
            <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            Phân bổ nhân sự theo cấp bậc
          </h3>
          <InfoHint text={LEVELS_HINT} label="Cách tính phân bổ cấp độ" />
        </div>
        {isLoading && !data ? (
          <Skeleton className="h-44 w-full rounded-lg" />
        ) : !hasAnyLevel ? (
          <p className="flex min-h-[140px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/25 px-4 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu cấp độ trong kỳ này.
          </p>
        ) : (
          <LevelBarChart levelData={levelChart} />
        )}
      </div>

      <section
        className={cn(
          'overflow-hidden rounded-xl border border-border/80 bg-card/95 p-3 shadow-[var(--shadow-card)] sm:p-4',
          quartOut,
          CARD_ENTRANCE_HOVER,
          'transition-all duration-300 hover:border-primary/20',
          'motion-safe:animate-[dash-fade-up_0.5s_ease-out_both] motion-reduce:animate-none'
        )}
        style={{ animationDelay: '100ms' }}
        aria-label="Lớp học đang mở trong kỳ"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <School className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            Lớp học đang mở trong kỳ
          </h3>
          <InfoHint text={ACTIVE_CLASSES_HINT} label="Cách tính lớp học đang mở trong kỳ" />
          {canId('manager.classes') || canId('hr.classes.view') ? (
            <Link
              to="/manager/classes"
              search={{ tab: undefined }}
              className="ml-auto text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              Quản lý lớp học
            </Link>
          ) : null}
        </div>

        {isLoading && !data ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        ) : openClasses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-4 text-center text-sm text-muted-foreground">
            Chưa có lớp đang mở trong kỳ đã chọn.
          </p>
        ) : (
          <>
            <dl className="mb-3 grid grid-cols-2 divide-x divide-border/60 rounded-lg border border-border/60 bg-muted/20">
              <div className="px-3 py-2.5">
                <dt className="text-xs font-medium text-muted-foreground">Lớp đang mở</dt>
                <dd className="mt-0.5 text-xl font-black tabular-nums text-foreground">
                  {openClasses.length}
                </dd>
              </div>
              <div className="px-3 py-2.5">
                <dt className="text-xs font-medium text-muted-foreground">Lượt học viên</dt>
                <dd className="mt-0.5 text-xl font-black tabular-nums text-foreground">
                  {openClassMembers}
                </dd>
              </div>
            </dl>

            <div className="divide-y divide-border/60 rounded-xl border border-border/60 md:hidden">
              {openClasses.map((row) => (
                <div key={row.id} className="space-y-2 p-4 odd:bg-background/40">
                  <div className="flex items-start justify-between gap-3">
                    <p className="break-words font-semibold text-foreground">{row.name}</p>
                    <span className="shrink-0 rounded-full bg-success-muted px-2 py-0.5 text-xs font-semibold text-success">
                      Đang mở
                    </span>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarRange className="size-3.5 shrink-0" aria-hidden />
                    {classPeriodLabel(row.startDate, row.endDate)}
                  </p>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {row.isKnowledgeWork ? (
                        <GraduationCap className="size-3.5" aria-hidden />
                      ) : (
                        <BookOpen className="size-3.5" aria-hidden />
                      )}
                      {row.isKnowledgeWork ? 'Lớp tri thức' : 'Lớp học khác'}
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold tabular-nums text-foreground">
                      <Users className="size-3.5" aria-hidden />
                      {row.memberCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-border/60 md:block">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40">
                    <th className="px-3 py-2.5 font-bold text-foreground sm:px-4">Tên lớp</th>
                    <th className="px-3 py-2.5 font-bold text-foreground sm:px-4">Loại lớp</th>
                    <th className="min-w-[13rem] px-3 py-2.5 font-bold text-foreground sm:px-4">
                      Thời gian
                    </th>
                    <th className="px-3 py-2.5 font-bold text-foreground sm:px-4">Trạng thái</th>
                    <th className="w-24 px-3 py-2.5 text-right font-bold text-foreground sm:px-4">
                      Học viên
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {openClasses.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/50 last:border-0 odd:bg-background/40 transition-colors hover:bg-muted/20"
                    >
                      <td className="max-w-[16rem] px-3 py-2.5 font-semibold text-foreground sm:px-4">
                        <span className="line-clamp-2">{row.name}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-muted-foreground sm:px-4">
                        {row.isKnowledgeWork ? 'Lớp tri thức' : 'Lớp học khác'}
                      </td>
                      <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground sm:px-4">
                        {classPeriodLabel(row.startDate, row.endDate)}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <span className="inline-flex rounded-full bg-success-muted px-2 py-0.5 text-xs font-semibold text-success">
                          Đang mở
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-black tabular-nums text-foreground sm:px-4">
                        {row.memberCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
