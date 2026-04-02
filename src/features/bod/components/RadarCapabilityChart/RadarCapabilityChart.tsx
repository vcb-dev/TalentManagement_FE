import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { z } from 'zod'
import { type radarCapabilityApiSchema } from '@/features/bod/schemas'

export type RadarRow = z.infer<typeof radarCapabilityApiSchema>

export interface RadarCapabilityChartProps {
  data: RadarRow[]
}

export function RadarCapabilityChart({ data }: RadarCapabilityChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis />
          <Radar name="Hiện tại" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
