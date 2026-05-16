import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { AlertTriangle, GraduationCap, LineChart } from 'lucide-react'
import { useLearningOpsSummary } from '@/features/dashboard/hooks'
import { InfoHint } from '@/components/shared/InfoHint'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { LEVEL_LABELS, LEVELS, type LevelCode } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const quartOut = '[transition-timing-function:cubic-bezier(0.25,1,0.48,1)]'

const LEVEL_PIE_COLORS: Record<LevelCode, string> = {
  tap_su: 'hsl(262 83% 55%)',
  biet_viec: 'hsl(199 85% 50%)',
  duoc_viec: 'hsl(160 55% 42%)',
  dong_gop_ket_qua: 'hsl(32 90% 52%)',
  tuong: 'hsl(350 70% 52%)',
}

const OPS_HINT =
  'Lớp: theo thời điểm tạo lớp trên hệ thống. Lên cấp: số người (không trùng) thăng cấp. Rớt thi: số người (không trùng) có kết quả Chờ học lại hoặc Chia tay.'

const LEVELS_HINT = 'Số người theo cấp bậc nghề nghiệp hiện lưu trên hồ sơ (snapshot).'

const FAIL_TABLE_HINT =
  'Trong kỳ đã chọn: từ 2 lượt trượt trở lên cho cùng một cặp cấp (ví dụ Tập sự → Biết việc). Tính theo lớp thi / mô tả kỳ thi (Chờ học lại / Chia tay).'

/* ──────────── Ops bar chart ──────────── */
const opsChartConfig = {
  classes: { label: 'Lớp mới', color: 'hsl(199 90% 48%)' },
  up: { label: 'Lên cấp', color: 'hsl(160 55% 40%)' },
  fail: { label: 'Rớt thi', color: 'hsl(32 90% 50%)' },
} satisfies ChartConfig

