import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { z } from 'zod'
import { type kpiMonthlyApiSchema } from '@/features/manager/schemas'

export type KpiMonthly = z.infer<typeof kpiMonthlyApiSchema>

export interface KPIMonthlyViewProps {
  data: KpiMonthly
}

export function KPIMonthlyView({ data }: KPIMonthlyViewProps) {
  const chartData = data.metrics.map((m) => ({
    name: m.name,
    value: m.value,
    target: m.target,
  }))
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="hsl(var(--primary))" name="Thực tế" />
          <Bar dataKey="target" fill="hsl(var(--muted-foreground))" name="Mục tiêu" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
