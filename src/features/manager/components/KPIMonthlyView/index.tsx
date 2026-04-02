import { KPIMonthlyView } from './KPIMonthlyView'
import { useKpiMonthly } from '@/features/manager/hooks'

export function KPIMonthlyViewContainer({ month }: { month: string }) {
  const q = useKpiMonthly(month)
  if (!q.data) return null
  return <KPIMonthlyView data={q.data} />
}

export { KPIMonthlyView }