function OpsBarChart({
  opsBar,
}: {
  opsBar: { key: string; name: string; value: number; fill: string }[]
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  return (
    <ChartContainer config={opsChartConfig} className="h-48 w-full sm:h-52">
      <BarChart
        data={opsBar}
        margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
        barCategoryGap="28%"
        onMouseMove={(s) => {
          const idx = s?.activeTooltipIndex
          if (typeof idx === 'number' && idx >= 0) setHoverKey(opsBar[idx]?.key ?? null)
        }}
        onMouseLeave={() => setHoverKey(null)}
      >
        <CartesianGrid vertical={false} className="stroke-border/40" strokeDasharray="4 4" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis
          allowDecimals={false}
          domain={[0, Math.max(1, ...opsBar.map((d) => d.value))]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          width={32}
        />
        <ChartTooltip
          cursor={{ fill: 'hsl(var(--primary) / 0.07)' }}
          content={<ChartTooltipContent formatter={(v) => [`${v} lượt`]} />}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={52}>
          {opsBar.map((row) => (
            <Cell
              key={row.key}
              fill={row.fill}
              opacity={hoverKey && hoverKey !== row.key ? 0.35 : 1}
              style={{
                transition: 'opacity 0.2s',
                filter: hoverKey === row.key ? `drop-shadow(0 4px 10px ${row.fill}55)` : 'none',
              }}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/* ──────────── Level pie chart ──────────── */
function buildLevelConfig(colors: Record<string, string>): ChartConfig {
  return Object.fromEntries(
    Object.entries(LEVEL_LABELS).map(([code, label]) => [
      code,
      { label, color: colors[code] ?? 'hsl(var(--primary))' },
    ])
  ) as ChartConfig
}

function LevelPieChart({
  pieData,
  colors,
}: {
  pieData: { code: string; name: string; value: number }[]
  colors: Record<string, string>
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const config = useMemo(() => buildLevelConfig(colors), [colors])
  const total = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <ChartContainer config={config} className="h-64 w-full sm:h-72">
      <PieChart margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="44%"
          innerRadius="50%"
          outerRadius="74%"
          paddingAngle={3}
          stroke="hsl(var(--card))"
          strokeWidth={2}
          onMouseEnter={(_, idx) => setHoverKey(pieData[idx]?.code ?? null)}
          onMouseLeave={() => setHoverKey(null)}
        >
          {pieData.map((entry) => (
            <Cell
              key={entry.code}
              fill={colors[entry.code] ?? 'hsl(var(--primary))'}
              opacity={hoverKey && hoverKey !== entry.code ? 0.35 : 1}
              stroke={hoverKey === entry.code ? 'white' : 'hsl(var(--card))'}
              strokeWidth={hoverKey === entry.code ? 3 : 2}
              style={{
                transition: 'opacity 0.2s',
                filter:
                  hoverKey === entry.code
                    ? `drop-shadow(0 0 8px ${colors[entry.code] ?? 'hsl(var(--primary))'}66)`
                    : 'none',
              }}
            />
          ))}
        </Pie>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="name"
              formatter={(value) => {
                const v = Number(value ?? 0)
                const pct = total > 0 ? Math.round((v / total) * 100) : 0
                return [`${v} người · ${pct}%`]
              }}
            />
          }
        />
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{ fontSize: '11px', paddingTop: 8 }}
        />
      </PieChart>
    </ChartContainer>
  )
}

function monthRangeLabelVi(year: number, startMonth: number, endMonth: number): string {
  if (startMonth === endMonth) return `T${startMonth} · ${year}`
  return `T${startMonth} – T${endMonth} · ${year}`
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
  const { data, isLoading, isError, refetch, isFetching } = useLearningOpsSummary(
    reportYear,
    rangeStartMonth,
    rangeEndMonth,
    { enabled: true }
  )

  const inSingleMonth = rangeStartMonth === rangeEndMonth
  const rangeLabel = monthRangeLabelVi(reportYear, rangeStartMonth, rangeEndMonth)

  const levelChart = useMemo(() => {
    const src = data?.peopleByCareerLevel ?? {}
    return LEVELS.map((code) => ({
      code,
      name: LEVEL_LABELS[code],
      value: src[code] ?? 0,
    }))
  }, [data?.peopleByCareerLevel])

  const pieData = useMemo(() => levelChart.filter((d) => d.value > 0), [levelChart])
  const hasAnyLevel = pieData.length > 0

  const opsBar = useMemo(
    () => [
      {
        key: 'classes',
        name: inSingleMonth ? 'Lớp' : 'Lớp mới',
        value: data?.classesCreatedInPeriod ?? 0,
        fill: 'hsl(199 90% 48%)',
      },
      {
        key: 'up',
        name: 'Lên cấp',
        value: data?.levelUpCount ?? 0,
        fill: 'hsl(160 55% 40%)',
      },
      {
        key: 'fail',
        name: 'Rớt thi',
        value: data?.examNotPassedCount ?? 0,
        fill: 'hsl(32 90% 50%)',
      },
    ],
    [data?.classesCreatedInPeriod, data?.examNotPassedCount, data?.levelUpCount, inSingleMonth]
  )

  return (
    <div className="space-y-5">
      <div
        className={cn(
          'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
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
          className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Không tải được thống kê.{' '}
          <Button type="button" variant="ghost" className="h-auto p-0 font-semibold text-destructive underline hover:bg-transparent" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          'grid grid-cols-1 gap-4 lg:grid-cols-2',
          'motion-safe:animate-[dash-fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'
        )}
        style={{ animationDelay: '40ms' }}
      >
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[var(--shadow-card)] sm:p-5',
            quartOut,
            CARD_ENTRANCE_HOVER,
            'transition-all duration-300 hover:border-primary/20'
          )}
          style={staggerStyle(0, 50)}
        >
          <div className="mb-3 flex items-start gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-400">
              <LineChart className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.7rem] font-bold uppercase tracking-wider text-primary">
                Chỉ số theo kỳ
              </p>
            </div>
            <InfoHint text={OPS_HINT} label="Cách tính chỉ số lớp, lên cấp, rớt thi" />
          </div>
          {isLoading && !data ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <OpsBarChart opsBar={opsBar} />
          )}
        </div>

        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[var(--shadow-card)] sm:p-5',
            quartOut,
            CARD_ENTRANCE_HOVER,
            'transition-all duration-300 hover:border-primary/20'
          )}
          style={staggerStyle(1, 50)}
        >
          <div className="mb-2 flex items-start gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary">
              <GraduationCap className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.7rem] font-bold uppercase tracking-wider text-primary">
                Phân bổ cấp độ
              </p>
            </div>
            <InfoHint text={LEVELS_HINT} label="Cách tính phân bổ cấp độ" />
          </div>
          {isLoading && !data ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : !hasAnyLevel ? (
            <p className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/25 px-4 text-center text-sm text-muted-foreground">
              Chưa có dữ liệu cấp độ trong kỳ này.
            </p>
          ) : (
            <LevelPieChart pieData={pieData} colors={LEVEL_PIE_COLORS} />
          )}
        </div>
      </div>

      <section
        className={cn(
          'overflow-hidden rounded-2xl border border-amber-500/20 bg-card/95 p-4 shadow-[var(--shadow-card)] sm:p-5',
          'motion-safe:animate-[dash-fade-up_0.5s_ease-out_both] motion-reduce:animate-none'
        )}
        style={{ animationDelay: '100ms' }}
        aria-label="Nhân sự trượt thi từ hai lần trở lên"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" strokeWidth={2} aria-hidden />
          </div>
          <h3 className="min-w-0 flex-1 text-sm font-bold tracking-tight text-foreground">
            Trượt từ 2 lần (cùng cặp cấp)
          </h3>
          <InfoHint text={FAIL_TABLE_HINT} label="Cách tính trượt 2 lần cùng cặp cấp" />
        </div>

        {isLoading && !data ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (data?.usersWithAtLeastTwoExamFails?.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Không có bản ghi nào trong kỳ này.
          </p>
        ) : (
          <>
            <div className="divide-y divide-border/60 rounded-xl border border-border/60 md:hidden">
              {(data?.usersWithAtLeastTwoExamFails ?? []).map((row) => {
                const lf = row.levelFrom as LevelCode
                const lt = row.levelTo as LevelCode
                const pairLabel = `${LEVEL_LABELS[lf] ?? row.levelFrom} → ${LEVEL_LABELS[lt] ?? row.levelTo}`
                return (
                  <div
                    key={`${row.userId}-${row.levelFrom}-${row.levelTo}`}
                    className="space-y-2 p-4 odd:bg-background/40"
                  >
                    <p className="break-words font-semibold text-foreground">
                      {row.fullName?.trim() || '—'}
                    </p>
                    <p className="text-xs font-medium text-foreground">{pairLabel}</p>
                    <p className="tabular-nums text-sm text-muted-foreground">
                      Mã NV: {row.employeeCode?.trim() || '—'}
                    </p>
                    <p className="break-all text-sm text-muted-foreground">
                      {row.email?.trim() || '—'}
                    </p>
                    <p className="text-right text-lg font-black tabular-nums text-amber-700 dark:text-amber-400">
                      Trượt: {row.failCount} lần
                    </p>
                  </div>
                )
              })}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-border/60 md:block">
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
                      Lần trượt
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
                        className="border-b border-border/50 last:border-0 odd:bg-background/40 transition-colors hover:bg-muted/20"
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
          </>
        )}
      </section>
    </div>
  )
}
