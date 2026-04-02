import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { BodTraineeRankingScreen } from '@/features/bod/components/BodAnalyticsScreens'

export const Route = createFileRoute('/_protected/bod/trainee-ranking')({
  beforeLoad: () => requireRole('BOD'),
  component: BodTraineeRankingPage,
})

function BodTraineeRankingPage() {
  return <BodTraineeRankingScreen />
}
