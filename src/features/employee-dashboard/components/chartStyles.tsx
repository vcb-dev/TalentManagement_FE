/**
 * Chart helpers — gradients & custom dots dùng chung.
 * Tooltip / Grid / Axis styles được ChartContainer xử lý tự động.
 */
import type React from 'react'

// ─── Bar radius ───────────────────────────────────────────────────────────────
export const TOP_RADIUS = [8, 8, 0, 0] as [number, number, number, number]
export const RIGHT_RADIUS = [0, 8, 8, 0] as [number, number, number, number]
export const ALL_RADIUS = [8, 8, 8, 8] as [number, number, number, number]

// ─── SVG Gradients — dùng trong defs → fill="url(#gradKpi)" ─────────────────
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
        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
        <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.12} />
      </linearGradient>
      <linearGradient id="gradOkrSoft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
        <stop offset="100%" stopColor="#a7f3d0" stopOpacity={0.12} />
      </linearGradient>
    </defs>
  )
}

// ─── Custom dot cho Line chart ────────────────────────────────────────────────
export function renderActiveDot(props: any): React.ReactElement<SVGElement> {
  const { cx = 0, cy = 0, fill, r = 6 } = props
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 5} fill={fill} opacity={0.15} />
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="white" strokeWidth={2.5} />
    </g>
  ) as React.ReactElement<SVGElement>
}

export function renderDot(props: any): React.ReactElement<SVGElement> {
  const { cx = 0, cy = 0, fill } = props
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={fill}
      stroke="white"
      strokeWidth={2}
      style={{ transition: 'r 0.15s ease' }}
    />
  ) as React.ReactElement<SVGElement>
}
