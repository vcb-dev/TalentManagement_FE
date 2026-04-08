import { createFileRoute } from '@tanstack/react-router'
import { BodTraineeRankingScreen } from '@/features/bod/components/BodAnalyticsScreens'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/bod/trainee-ranking')({
  beforeLoad: () => {
    requireRole('BOD')
    requirePermissionPrefix('bod.')
  },
  component: BodTraineeRankingPage,
})

function BodTraineeRankingPage() {
  return <BodTraineeRankingScreen />
}
