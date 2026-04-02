import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { z } from 'zod'
import { type headcountSummaryApiSchema } from '@/features/bod/schemas'

export type HeadcountModel = z.infer<typeof headcountSummaryApiSchema>

export interface HeadcountSummaryProps {
  data: HeadcountModel
}

export function HeadcountSummary({ data }: HeadcountSummaryProps) {
  const chartData = data.byDepartment.map((d) => ({ name: d.name, count: d.count }))
  return (
    <div className="space-y-3">
      <div className="text-sm">
        Tổng nhân sự: <span className="font-semibold">{data.total}</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
