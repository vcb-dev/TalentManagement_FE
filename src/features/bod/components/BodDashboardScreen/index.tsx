import { BodDashboardScreen } from './BodDashboardScreen'
import { useBodDashboard } from '@/features/bod/hooks'

export function BodDashboardScreenContainer() {
  const { data, isLoading } = useBodDashboard()
  return <BodDashboardScreen page={data} isLoading={isLoading} />
}

export { BodDashboardScreen }
