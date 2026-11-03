import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { pct, wrapChartLabel } from '../checklistOverview'

/**
 * Biểu đồ trang tổng quan checklist (recharts). Màu dữ liệu qua biến CSS `--viz-*` / token app nên
 * tự đổi theo giao diện sáng / tối; chữ luôn dùng màu chữ, không dùng màu dữ liệu.
 */

const INK = 'hsl(var(--foreground))'
const MUTED = 'hsl(var(--muted-foreground))'
const HAIRLINE = 'hsl(var(--border))'
const SURFACE = 'hsl(var(--card))'
const ACCENT = 'hsl(var(--button))'

/** `neutral` = "Bỏ trống" / "(đã xoá)": vẫn vẽ lát nhưng không được chọn làm số giữa vòng. */
export type ChartSlice = {
  key: string
  label: string
  count: number
  color: string
  neutral?: boolean
}

/** Dữ liệu một điểm trong tooltip recharts (chỉ phần cần dùng). */
type TipPayload<T> = { payload: T; dataKey?: string | number; value?: number; color?: string }
type TipProps<T> = { active?: boolean; payload?: TipPayload<T>[]; label?: string }

function TipBox({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="max-w-xs rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      {title ? (
        <p className="mb-1 font-medium leading-snug text-muted-foreground">{title}</p>
      ) : null}
      {children}
    </div>
  )
}

/** Dòng tooltip: số đứng trước (đậm), tên đứng sau; vạch màu ngắn thay cho ô màu. */
function TipLine({ color, value, label }: { color?: string; value: string; label?: string }) {
  return (
    <p className="flex items-center gap-2 leading-relaxed">
      {color ? (
        <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} />
      ) : null}
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      {label ? <span className="text-muted-foreground">{label}</span> : null}
    </p>
  )
}

