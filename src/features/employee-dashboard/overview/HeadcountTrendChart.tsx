import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  formatCount,
  formatRate,
  niceAxisPair,
  trendLabelSides,
  trendPoints,
  type OverviewPeriod,
  type TrendPoint,
} from './overviewModel'

const MUTED = 'hsl(var(--muted-foreground))'
const INK = 'hsl(var(--foreground))'
const HAIRLINE = 'hsl(var(--border))'
const SURFACE = 'hsl(var(--card))'
/** Tổng nhân sự = màu nhấn (cùng màu "Đang làm việc" ở biểu đồ tròn). */
export const HEADCOUNT_COLOR = 'hsl(var(--button))'
/** Vào làm (cùng màu cột nhỏ ở ô "Nhân sự mới"). */
export const HIRE_COLOR = 'var(--viz-cat-1)'
export const LEAVE_COLOR = 'var(--viz-cat-2)'
/** Đường tỷ lệ: nét đứt màu chữ trung tính, điểm rỗng — khác hẳn đường tổng nhân sự. */
const RATE_COLOR = 'hsl(var(--foreground) / 0.72)'
const Y_WIDTH = 46
/** Dưới bề rộng này bớt nhãn (chỉ giữ số nhân sự ở tháng trong kỳ + tháng cuối). */
const DENSE_BELOW = 720

type Monthly = Parameters<typeof trendPoints>[0]
type Sides = ReturnType<typeof trendLabelSides>

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function MonthTick(props: {
  x?: number
  y?: number
  payload?: { value?: string }
  data: TrendPoint[]
  /** Màn hẹp: ghi nhãn cách một tháng, tính ngược từ tháng cuối (tháng cuối luôn có nhãn). */
  sparse?: boolean
}) {
  const { x = 0, y = 0, payload, data, sparse } = props
  const i = data.findIndex((m) => m.key === payload?.value)
  const d = data[i]
  if (!d) return null
  if (sparse && (data.length - 1 - i) % 2 !== 0) return null
  // Năm ghi dưới tháng 1 và tick đầu — trừ khi tick kế tiếp đã là tháng 1 (màn hẹp hai nhãn dính nhau).
  const prevShown = data[i - (sparse ? 2 : 1)]
  const showYear = sparse
    ? !prevShown || prevShown.year !== d.year
    : d.month === 1 || (d === data[0] && data[1]?.month !== 1)
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fontSize={12} fill={d.inPeriod ? INK : MUTED}>
        <tspan x={0} dy={14} fontWeight={d.inPeriod ? 600 : 400}>
          T{d.month}
        </tspan>
        {showYear ? (
          <tspan x={0} dy={13} fontSize={10} fill={MUTED} fontWeight={400}>
            {d.year}
          </tspan>
        ) : null}
      </text>
    </g>
  )
}

function TipRow({ swatch, value, label }: { swatch?: ReactNode; value: string; label: string }) {
  return (
    <p className="flex items-center gap-2">
      <span className="flex w-3.5 justify-center">{swatch}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </p>
  )
}

const LineSwatch = ({ color, dashed }: { color: string; dashed?: boolean }) => (
  <span
    className="w-3.5 border-t-2"
    style={{ borderColor: color, borderTopStyle: dashed ? 'dashed' : 'solid' }}
  />
)
const BoxSwatch = ({ color }: { color: string }) => (
  <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
)

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: TrendPoint }>
}) {
  const d = active ? payload?.[0]?.payload : undefined
  if (!d) return null
  return (
    <div className="min-w-48 rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <p className="mb-1.5 font-medium text-muted-foreground">
        Tháng {d.month}/{d.year}
        {d.inPeriod ? ' · trong kỳ' : ''}
      </p>
      {d.headcount === null ? (
        <p className="text-muted-foreground">Chưa tới tháng này</p>
      ) : (
        <div className="space-y-0.5">
          <TipRow
            swatch={<LineSwatch color={HEADCOUNT_COLOR} />}
            value={formatCount(d.headcount)}
            label="nhân sự cuối tháng"
          />
          {d.delta !== null ? (
            <TipRow
              value={`${d.delta > 0 ? '+' : ''}${formatCount(d.delta)} (${d.growth !== null && d.growth > 0 ? '+' : ''}${formatRate(d.growth)})`}
              label="so với tháng trước"
            />
          ) : null}
          <TipRow
            swatch={<BoxSwatch color={HIRE_COLOR} />}
            value={formatCount(d.newHires)}
            label="vào làm"
          />
          <TipRow
            swatch={<BoxSwatch color={LEAVE_COLOR} />}
            value={formatCount(d.leaves)}
            label="nghỉ việc"
          />
          <TipRow
            swatch={<LineSwatch color={RATE_COLOR} dashed />}
            value={formatRate(d.newHireRate)}
            label="nhân sự mới / tổng"
          />
        </div>
      )}
    </div>
  )
}

