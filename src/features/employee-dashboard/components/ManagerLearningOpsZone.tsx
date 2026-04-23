import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, GraduationCap, School, TrendingDown, TrendingUp } from 'lucide-react'
import { useLearningOpsSummary } from '@/features/dashboard/hooks'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { LEVEL_LABELS, LEVELS, type LevelCode } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const quartOut = '[transition-timing-function:cubic-bezier(0.25,1,0.48,1)]'

function monthRangeLabelVi(year: number, startMonth: number, endMonth: number): string {
  if (startMonth === endMonth) return `Tháng ${startMonth} · ${year}`
  return `T${startMonth} – T${endMonth} · ${year}`
}

export type ManagerLearningOpsProps = {
  reportYear: number
  rangeStartMonth: number
  rangeEndMonth: number
}

/**
 * Tổng quan vận hành — kỳ (năm, từ/đến tháng) do parent truyền (cùng với bộ lọc KPI).
 */
export function ManagerLearningOpsZone({
  reportYear,
  rangeStartMonth,
  rangeEndMonth,
}: ManagerLearningOpsProps) {
  const { data, isLoading, isError, refetch, isFetching } = useLearningOpsSummary(
    reportYear,
    rangeStartMonth,
    rangeEndMonth,
    { enabled: true }
  )

  const inSingleMonth = rangeStartMonth === rangeEndMonth
  const rangeLabel = monthRangeLabelVi(reportYear, rangeStartMonth, rangeEndMonth)
  const periodText = inSingleMonth ? 'trong tháng' : 'trong kỳ'

  const chartData = useMemo(() => {
    const src = data?.peopleByCareerLevel ?? {}
    return LEVELS.map((code) => ({
      code,
      name: LEVEL_LABELS[code],
      value: src[code] ?? 0,
    }))
  }, [data?.peopleByCareerLevel])

  const maxCount = Math.max(1, ...chartData.map((d) => d.value))

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'motion-safe:animate-[dash-fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'
        )}
      >
        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-primary">
          Vận hành học tập &amp; thi
        </p>
        <h2 className="text-lg font-black tracking-tight text-foreground">Tổng quan theo kỳ</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {rangeLabel} — phân bổ cấp độ hiện tại, thăng cấp, thi cần học lại, và lớp mới tạo{' '}
          {periodText}.
        </p>
      </div>

      {isError ? (
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Không tải được thống kê.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Thử lại
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            key: 'classes',
            label: inSingleMonth ? 'Lớp tạo trong tháng' : 'Lớp tạo trong kỳ',
            icon: School,
            value: data?.classesCreatedInPeriod,
            sub: 'Theo thời điểm tạo lớp trên hệ thống',
            accent: 'from-sky-500/90 to-cyan-600/90',
          },
          {
            key: 'up',
            label: inSingleMonth ? 'Lên cấp trong tháng' : 'Lên cấp trong kỳ',
            icon: TrendingUp,
            value: data?.levelUpCount,
            sub: 'Số người (không trùng) có thăng cấp lên cấp cao hơn',
            accent: 'from-emerald-500/90 to-teal-600/90',
          },
          {
            key: 'fail',
            label: inSingleMonth
              ? 'Rớt / không đạt (thi) — theo tháng'
              : 'Rớt / không đạt (thi) — theo kỳ',
            icon: TrendingDown,
            value: data?.examNotPassedCount,
            sub: 'Số người (không trùng) có kết quả Chờ học lại hoặc Chia tay',
            accent: 'from-amber-500/90 to-rose-600/80',
          },
        ].map((card, idx) => (
          <div
            key={card.key}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.06] p-5 shadow-[var(--shadow-game-float)]',
              quartOut,
              CARD_ENTRANCE_HOVER,
              'transition-all duration-300 hover:border-primary/25'
            )}
            style={staggerStyle(idx, 60)}
          >
            <div
              className={cn(
                'pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-30 blur-2xl',
                card.accent
              )}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                {isLoading || isFetching ? (
                  <Skeleton className="mt-3 h-10 w-16 rounded-md" />
                ) : (
                  <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-foreground">
                    {card.value ?? 0}
                  </p>
                )}
                <p className="mt-2 text-xs font-medium text-muted-foreground">{card.sub}</p>
              </div>
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg',
                  'bg-gradient-to-br',
                  card.accent
                )}
              >
                <card.icon className="h-6 w-6" strokeWidth={2} aria-hidden />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-5 shadow-[var(--shadow-card)]',
          'motion-safe:animate-[dash-fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'
        )}
        style={{ animationDelay: '80ms' }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary">
              <GraduationCap className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                Số người theo cấp độ hiện tại
              </h3>
              <p className="text-xs text-muted-foreground">
                Phân bổ nhân sự theo cấp độ nghề nghiệp đang lưu trên hệ thống.
              </p>
            </div>
          </div>
        </div>

        {isLoading && !data ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barCategoryGap="18%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/60"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, maxCount]}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--primary) / 0.08)' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${Number(value ?? 0)} người`, 'Số lượng']}
                  labelFormatter={(_l, payload) => {
                    const p = payload?.[0]?.payload as
                      | { name?: string; code?: LevelCode }
                      | undefined
                    return p?.name ?? ''
                  }}
                />
                <Bar
                  dataKey="value"
                  name="Số người"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <section
        className={cn(
          'overflow-hidden rounded-2xl border border-amber-500/20 bg-card/95 p-5 shadow-[var(--shadow-card)]',
          'motion-safe:animate-[dash-fade-up_0.5s_ease-out_both] motion-reduce:animate-none'
        )}
        style={{ animationDelay: '100ms' }}
        aria-label="Nhân sự trượt thi từ hai lần trở lên trong kỳ"
      >
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Trượt từ 2 lần trở lên (cùng cặp cấp)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Trong kỳ đã chọn: từ <span className="font-semibold">2 lượt trượt trở lên</span> cho{' '}
              <span className="font-semibold">cùng một cặp cấp</span> (vd. Tập sự → Biết việc). Kết
              quả tính theo lớp thi hoặc mô tả kỳ thi (Chờ học lại / Chia tay).
            </p>
          </div>
        </div>

        {isLoading && !data ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (data?.usersWithAtLeastTwoExamFails?.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Không có nhân sự nào trượt từ 2 lần trở lên cho cùng một cặp cấp trong kỳ này.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40">
                  <th className="px-3 py-2.5 font-bold text-foreground sm:px-4">Họ tên</th>
                  <th className="min-w-[10rem] px-3 py-2.5 font-bold text-foreground sm:px-4">
                    Cặp cấp thi
                  </th>
                  <th className="px-3 py-2.5 font-bold text-foreground sm:px-4">Mã NV</th>
                  <th className="px-3 py-2.5 font-bold text-foreground sm:px-4">Email</th>
                  <th className="w-28 px-3 py-2.5 text-right font-bold text-foreground sm:px-4">
                    Trượt (cùng cấp)
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data?.usersWithAtLeastTwoExamFails ?? []).map((row) => {
                  const lf = row.levelFrom as LevelCode
                  const lt = row.levelTo as LevelCode
                  const pairLabel = `${LEVEL_LABELS[lf] ?? row.levelFrom} → ${LEVEL_LABELS[lt] ?? row.levelTo}`
                  return (
                    <tr
                      key={`${row.userId}-${row.levelFrom}-${row.levelTo}`}
                      className="border-b border-border/50 last:border-0 odd:bg-background/40"
                    >
                      <td className="px-3 py-2.5 font-semibold text-foreground sm:px-4">
                        {row.fullName?.trim() || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-foreground sm:px-4">
                        {pairLabel}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground sm:px-4">
                        {row.employeeCode?.trim() || '—'}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-muted-foreground sm:max-w-xs sm:px-4">
                        {row.email?.trim() || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black tabular-nums text-amber-700 dark:text-amber-400 sm:px-4">
                        {row.failCount}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