/** Nhãn trục X tự ngắt dòng theo bề rộng mỗi cột (tối đa 3 dòng), di chuột xem nhãn đầy đủ. */
function WrappedTick(props: {
  x?: number
  y?: number
  width?: number
  visibleTicksCount?: number
  payload?: { value?: string }
}) {
  const { x = 0, y = 0, width = 0, visibleTicksCount = 1, payload } = props
  const label = String(payload?.value ?? '')
  const band = width / Math.max(1, visibleTicksCount)
  const lines = wrapChartLabel(label, Math.max(6, Math.floor((band - 8) / 6.2)), 3)
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{label}</title>
      <text textAnchor="middle" fontSize={11} fill={MUTED}>
        {lines.map((line, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 14 : 13}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
}

/**
 * Biểu đồ tròn (vành khuyên) cho câu chọn một: khe 2px màu nền giữa các lát, giữa vòng là tỷ lệ
 * của lựa chọn thật nhiều nhất (bỏ qua lát `neutral`). Số liệu từng lựa chọn nằm ở danh sách bên
 * cạnh (do thẻ cha vẽ).
 */
export function DonutChart({
  slices,
  total,
  label,
  onSelect,
}: {
  slices: ChartSlice[]
  total: number
  label: string
  onSelect: (key: string) => void
}) {
  const shown = slices.filter((s) => s.count > 0)
  const top = shown
    .filter((s) => !s.neutral)
    .reduce<ChartSlice | null>((a, b) => (!a || b.count > a.count ? b : a), null)
  return (
    <div
      className="relative size-40 shrink-0"
      role="img"
      aria-label={`${label}: ${shown.map((s) => `${s.label} ${s.count} (${pct(s.count, total)}%)`).join(', ')}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={shown}
            dataKey="count"
            nameKey="label"
            innerRadius="64%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke={SURFACE}
            strokeWidth={2}
            isAnimationActive={false}
            cursor="pointer"
            onClick={(_: unknown, i: number) => shown[i] && onSelect(shown[i].key)}
          >
            {shown.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 20 }}
            content={({ active, payload }: TipProps<ChartSlice>) => {
              const s = active ? payload?.[0]?.payload : undefined
              return s ? (
                <TipBox>
                  <TipLine
                    color={s.color}
                    value={`${s.count} · ${pct(s.count, total)}%`}
                    label={s.label}
                  />
                </TipBox>
              ) : null
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {top ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {pct(top.count, total)}%
          </span>
          <span className="line-clamp-2 w-[5.5rem] break-words text-[11px] leading-tight text-muted-foreground">
            {top.label}
          </span>
        </div>
      ) : null}
    </div>
  )
}

/** Nhãn trục Y (biểu đồ cột ngang) tự ngắt tối đa 3 dòng trong bề rộng trục, căn phải sát cột. */
function WrappedYTick(props: {
  x?: number
  y?: number
  payload?: { value?: string }
  labelWidth: number
}) {
  const { x = 0, y = 0, payload, labelWidth } = props
  const label = String(payload?.value ?? '')
  const lines = wrapChartLabel(label, Math.max(8, Math.floor((labelWidth - 12) / 6.6)), 3)
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{label}</title>
      <text textAnchor="end" fontSize={12} fill={MUTED}>
        {lines.map((line, i) => (
          <tspan key={i} x={-8} dy={i === 0 ? 4 - (lines.length - 1) * 7 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
}

/** Bề rộng thật của phần tử (ResizeObserver) — để chọn hướng biểu đồ theo chỗ trống của thẻ. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** `muted` = "(đã xoá / ngoài thang)": cột xám thay cho màu nhấn. */
type CountDatum = { key: string; label: string; count: number; muted?: boolean }
const MUTED_FILL = 'var(--viz-removed)'

/** Cột mờ phía sau mỗi cột: cùng màu nhấn, nhạt hẳn — dài bằng tổng số bản đã điền. */
const TRACK = { fill: ACCENT, fillOpacity: 0.1 }

/** Số ở đầu cột dạng "188/270": số người đậm, phần "/tổng" nhạt để mắt vẫn bắt số chính trước. */
function CountLabel(props: {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  value?: number | string
  base: number
  vertical: boolean
}) {
  const x = Number(props.x ?? 0)
  const y = Number(props.y ?? 0)
  const width = Number(props.width ?? 0)
  const height = Number(props.height ?? 0)
  return (
    <text
      x={props.vertical ? x + width / 2 : x + width + 8}
      y={props.vertical ? y - 6 : y + height / 2}
      dy={props.vertical ? 0 : 4}
      textAnchor={props.vertical ? 'middle' : 'start'}
      fontSize={12}
      pointerEvents="none"
    >
      <tspan fontWeight={600} fill={INK}>
        {props.value}
      </tspan>
      <tspan fill={MUTED}>/{props.base}</tspan>
    </text>
  )
}

/** Cột dọc cần mỗi nhãn ~80px trở lên; hẹp hơn (điện thoại) thì chuyển sang cột ngang. */
const MIN_COLUMN_BAND = 80
const ROW_HEIGHT = 44

/**
 * Biểu đồ cột một màu, đầu cột ghi "số người/tổng" (tỷ lệ % xem trong tooltip); bấm cột để xem danh
 * sách người. `columns` = cột dọc (3–5 đáp án); còn lại cột ngang (nhãn dài đọc dễ hơn, 1–2 cột
 * không lơ thơ giữa khung rộng).
 * Trục giá trị luôn chạy tới `base` (số bản đã điền) nên độ dài cột chính là tỷ lệ; cột mờ phía sau
 * (`TRACK`, phủ hết trục) cho thấy tổng để so. Không vẽ lưới: trục giá trị ẩn, số đã ghi trên từng
 * cột nên đường kẻ chỉ gây nhiễu.
 */
export function CountBarChart({
  items,
  base,
  columns,
  onSelect,
}: {
  items: CountDatum[]
  base: number
  columns: boolean
  onSelect: (key: string) => void
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const vertical = columns && width >= items.length * MIN_COLUMN_BAND
  const height = vertical ? 220 : items.length * ROW_HEIGHT + 8
  const domain = [0, Math.max(base, 1)]
  const tooltip = (
    <Tooltip
      cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.6 }}
      content={({ active, payload }: TipProps<CountDatum>) => {
        const d = active ? payload?.[0]?.payload : undefined
        return d ? (
          <TipBox title={d.label}>
            <TipLine value={`${d.count} · ${pct(d.count, base)}%`} label={`trên ${base} bản`} />
          </TipBox>
        ) : null
      }}
    />
  )
  const select = (_: unknown, i: number) => items[i] && items[i].count > 0 && onSelect(items[i].key)
  const labelWidth = Math.min(280, Math.max(110, Math.round(width * 0.36)))

  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width === 0 ? null : vertical ? (
        <BarChart
          width={width}
          height={height}
          data={items}
          margin={{ top: 22, right: 4, bottom: 0, left: 4 }}
          accessibilityLayer
        >
          <XAxis
            dataKey="label"
            interval={0}
            tickLine={false}
            axisLine={{ stroke: HAIRLINE }}
            tick={<WrappedTick />}
            height={48}
          />
          <YAxis hide domain={domain} />
          {tooltip}
          <Bar
            dataKey="count"
            fill={ACCENT}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            background={{ ...TRACK, radius: [4, 4, 0, 0] }}
            cursor="pointer"
            isAnimationActive={false}
            onClick={select}
          >
            {items.map((d) => (
              <Cell key={d.key} fill={d.muted ? MUTED_FILL : ACCENT} />
            ))}
            <LabelList dataKey="count" content={<CountLabel base={base} vertical />} />
          </Bar>
        </BarChart>
      ) : (
        <BarChart
          width={width}
          height={height}
          data={items}
          layout="vertical"
          margin={{ top: 4, right: 68, bottom: 4, left: 0 }}
          barCategoryGap="28%"
          accessibilityLayer
        >
          <XAxis type="number" hide domain={domain} />
          <YAxis
            type="category"
            dataKey="label"
            width={labelWidth}
            interval={0}
            tickLine={false}
            axisLine={{ stroke: HAIRLINE }}
            tick={<WrappedYTick labelWidth={labelWidth} />}
          />
          {tooltip}
          <Bar
            dataKey="count"
            fill={ACCENT}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            background={{ ...TRACK, radius: [0, 4, 4, 0] }}
            cursor="pointer"
            isAnimationActive={false}
            onClick={select}
          >
            {items.map((d) => (
              <Cell key={d.key} fill={d.muted ? MUTED_FILL : ACCENT} />
            ))}
            <LabelList dataKey="count" content={<CountLabel base={base} vertical={false} />} />
          </Bar>
        </BarChart>
      )}
    </div>
  )
}
