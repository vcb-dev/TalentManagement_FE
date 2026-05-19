import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { PerformanceAssignment } from '@/features/kpi-okr/api'
import type { TeamMemberRow } from '@/features/organization/api'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
  Pie,
  PieChart,
} from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { renderActiveDot, renderDot } from './chartStyles'
import type {
  AssignmentStatusKey,
  GradeDistribution,
  PerPersonBarRow,
  TopPriorityItem,
  TrendPoint,
} from './useKpiDashboardData'

const STATUS_LABEL: Record<AssignmentStatusKey, string> = {
  done: 'Hoàn thành',
  in_progress: 'Đang thực hiện',
  not_started: 'Chưa bắt đầu',
  blocked: 'Bị chặn',
}

const STATUS_COLOR: Record<AssignmentStatusKey, string> = {
  done: 'hsl(160 84% 39%)',
  in_progress: 'hsl(217 91% 60%)',
  not_started: 'hsl(215 20% 65%)',
  blocked: 'hsl(351 95% 60%)',
}

/* ==================================================================== *
 *  Radial gauge cho 3 card tổng quan
 * ==================================================================== */

const gaugeConfig = {
  value: { label: 'Tiến độ' },
} satisfies ChartConfig

export function KpiGauge({
  percent,
  color,
  size = 140,
  label,
}: {
  percent: number
  color: string
  size?: number
  label?: string
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)))
  const data = [{ name: label ?? 'value', value: clamped, fill: color }]
  const isFull = clamped >= 100
  return (
    <div className="group relative" style={{ width: size, height: size }}>
      <ChartContainer config={gaugeConfig} className="h-full w-full">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          barSize={12}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={20} />
        </RadialBarChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-105">
        {isFull ? (
          <span className="text-lg" role="img" aria-label="check">
            ✅
          </span>
        ) : null}
        <span
          className={cn(
            'text-2xl font-black tabular-nums text-foreground',
            isFull && 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {isFull ? '100' : clamped}%
        </span>
        {isFull ? (
          <span className="mt-0.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Hoàn thành
          </span>
        ) : label ? (
          <span className="mt-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/* ==================================================================== *
 *  Donut — trạng thái tổng thể KPI+OKR
 * ==================================================================== */

const statusChartConfig = {
  done: { label: 'Hoàn thành', color: 'hsl(160 84% 39%)' },
  in_progress: { label: 'Đang thực hiện', color: 'hsl(217 91% 60%)' },
  not_started: { label: 'Chưa bắt đầu', color: 'hsl(215 20% 65%)' },
  blocked: { label: 'Bị chặn', color: 'hsl(351 95% 60%)' },
} satisfies ChartConfig

export function StatusDonut({
  breakdown,
  className,
}: {
  breakdown: Record<AssignmentStatusKey, number>
  className?: string
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const data = useMemo(
    () =>
      (Object.keys(breakdown) as AssignmentStatusKey[])
        .map((key) => ({
          key,
          name: STATUS_LABEL[key],
          value: breakdown[key],
          color: STATUS_COLOR[key],
          fill: STATUS_COLOR[key],
        }))
        .filter((x) => x.value > 0),
    [breakdown]
  )
  const total = data.reduce((s, x) => s + x.value, 0)

  if (!total) {
    return (
      <div
        className={cn(
          'flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground',
          className
        )}
      >
        Chưa có chỉ tiêu nào trong kỳ.
      </div>
    )
  }

  return (
    <ChartContainer config={statusChartConfig} className={cn('h-[220px] w-full', className)}>
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent nameKey="name" formatter={(value) => [`${value} chỉ tiêu`]} />
          }
        />
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          innerRadius={52}
          outerRadius={78}
          paddingAngle={3}
          stroke="none"
          onMouseEnter={(_, idx) => setHoverKey(data[idx]?.key ?? null)}
          onMouseLeave={() => setHoverKey(null)}
        >
          {data.map((entry) => (
            <Cell
              key={entry.key}
              fill={entry.color}
              opacity={hoverKey && hoverKey !== entry.key ? 0.35 : 1}
              stroke={hoverKey === entry.key ? 'white' : 'none'}
              strokeWidth={hoverKey === entry.key ? 2 : 0}
              style={{
                transition: 'opacity 0.2s, stroke-width 0.2s',
                filter: hoverKey === entry.key ? `drop-shadow(0 0 6px ${entry.color}66)` : 'none',
              }}
            />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

/* ==================================================================== *
 *  Donut — đánh giá quản lý (OK / NOT / chưa chấm)
 * ==================================================================== */

const evalChartConfig = {
  ok: { label: 'Đạt (OK)', color: 'hsl(161 94% 30%)' },
  not: { label: 'Chưa đạt (NOT)', color: 'hsl(347 77% 50%)' },
  pending: { label: 'Chưa đánh giá', color: 'hsl(215 20% 65%)' },
} satisfies ChartConfig

export function EvalBreakdownDonut({
  breakdown,
  className,
}: {
  breakdown: { ok: number; not: number; pending: number }
  className?: string
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const data = useMemo(
    () =>
      (
        [
          {
            key: 'ok',
            name: 'Đạt (OK)',
            value: breakdown.ok,
            color: 'hsl(161 94% 30%)',
            fill: 'hsl(161 94% 30%)',
          },
          {
            key: 'not',
            name: 'Chưa đạt (NOT)',
            value: breakdown.not,
            color: 'hsl(347 77% 50%)',
            fill: 'hsl(347 77% 50%)',
          },
          {
            key: 'pending',
            name: 'Chưa đánh giá',
            value: breakdown.pending,
            color: 'hsl(215 20% 65%)',
            fill: 'hsl(215 20% 65%)',
          },
        ] as const
      ).filter((x) => x.value > 0),
    [breakdown]
  )
  const total = data.reduce((s, x) => s + x.value, 0)

  if (!total) {
    return (
      <div
        className={cn(
          'flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground',
          className
        )}
      >
        Chưa có chỉ tiêu nào trong kỳ.
      </div>
    )
  }

  return (
    <ChartContainer config={evalChartConfig} className={cn('h-[220px] w-full', className)}>
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent nameKey="name" formatter={(value) => [`${value} chỉ tiêu`]} />
          }
        />
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          innerRadius={52}
          outerRadius={78}
          paddingAngle={3}
          stroke="none"
          onMouseEnter={(_, idx) => setHoverKey(data[idx]?.key ?? null)}
          onMouseLeave={() => setHoverKey(null)}
        >
          {data.map((entry) => (
            <Cell
              key={entry.key}
              fill={entry.color}
              opacity={hoverKey && hoverKey !== entry.key ? 0.35 : 1}
              stroke={hoverKey === entry.key ? 'white' : 'none'}
              strokeWidth={hoverKey === entry.key ? 2 : 0}
              style={{
                transition: 'opacity 0.2s',
                filter: hoverKey === entry.key ? `drop-shadow(0 0 6px ${entry.color}66)` : 'none',
              }}
            />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

/* ==================================================================== *
 *  Donut — Xếp loại A/B/C
 * ==================================================================== */

const GRADE_COLOR: Record<keyof GradeDistribution, string> = {
  A: 'hsl(160 84% 39%)',
  B: 'hsl(38 92% 50%)',
  C: 'hsl(0 84% 60%)',
  none: 'hsl(215 25% 75%)',
}

const GRADE_LABEL: Record<keyof GradeDistribution, string> = {
  A: 'Loại A',
  B: 'Loại B',
  C: 'Loại C',
  none: 'Chưa xếp',
}

const gradeChartConfig = {
  A: { label: 'Loại A', color: 'hsl(160 84% 39%)' },
  B: { label: 'Loại B', color: 'hsl(38 92% 50%)' },
  C: { label: 'Loại C', color: 'hsl(0 84% 60%)' },
  none: { label: 'Chưa xếp', color: 'hsl(215 25% 75%)' },
} satisfies ChartConfig

export function GradeDonut({ dist, title }: { dist: GradeDistribution; title: string }) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const data = useMemo(
    () =>
      (['A', 'B', 'C', 'none'] as const)
        .map((key) => ({
          key,
          name: GRADE_LABEL[key],
          value: dist[key],
          color: GRADE_COLOR[key],
          fill: GRADE_COLOR[key],
        }))
        .filter((x) => x.value > 0),
    [dist]
  )
  const total = data.reduce((s, x) => s + x.value, 0)

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {total > 0 ? (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-bold tabular-nums text-foreground">
            {total}
          </span>
        ) : null}
      </div>
      {total === 0 ? (
        <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          Chưa có tổng hợp
        </div>
      ) : (
        <ChartContainer config={gradeChartConfig} className="h-[180px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent nameKey="name" formatter={(value) => [`${value} nhân sự`]} />
              }
            />
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="43%"
              innerRadius={38}
              outerRadius={62}
              paddingAngle={3}
              stroke="none"
              onMouseEnter={(_, idx) => setHoverKey(data[idx]?.key ?? null)}
              onMouseLeave={() => setHoverKey(null)}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.color}
                  opacity={hoverKey && hoverKey !== entry.key ? 0.35 : 1}
                  style={{
                    transition: 'opacity 0.2s',
                    filter:
                      hoverKey === entry.key ? `drop-shadow(0 0 5px ${entry.color}55)` : 'none',
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      )}
    </div>
  )
}

/* ==================================================================== *
 *  Grouped/stacked bar — KPI/OKR đạt/chưa theo nhân sự
 * ==================================================================== */

const perPersonConfig = {
  kpiOk: { label: 'KPI đạt', color: 'hsl(var(--primary))' },
  kpiNot: { label: 'KPI chưa', color: 'hsl(0 84% 60%)' },
  okrOk: { label: 'OKR đạt', color: 'hsl(160 84% 39%)' },
  okrNot: { label: 'OKR chưa', color: 'hsl(38 92% 50%)' },
} satisfies ChartConfig

export function PerPersonBar({ rows }: { rows: PerPersonBarRow[] }) {
  if (!rows.length) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
        Không có dữ liệu KPI/OKR trong kỳ này.
      </div>
    )
  }
  const data = rows.slice(0, 10)
  return (
    <ChartContainer config={perPersonConfig} className="h-[300px] w-full">
      <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 8 }} barGap={2}>
        <CartesianGrid vertical={false} className="stroke-border/40" strokeDasharray="4 4" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={56}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="kpiOk"
          name="KPI đạt"
          stackId="kpi"
          fill="hsl(var(--primary))"
          fillOpacity={0.9}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="kpiNot"
          name="KPI chưa"
          stackId="kpi"
          fill="hsl(0 84% 60%)"
          fillOpacity={0.75}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="okrOk"
          name="OKR đạt"
          stackId="okr"
          fill="hsl(160 84% 39%)"
          fillOpacity={0.9}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="okrNot"
          name="OKR chưa"
          stackId="okr"
          fill="hsl(38 92% 50%)"
          fillOpacity={0.75}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}

/* ==================================================================== *
 *  Line — trend % đạt KPI/OKR
 * ==================================================================== */

const trendConfig = {
  kpiRate: { label: 'Tiến độ KPI', color: 'hsl(239 84% 67%)' },
  okrRate: { label: 'Tiến độ OKR', color: 'hsl(160 84% 39%)' },
} satisfies ChartConfig

export function TrendLine({ points }: { points: TrendPoint[] }) {
  const hasAny = points.some((p) => p.hasData)
  if (!hasAny) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
        Chưa có dữ liệu tổng hợp trong các tháng đã chọn.
      </div>
    )
  }
  return (
    <ChartContainer config={trendConfig} className="h-[220px] w-full">
      <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid vertical={false} className="stroke-border/40" strokeDasharray="4 4" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          unit="%"
        />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`${v}%`]} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="kpiRate"
          name="Tiến độ KPI"
          stroke="var(--color-kpiRate)"
          strokeWidth={2.5}
          dot={renderDot}
          activeDot={renderActiveDot}
        />
        <Line
          type="monotone"
          dataKey="okrRate"
          name="Tiến độ OKR"
          stroke="var(--color-okrRate)"
          strokeWidth={2.5}
          dot={renderDot}
          activeDot={renderActiveDot}
        />
      </LineChart>
    </ChartContainer>
  )
}

/* ==================================================================== *
 *  Danh sách top ưu tiên — horizontal progress rows
 * ==================================================================== */

function priorityLabel(p: number): { label: string; dot: string } {
  if (p === 1) return { label: 'P1 · Cao', dot: 'bg-rose-500' }
  if (p === 2) return { label: 'P2 · TB', dot: 'bg-amber-500' }
  if (p === 3) return { label: 'P3 · Thấp', dot: 'bg-slate-400' }
  return { label: 'Chưa xếp', dot: 'bg-slate-300' }
}

export function TopPriorityList({
  rows,
  nameFor,
}: {
  rows: TopPriorityItem[]
  nameFor: (userId: string) => string
}) {
  if (!rows.length) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
        Không có chỉ tiêu nào trong kỳ.
      </div>
    )
  }
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const prio = priorityLabel(row.priority)
        const pct = Math.min(100, Math.max(0, row.progressPercent ?? 0))
        const barColor =
          row.evalStatus === 'OK'
            ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
            : row.evalStatus === 'NOT'
              ? 'bg-gradient-to-r from-rose-400 to-rose-600'
              : row.status === 'in_progress'
                ? 'bg-gradient-to-r from-primary/70 to-primary'
                : 'bg-gradient-to-r from-slate-300 to-slate-400'
        return (
          <li
            key={row.id}
            className="group rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex h-5 items-center rounded-md px-1.5 text-xs font-black uppercase tracking-wider',
                    row.kind === 'KPI'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  )}
                >
                  {row.kind}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span className={cn('h-1.5 w-1.5 rounded-full', prio.dot)} aria-hidden />
                  {prio.label}
                </span>
                {row.evalStatus ? (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-xs font-bold',
                      row.evalStatus === 'OK'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    )}
                  >
                    {row.evalStatus}
                  </span>
                ) : null}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {nameFor(row.assigneeUserId)}
              </span>
            </div>
            <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">{row.content}</p>
            <div className="flex items-center gap-3">
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted shadow-inner">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 group-hover:scale-y-110',
                    barColor
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-bold tabular-nums text-foreground">
                {pct}%
              </span>
              {row.targetMetric?.trim() ? (
                <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                  Chỉ tiêu: <b className="text-foreground">{row.targetMetric}</b>
                </span>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ==================================================================== *
 *  Member KPI panel — list members + expandable KPI/OKR per member
 * ==================================================================== */

export function MemberKpiPanel({
  assignments,
  members,
  nameFor,
}: {
  assignments: PerformanceAssignment[]
  members: TeamMemberRow[]
  nameFor: (userId: string) => string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const memberStats = useMemo(() => {
    const map = new Map<string, { total: number; ok: number; not: number }>()
    for (const a of assignments) {
      const s = map.get(a.assigneeUserId) ?? { total: 0, ok: 0, not: 0 }
      s.total++
      const ev = (a.managerEvalStatus ?? '').trim().toUpperCase()
      if (ev === 'OK') s.ok++
      else if (ev === 'NOT') s.not++
      map.set(a.assigneeUserId, s)
    }
    return map
  }, [assignments])

  const rows = useMemo(
    () =>
      members
        .filter((m) => m.status !== 'INACTIVE')
        .map((m) => ({
          userId: m.userId,
          name: nameFor(m.userId),
          stats: memberStats.get(m.userId) ?? { total: 0, ok: 0, not: 0 },
        }))
        .sort((a, b) => b.stats.total - a.stats.total || a.name.localeCompare(b.name)),
    [members, memberStats, nameFor]
  )

  const selectedItems = useMemo(
    () =>
      assignments
        .filter((a) => a.assigneeUserId === selectedId)
        .sort((a, b) => {
          const pa = a.priority === 0 ? 99 : a.priority
          const pb = b.priority === 0 ? 99 : b.priority
          return pa - pb
        }),
    [assignments, selectedId]
  )

  if (!rows.length) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
        Không có thành viên nào trong team.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {rows.map((row) => {
        const isOpen = selectedId === row.userId
        const { total, ok, not } = row.stats
        const okPct = total > 0 ? Math.round((ok / total) * 100) : 0
        const initials = row.name
          .split(' ')
          .filter(Boolean)
          .slice(-2)
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        return (
          <div
            key={row.userId}
            className={cn(
              'rounded-xl border transition-all duration-200',
              isOpen ? 'border-primary/30 bg-card shadow-sm' : 'border-border bg-card/60'
            )}
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              onClick={() => setSelectedId(isOpen ? null : row.userId)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {initials || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                <p className="text-[11px] text-muted-foreground">{total} KPI/OKR</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {ok > 0 && (
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    ✓ {ok}
                  </span>
                )}
                {not > 0 && (
                  <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                    ✗ {not}
                  </span>
                )}
                {total > 0 && (
                  <span className="w-9 text-right text-xs font-bold tabular-nums text-muted-foreground">
                    {okPct}%
                  </span>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border/50 px-3 pb-3 pt-2">
                {selectedItems.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    Chưa có chỉ tiêu nào được giao.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1.5">
                    {selectedItems.map((a) => {
                      const prio = priorityLabel(a.priority)
                      const ev = (a.managerEvalStatus ?? '').trim().toUpperCase()
                      const evalStatus = ev === 'OK' ? 'OK' : ev === 'NOT' ? 'NOT' : null
                      return (
                        <li
                          key={a.id}
                          className="rounded-lg border border-border/70 bg-background/60 p-2.5"
                        >
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'inline-flex h-4 items-center rounded px-1 text-[10px] font-black uppercase',
                                a.kind === 'KPI'
                                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              )}
                            >
                              {a.kind}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              <span className={cn('h-1.5 w-1.5 rounded-full', prio.dot)} />
                              {prio.label}
                            </span>
                            {evalStatus && (
                              <span
                                className={cn(
                                  'rounded px-1 py-0.5 text-[10px] font-bold',
                                  evalStatus === 'OK'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40'
                                )}
                              >
                                {evalStatus}
                              </span>
                            )}
                          </div>
                          <p className="mb-1.5 line-clamp-1 text-xs font-semibold text-foreground">
                            {a.content}
                          </p>
                          {a.targetMetric?.trim() ? (
                            <p className="text-[10px] text-muted-foreground">
                              Chỉ tiêu: <b className="text-foreground">{a.targetMetric}</b>
                            </p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
