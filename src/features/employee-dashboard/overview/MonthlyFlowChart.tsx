import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { monthInPeriod, signedTicks, type OverviewPeriod } from './overviewModel'

const MUTED = 'hsl(var(--muted-foreground))'
const INK = 'hsl(var(--foreground))'
const HAIRLINE = 'hsl(var(--border))'
export const HIRE_COLOR = 'var(--viz-cat-1)'
export const LEAVE_COLOR = 'var(--viz-cat-2)'
/** Tháng ngoài kỳ đang chọn: cùng màu, nhạt hẳn — kỳ đang xem nổi lên mà vẫn thấy bối cảnh 12 tháng. */
const CONTEXT_OPACITY = 0.32

type Month = { year: number; month: number; newHires: number; leaves: number }
type Datum = Month & { key: string; leavesNeg: number; inPeriod: boolean }

type TipProps = { active?: boolean; payload?: Array<{ payload: Datum }> }

function MonthTick(props: { x?: number; y?: number; payload?: { value?: string }; data: Datum[] }) {
  const { x = 0, y = 0, payload, data } = props
  const d = data.find((m) => m.key === payload?.value)
  if (!d) return null
  const showYear = d.month === 1 || d === data[0]
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fontSize={11} fill={d.inPeriod ? INK : MUTED}>
        <tspan x={0} dy={12} fontWeight={d.inPeriod ? 600 : 400}>
          T{d.month}
        </tspan>
        {showYear ? (
          <tspan x={0} dy={13} fontSize={10}>
            {d.year}
          </tspan>
        ) : null}
      </text>
    </g>
  )
}

function FlowTooltip({ active, payload }: TipProps) {
  const d = active ? payload?.[0]?.payload : undefined
  if (!d) return null
  const net = d.newHires - d.leaves
  return (
    <div className="rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <p className="mb-1 font-medium text-muted-foreground">
        Tháng {d.month}/{d.year}
      </p>
      <p className="flex items-center gap-2">
        <span className="h-0.5 w-3 rounded-full" style={{ background: HIRE_COLOR }} />
        <span className="font-semibold tabular-nums text-foreground">{d.newHires}</span>
        <span className="text-muted-foreground">vào làm</span>
      </p>
      <p className="flex items-center gap-2">
        <span className="h-0.5 w-3 rounded-full" style={{ background: LEAVE_COLOR }} />
        <span className="font-semibold tabular-nums text-foreground">{d.leaves}</span>
        <span className="text-muted-foreground">nghỉ việc</span>
      </p>
      <p className="mt-1 border-t border-border/70 pt-1 text-muted-foreground">
        Chênh lệch{' '}
        <span className="font-semibold tabular-nums text-foreground">
          {net > 0 ? `+${net}` : net}
        </span>
      </p>
    </div>
  )
}

/** Số trên đầu cột — chỉ ghi cho tháng trong kỳ (kỳ ngắn), tháng khác xem bằng tooltip. */
function ValueLabel(props: {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  value?: number | string
  index?: number
  data: Datum[]
  below: boolean
}) {
  const d = props.index !== undefined ? props.data[props.index] : undefined
  const value = Math.abs(Number(props.value ?? 0))
  if (!d?.inPeriod || value === 0) return null
  const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2
  const y = Number(props.y ?? 0)
  const h = Number(props.height ?? 0)
  return (
    <text
      x={x}
      y={props.below ? Math.max(y, y + h) + 13 : Math.min(y, y + h) - 5}
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
      fill={INK}
      pointerEvents="none"
    >
      {value}
    </text>
  )
}

/**
 * Vào làm (cột trên trục 0) và nghỉ việc (cột dưới trục 0) theo 12 tháng — một trục, dấu thể hiện
 * chiều. Tháng trong kỳ đang chọn tô đậm.
 */
export function MonthlyFlowChart({ months, period }: { months: Month[]; period: OverviewPeriod }) {
  const data = useMemo<Datum[]>(
    () =>
      months.map((m) => ({
        ...m,
        key: `${m.year}-${m.month}`,
        leavesNeg: -m.leaves,
        inPeriod: monthInPeriod(m.year, m.month, period),
      })),
    [months, period]
  )
  const periodMonths = data.filter((d) => d.inPeriod).length
  const labelled = periodMonths > 0 && periodMonths <= 3
  const ticks = signedTicks(
    Math.max(0, ...data.map((d) => d.newHires)),
    Math.max(0, ...data.map((d) => d.leaves))
  )

  return (
    <div className="max-h-80 min-h-64 w-full flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          stackOffset="sign"
          margin={{ top: 18, right: 4, bottom: 0, left: -12 }}
          barCategoryGap="28%"
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke={HAIRLINE} strokeOpacity={0.7} />
          <XAxis
            dataKey="key"
            interval={0}
            tickLine={false}
            axisLine={false}
            height={34}
            tick={<MonthTick data={data} />}
          />
          <YAxis
            allowDecimals={false}
            domain={[ticks[0]!, ticks[ticks.length - 1]!]}
            ticks={ticks}
            interval={0}
            tickFormatter={(v: number) => String(Math.abs(v))}
            tick={{ fontSize: 11, fill: MUTED }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ReferenceLine y={0} stroke={MUTED} strokeOpacity={0.6} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.55 }}
            content={<FlowTooltip />}
          />
          <Bar
            dataKey="newHires"
            stackId="flow"
            fill={HIRE_COLOR}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.key} fillOpacity={d.inPeriod ? 1 : CONTEXT_OPACITY} />
            ))}
            {labelled ? (
              <LabelList dataKey="newHires" content={<ValueLabel data={data} below={false} />} />
            ) : null}
          </Bar>
          <Bar
            dataKey="leavesNeg"
            stackId="flow"
            fill={LEAVE_COLOR}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.key} fillOpacity={d.inPeriod ? 1 : CONTEXT_OPACITY} />
            ))}
            {labelled ? (
              <LabelList dataKey="leavesNeg" content={<ValueLabel data={data} below />} />
            ) : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
