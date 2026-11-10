import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { formatCount, formatShare, type SplitPart } from './overviewModel'

const SURFACE = 'hsl(var(--card))'
const SIZE = 168
const INNER = Math.round(SIZE * 0.35)
const RING = SIZE / 2 - INNER

function SliceTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: Array<{ payload: SplitPart }>
  total: number
}) {
  const p = active ? payload?.[0]?.payload : undefined
  if (!p) return null
  return (
    <div className="rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <p className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: p.color }} />
        <span className="font-medium text-foreground">{p.label}</span>
      </p>
      <p className="mt-0.5 pl-[18px] text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{formatCount(p.count)}</span>{' '}
        người · {formatShare(p.count, total)}
      </p>
      {p.members && p.members.length > 1 ? (
        <p className="mt-1 max-w-56 border-t border-border/70 pl-[18px] pt-1 text-muted-foreground">
          {p.members.map((m) => `${m.label}: ${formatCount(m.count)}`).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Chú thích của biểu đồ tròn: chấm màu · tên · số · %, dưới mỗi dòng một vạch tỷ lệ trên tổng (cùng màu
 * lát) — giãn hết bề ngang thẻ như "Phân bổ nhân sự", và phần nhỏ (1–2%) vẫn so được bằng mắt.
 */
function DonutLegend({ parts, total }: { parts: SplitPart[]; total: number }) {
  return (
    <ul className="space-y-2.5">
      {parts.map((p) => (
        <li
          key={p.key}
          title={
            p.members && p.members.length > 1
              ? p.members.map((m) => `${m.label}: ${m.count}`).join(' · ')
              : undefined
          }
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate text-foreground/90">{p.label}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatCount(p.count)}
            </span>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {formatShare(p.count, total)}
            </span>
          </div>
          <div className="ml-[18px] mt-1 h-1.5 rounded-full bg-muted/70">
            <div
              className="h-full rounded-full"
              style={{
                width: `${total > 0 ? Math.max(1.5, (p.count / total) * 100) : 0}%`,
                background: p.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Biểu đồ tròn (vành khuyên) một tổng chia nhiều phần: khe 2px màu nền giữa các lát, số lớn ở giữa,
 * chú thích có vạch tỷ lệ bên cạnh (thẻ hẹp thì xuống dưới). Đọc số ở chú thích, di chuột lát để xem nhanh.
 */
export function OverviewDonut({
  parts,
  total,
  label,
  centerValue,
  centerCaption,
}: {
  parts: SplitPart[]
  total: number
  label: string
  centerValue: string
  centerCaption: string
}) {
  const shown = parts.filter((p) => p.count > 0)
  return (
    <div className="flex w-full flex-wrap items-center gap-x-8 gap-y-5">
      <div
        className="relative mx-auto shrink-0"
        style={{ width: SIZE, height: SIZE }}
        role="img"
        aria-label={`${label}: ${shown.map((p) => `${p.label} ${p.count}`).join(', ') || 'chưa có số liệu'}`}
      >
        {total > 0 ? (
          <PieChart width={SIZE} height={SIZE}>
            <Pie
              data={shown}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={INNER}
              outerRadius={SIZE / 2}
              startAngle={90}
              endAngle={-270}
              stroke={SURFACE}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {shown.map((p) => (
                <Cell key={p.key} fill={p.color} />
              ))}
            </Pie>
            <Tooltip
              content={<SliceTooltip total={total} />}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: 20 }}
            />
          </PieChart>
        ) : (
          <div className="size-full rounded-full border-muted" style={{ borderWidth: RING }} />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold leading-none tracking-tight text-foreground">
            {centerValue}
          </span>
          <span className="mt-1 max-w-20 text-xs leading-tight text-muted-foreground">
            {centerCaption}
          </span>
        </div>
      </div>
      <div className="min-w-[14rem] flex-1">
        <DonutLegend parts={shown} total={total} />
      </div>
    </div>
  )
}
