import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { BodTeamComparisonScreen } from '@/features/bod/components/BodAnalyticsScreens'

export const Route = createFileRoute('/_protected/bod/team-comparison')({
  beforeLoad: () => requireRole('BOD'),
  component: BodTeamComparisonPage,
})

function BodTeamComparisonPage() {
  return <BodTeamComparisonScreen />
}
