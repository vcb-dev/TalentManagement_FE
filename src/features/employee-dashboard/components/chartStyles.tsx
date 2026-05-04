/**
 * Biểu đồ Recharts — style & micro-interaction thống nhất.
 *
 * - CSS-animation cho enter
 * - Custom tooltip dùng chung
 * - Gradient fill helpers
 * - Hover highlight và active dot
 */

// ─── Tooltip ──────────────────────────────────────────────────────────────────

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card) / 0.97)',
  fontSize: 12,
  padding: '8px 12px',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 28px -8px hsl(var(--primary) / 0.18)',
}

export const CHART_TOOLTIP_ITEM = {
  gap: 8,
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export const CHART_GRID_LINE = {
  stroke: 'hsl(var(--border) / 0.5)',
  strokeDasharray: '4 4',
  vertical: false,
} as const

// ─── Axis ─────────────────────────────────────────────────────────────────────

export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
} as const

export const CHART_AXIS_LINE = {
  stroke: 'hsl(var(--border))',
} as const

// ─── Bar raduis ───────────────────────────────────────────────────────────────

export const TOP_RADIUS = [8, 8, 0, 0] as [number, number, number, number]
export const RIGHT_RADIUS = [0, 8, 8, 0] as [number, number, number, number]
export const BOTTOM_RADIUS = [0, 0, 8, 8] as [number, number, number, number]
export const ALL_RADIUS = [8, 8, 8, 8] as [number, number, number, number]

// ─── Legend ───────────────────────────────────────────────────────────────────

export const CHART_LEGEND = {
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: { fontSize: 11, paddingTop: 8 },
} as const

// ─── Animation ────────────────────────────────────────────────────────────────

/**
 * Dùng trong `cellAnimation` prop của Recharts Cell:
 * `<Cell animationBegin={...} />`
 */
export const CELL_DELAYS = [0, 80, 160, 240, 320, 400, 480, 560]

// ─── Gradient — dùng trong defs → fill="url(#gradKpi)" ──────────────────────

export function ChartGradients() {
  return (
    <defs>
      <linearGradient id="gradKpi" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
      </linearGradient>
      <linearGradient id="gradOkr" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#059669" stopOpacity={0.5} />
      </linearGradient>
      <linearGradient id="gradKpiSoft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.15} />
      </linearGradient>
      <linearGradient id="gradOkrSoft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#a7f3d0" stopOpacity={0.15} />
      </linearGradient>
      <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
      </linearGradient>
      <linearGradient id="gradInProgress" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.6} />
      </linearGradient>
    </defs>
  )
}

// ─── Custom dot cho Line chart — hover phóng to ──────────────────────────────

export function renderActiveDot(props: any) {
  const { cx, cy, fill, r = 6 } = props
  if (cx == null || cy == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 4} fill={fill} opacity={0.15} />
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="white" strokeWidth={2} />
    </g>
  )
}

export function renderDot(props: any) {
  const { cx, cy, fill } = props
  if (cx == null || cy == null) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={fill}
      stroke="white"
      strokeWidth={1.5}
      style={{ transition: 'r 0.15s ease' }}
    />
  )
}
