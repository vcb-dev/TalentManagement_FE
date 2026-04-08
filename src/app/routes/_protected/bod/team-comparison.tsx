import { createFileRoute } from '@tanstack/react-router'
import { BodTeamComparisonScreen } from '@/features/bod/components/BodAnalyticsScreens'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/bod/team-comparison')({
  beforeLoad: () => {
    requireRole('BOD')
    requirePermissionPrefix('bod.')
  },
  component: BodTeamComparisonPage,
})

function BodTeamComparisonPage() {
  return <BodTeamComparisonScreen />
}
