import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Users } from 'lucide-react'
import { useLearningOpsSummary } from '@/features/dashboard/hooks'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoHint } from '@/components/shared/InfoHint'

export type ManagerHrSnapshotCardsProps = {
  reportYear: number
  rangeStartMonth: number
  rangeEndMonth: number
}

const HR_HINT =
  'Tổng: không tính trạng thái đã nghỉ / inactive trên hồ sơ HR. Off: theo ngày nghỉ trong dữ liệu đồng bộ; thiếu ngày thì ước lượng theo lần cập nhật gần nhất. Mới: ngày vào làm (startDateWork) nằm trong kỳ đã chọn.'

type HrRow = { key: string; short: string; value: number; fill: string }

/**
 * Tổng / off / mới — biểu đồ cột ngang gọn, chi tiết ở tooltip (i).
 */
export function ManagerHrSnapshotCards({
  reportYear,
  rangeStartMonth,
  rangeEndMonth,
}: ManagerHrSnapshotCardsProps) {
  const { data, isLoading, isError, refetch, isFetching } = useLearningOpsSummary(
    reportYear,
    rangeStartMonth,
    rangeEndMonth,
    { enabled: true }
  )

  const inSingleMonth = rangeStartMonth === rangeEndMonth
  const offLabel = inSingleMonth ? 'Off (tháng)' : 'Off (kỳ)'
  const newLabel = inSingleMonth ? 'Mới (tháng)' : 'Mới (kỳ)'

  const barData: HrRow[] = useMemo(
    () => [
      {
        key: 'headcount',
        short: 'Tổng ĐL',
        value: data?.totalHeadcount ?? 0,
        fill: 'hsl(262 83% 52%)',
      },
      {
        key: 'off',
        short: offLabel,
        value: data?.offboardedInPeriod ?? 0,
        fill: 'hsl(350 70% 48%)',
      },
      {
        key: 'new',
        short: newLabel,
        value: data?.newHiresInPeriod ?? 0,
        fill: 'hsl(160 55% 40%)',
      },
    ],
    [data?.totalHeadcount, data?.offboardedInPeriod, data?.newHiresInPeriod, offLabel, newLabel]
  )

  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const maxVal = Math.max(1, ...barData.map((d) => d.value))

  return (
    <div className="space-y-3">
      {isError ? (
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Không tải được thống kê nhân sự.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Thử lại
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.06] p-4 shadow-[var(--shadow-game-float)] sm:p-5'
        )}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/15 text-indigo-700 dark:text-indigo-300">
            <Users className="h-4 w-4" strokeWidth={2} aria-hidden />
          </div>
          <h3 className="min-w-0 flex-1 text-sm font-bold tracking-tight text-foreground">
            Nhân sự
          </h3>
          <InfoHint
            text={HR_HINT}
            label="Cách tính nhân sự Tổng / Off / Mới"
            className="self-start"
          />
        </div>

        {isLoading && !data ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <div className="h-40 w-full min-w-0 sm:h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={barData}
                margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                barCategoryGap="22%"
                onMouseMove={(s) => {
                  if (s?.activeTooltipIndex != null)
                    setHoverKey(barData[s.activeTooltipIndex]?.key ?? null)
                }}
                onMouseLeave={() => setHoverKey(null)}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/50"
                  horizontal
                  vertical={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  domain={[0, maxVal]}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="short"
                  width={inSingleMonth ? 72 : 88}
                  tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RTooltip
                  cursor={{ fill: 'hsl(var(--primary) / 0.07)' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    fontSize: '12px',
                  }}
                  formatter={(v) => [String(v), 'Số lượng']}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {barData.map((row) => (
                    <Cell
                      key={row.key}
                      fill={row.fill}
                      opacity={hoverKey && hoverKey !== row.key ? 0.3 : 1}
                      style={{ transition: 'opacity 0.2s' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {isFetching && data ? (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Đang cập nhật…</p>
        ) : null}
      </div>
    </div>
  )
}
