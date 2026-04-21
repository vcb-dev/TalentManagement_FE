import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
} from 'recharts'
import { cn } from '@/lib/utils'
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
  done: '#10b981',
  in_progress: '#3b82f6',
  not_started: '#94a3b8',
  blocked: '#f43f5e',
}

/* ==================================================================== *
 *  Radial gauge cho 3 card tổng quan
 * ==================================================================== */

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
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
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
          <RadialBar
            background={{ fill: 'rgb(226 232 240 / 0.5)' }}
            dataKey="value"
            cornerRadius={20}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums text-foreground">{clamped}%</span>
        {label ? (
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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

export function StatusDonut({
  breakdown,
  className,
}: {
  breakdown: Record<AssignmentStatusKey, number>
  className?: string
}) {
  const data = useMemo(
    () =>
      (Object.keys(breakdown) as AssignmentStatusKey[])
        .map((key) => ({
          key,
          name: STATUS_LABEL[key],
          value: breakdown[key],
          color: STATUS_COLOR[key],
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
    <div className={cn('h-[220px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgb(226 232 240)',
              fontSize: 12,
            }}
            formatter={(value, name) => [`${Number(value)} chỉ tiêu`, String(name)]}
          />
          <Legend
            verticalAlign="bottom"
            height={40}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Donut theo đánh giá quản lý (OK / NOT / chưa chấm) — khớp 3 ô thống kê bên dưới. */
export function EvalBreakdownDonut({
  breakdown,
  className,
}: {
  breakdown: { ok: number; not: number; pending: number }
  className?: string
}) {
  const data = useMemo(
    () =>
      (
        [
          { key: 'ok', name: 'Đạt (OK)', value: breakdown.ok, color: '#059669' },
          { key: 'not', name: 'Chưa đạt (NOT)', value: breakdown.not, color: '#e11d48' },
          { key: 'pending', name: 'Chưa đánh giá', value: breakdown.pending, color: '#94a3b8' },
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
    <div className={cn('h-[220px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgb(226 232 240)',
              fontSize: 12,
            }}
            formatter={(value, name) => [`${Number(value)} chỉ tiêu`, String(name)]}
          />
          <Legend
            verticalAlign="bottom"
            height={40}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ==================================================================== *
 *  Donut — Xếp loại A/B/C
 * ==================================================================== */

const GRADE_COLOR: Record<keyof GradeDistribution, string> = {
  A: '#10b981',
  B: '#f59e0b',
  C: '#ef4444',
  none: '#cbd5e1',
}

const GRADE_LABEL: Record<keyof GradeDistribution, string> = {
  A: 'Loại A',
  B: 'Loại B',
  C: 'Loại C',
  none: 'Chưa xếp',
}

export function GradeDonut({ dist, title }: { dist: GradeDistribution; title: string }) {
  const data = useMemo(
    () =>
      (['A', 'B', 'C', 'none'] as const)
        .map((key) => ({
          key,
          name: GRADE_LABEL[key],
          value: dist[key],
          color: GRADE_COLOR[key],
        }))
        .filter((x) => x.value > 0),
    [dist]
  )
  const total = data.reduce((s, x) => s + x.value, 0)

  return (
    <div className="flex flex-col">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {total === 0 ? (
        <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          Chưa có tổng hợp
        </div>
      ) : (
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid rgb(226 232 240)',
                  fontSize: 12,
                }}
                formatter={(value, name) => [`${Number(value)} nhân sự`, String(name)]}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={38}
                outerRadius={64}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ==================================================================== *
 *  Grouped bar — KPI/OKR đạt/chưa theo nhân sự
 * ==================================================================== */

export function PerPersonBar({ rows }: { rows: PerPersonBarRow[] }) {
  if (!rows.length) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
        Chưa có bản tổng hợp — Leader cần bấm "Tính lại tổng hợp" ở màn KPI/OKR.
      </div>
    )
  }
  const data = rows.slice(0, 10)
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 8 }} barGap={2}>
          <CartesianGrid stroke="rgb(226 232 240 / 0.5)" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'rgb(100 116 139)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgb(226 232 240)' }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={56}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'rgb(100 116 139)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgb(226 232 240)',
              fontSize: 12,
            }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="kpiOk" name="KPI đạt" stackId="kpi" fill="#6366f1" radius={[0, 0, 0, 0]} />
          <Bar
            dataKey="kpiNot"
            name="KPI chưa"
            stackId="kpi"
            fill="#c7d2fe"
            radius={[4, 4, 0, 0]}
          />
          <Bar dataKey="okrOk" name="OKR đạt" stackId="okr" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar
            dataKey="okrNot"
            name="OKR chưa"
            stackId="okr"
            fill="#a7f3d0"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ==================================================================== *
 *  Line — trend % đạt KPI/OKR 3 kỳ
 * ==================================================================== */

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
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="rgb(226 232 240 / 0.6)" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'rgb(100 116 139)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgb(226 232 240)' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'rgb(100 116 139)' }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgb(226 232 240)',
              fontSize: 12,
            }}
            formatter={(value) => `${Number(value)}%`}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="kpiRate"
            name="Tiến độ KPI"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 4, fill: '#6366f1' }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="okrRate"
            name="Tiến độ OKR"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4, fill: '#10b981' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
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
  /** Resolve user id -> tên hiển thị, dùng từ member list. */
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
    <ul className="space-y-3">
      {rows.map((row) => {
        const prio = priorityLabel(row.priority)
        const pct = Math.min(100, Math.max(0, row.progressPercent ?? 0))
        const barColor =
          row.evalStatus === 'OK'
            ? 'bg-emerald-500'
            : row.evalStatus === 'NOT'
              ? 'bg-rose-500'
              : STATUS_COLOR[row.status] === '#3b82f6'
                ? 'bg-primary'
                : 'bg-slate-400'
        return (
          <li
            key={row.id}
            className="rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/30"
          >
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-black uppercase tracking-wider',
                    row.kind === 'KPI'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-emerald-50 text-emerald-700'
                  )}
                >
                  {row.kind}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className={cn('h-1.5 w-1.5 rounded-full', prio.dot)} aria-hidden />
                  {prio.label}
                </span>
                {row.evalStatus ? (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                      row.evalStatus === 'OK'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    )}
                  >
                    {row.evalStatus}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {nameFor(row.assigneeUserId)}
              </span>
            </div>
            <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">{row.content}</p>
            <div className="flex items-center gap-3">
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-[width]', barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-bold tabular-nums text-foreground">
                {pct}%
              </span>
              {row.targetMetric?.trim() ? (
                <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
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