type LabelProps = {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  index?: number
  value?: number | string | null
}

/** Nhãn số của một điểm trên đường: phía trên hoặc dưới điểm tuỳ `below(index)`. */
function pointLabel(opts: {
  show: (index: number) => boolean
  below: (index: number) => boolean
  format: (v: number) => string
  color: string
  weight: number
  size: number
}) {
  return function PointLabel(props: LabelProps) {
    const i = props.index ?? -1
    if (props.value == null || !opts.show(i)) return null
    const below = opts.below(i)
    return (
      <text
        x={Number(props.x ?? 0)}
        y={Number(props.y ?? 0) + (below ? 18 : -10)}
        textAnchor="middle"
        fontSize={opts.size}
        fontWeight={opts.weight}
        fill={opts.color}
        stroke={SURFACE}
        strokeWidth={3}
        paintOrder="stroke"
        pointerEvents="none"
      >
        {opts.format(Number(props.value))}
      </text>
    )
  }
}

/** Số trên đầu cột (bỏ cột 0). */
function BarValue(props: LabelProps) {
  const value = Number(props.value ?? 0)
  if (!value) return null
  const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2
  return (
    <text
      x={x}
      y={Number(props.y ?? 0) - 4}
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
      fill={MUTED}
      pointerEvents="none"
    >
      {value}
    </text>
  )
}

function LegendItem({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {swatch}
      {label}
    </span>
  )
}

/**
 * Tăng trưởng nhân sự 12 tháng (một khung, kiểu báo cáo HR): vùng tô + đường tổng nhân sự cuối tháng và
 * cột vào làm / nghỉ việc theo trục trái (người); đường nét đứt tỷ lệ nhân sự mới theo trục phải (%).
 * Hai trục cùng số khoảng chia nên vạch lưới trùng nhau; nền xám là các tháng thuộc kỳ đang xem.
 */
