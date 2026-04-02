import { RadarCapabilityChart } from './RadarCapabilityChart'
import { useBodRadar } from '@/features/bod/hooks'

export function RadarCapabilityChartContainer(props: { departmentId?: string }) {
  const q = useBodRadar(props.departmentId)
  const rows = q.data ?? []
  return <RadarCapabilityChart data={rows} />
}

export { RadarCapabilityChart }