export function HeadcountTrendChart({
  months,
  period,
}: {
  months: Monthly
  period: OverviewPeriod
}) {
  const gradientId = `hc-fill-${useId().replace(/:/g, '')}`
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const dense = width > 0 && width < DENSE_BELOW

  const data = useMemo(() => trendPoints(months, period), [months, period])
  const { left: countTicks, right: rateTicks } = useMemo(
    () =>
      niceAxisPair(
        Math.max(1, ...data.map((d) => Math.max(d.headcount ?? 0, d.newHires, d.leaves))),
        Math.max(1, ...data.map((d) => d.newHireRate ?? 0))
      ),
    [data]
  )
  const countTop = countTicks[countTicks.length - 1]!
  const rateTop = rateTicks[rateTicks.length - 1]!
  const sides: Sides = useMemo(
    () => trendLabelSides(data, countTop, rateTop),
    [data, countTop, rateTop]
  )

  const lastIndex = data.reduce((last, d, i) => (d.headcount !== null ? i : last), -1)
  const periodKeys = data.filter((d) => d.inPeriod).map((d) => d.key)
  const first = data.find((d) => d.headcount !== null)
  const last = lastIndex >= 0 ? data[lastIndex] : undefined
  const summary =
    first && last
      ? `Tổng nhân sự từ ${formatCount(first.headcount!)} (T${first.month}/${first.year}) tới ${formatCount(last.headcount!)} (T${last.month}/${last.year})`
      : 'Chưa có số liệu'

  const headcountLabel = pointLabel({
    show: (i) => !dense || i === lastIndex || Boolean(data[i]?.inPeriod),
    below: (i) => Boolean(sides[i]?.headcountBelow),
    format: formatCount,
    color: INK,
    weight: 700,
    size: 12,
  })
  const rateLabel = pointLabel({
    // Tỷ lệ 0% nằm sát đáy, đè số trên cột — chấm ở đáy đã đủ, số xem ở tooltip.
    show: (i) => !dense && Boolean(data[i]?.newHireRate),
    below: (i) => Boolean(sides[i]?.rateBelow),
    format: (v) => formatRate(v),
    color: MUTED,
    weight: 600,
    size: 11,
  })

  return (
    <div ref={boxRef} className="flex w-full flex-1 flex-col" role="img" aria-label={summary}>
      <div className="mb-1 flex items-baseline justify-between text-xs font-medium text-muted-foreground">
        <span>Số lượng nhân sự</span>
        <span>Nhân sự mới / tổng (%)</span>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 22, right: 0, bottom: 0, left: 0 }}
            barGap={3}
            barCategoryGap={dense ? '22%' : '30%'}
            accessibilityLayer
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={HEADCOUNT_COLOR} stopOpacity={0.26} />
                <stop offset="100%" stopColor={HEADCOUNT_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={HAIRLINE} strokeOpacity={0.7} />
            {periodKeys.length > 0 ? (
              <ReferenceArea
                yAxisId="count"
                x1={periodKeys[0]}
                x2={periodKeys[periodKeys.length - 1]}
                fill="hsl(var(--muted))"
                fillOpacity={0.6}
                stroke="none"
              />
            ) : null}
            <XAxis
              dataKey="key"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: HAIRLINE }}
              height={36}
              tick={<MonthTick data={data} sparse={dense} />}
            />
            <YAxis
              yAxisId="count"
              domain={[0, countTop]}
              ticks={countTicks}
              interval={0}
              allowDecimals={false}
              tickFormatter={(v: number) => formatCount(v)}
              tick={{ fontSize: 11, fill: MUTED }}
              tickLine={false}
              axisLine={false}
              width={Y_WIDTH}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              domain={[0, rateTop]}
              ticks={rateTicks}
              interval={0}
              tickFormatter={(v: number) => formatRate(v)}
              tick={{ fontSize: 11, fill: MUTED }}
              tickLine={false}
              axisLine={false}
              width={Y_WIDTH}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.5 }}
              content={<TrendTooltip />}
            />
            <Area
              yAxisId="count"
              type="linear"
              dataKey="headcount"
              stroke={HEADCOUNT_COLOR}
              strokeWidth={2.5}
              strokeLinejoin="round"
              fill={`url(#${gradientId})`}
              dot={{ r: 4, fill: HEADCOUNT_COLOR, stroke: SURFACE, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: HEADCOUNT_COLOR, stroke: SURFACE, strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            >
              <LabelList dataKey="headcount" content={headcountLabel} />
            </Area>
            <Bar
              yAxisId="count"
              dataKey="newHires"
              fill={HIRE_COLOR}
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
              isAnimationActive={false}
            >
              {dense ? null : <LabelList dataKey="newHires" content={BarValue} />}
            </Bar>
            <Bar
              yAxisId="count"
              dataKey="leaves"
              fill={LEAVE_COLOR}
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
              isAnimationActive={false}
            >
              {dense ? null : <LabelList dataKey="leaves" content={BarValue} />}
            </Bar>
            <Line
              yAxisId="rate"
              type="linear"
              dataKey="newHireRate"
              stroke={RATE_COLOR}
              strokeWidth={1.75}
              strokeDasharray="5 4"
              dot={{ r: 3.5, fill: SURFACE, stroke: RATE_COLOR, strokeWidth: 1.75 }}
              activeDot={{ r: 5, fill: SURFACE, stroke: RATE_COLOR, strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            >
              <LabelList dataKey="newHireRate" content={rateLabel} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-foreground/85">
        <LegendItem
          swatch={
            <span className="relative flex w-5 items-center">
              <span className="w-full border-t-2" style={{ borderColor: HEADCOUNT_COLOR }} />
              <span
                className="absolute left-1/2 size-2 -translate-x-1/2 rounded-full ring-2 ring-card"
                style={{ background: HEADCOUNT_COLOR }}
              />
            </span>
          }
          label="Tổng nhân sự cuối tháng"
        />
        <LegendItem swatch={<BoxSwatch color={HIRE_COLOR} />} label="Vào làm" />
        <LegendItem swatch={<BoxSwatch color={LEAVE_COLOR} />} label="Nghỉ việc" />
        <LegendItem
          swatch={
            <span className="relative flex w-5 items-center">
              <span
                className="w-full border-t-2 border-dashed"
                style={{ borderColor: RATE_COLOR }}
              />
              <span
                className="absolute left-1/2 size-2 -translate-x-1/2 rounded-full border-[1.5px] bg-card"
                style={{ borderColor: RATE_COLOR }}
              />
            </span>
          }
          label="Nhân sự mới / tổng (%)"
        />
        <LegendItem
          swatch={<span className="h-3 w-4 rounded-[3px] bg-muted" />}
          label="Kỳ đang xem"
        />
      </div>
    </div>
  )
}
