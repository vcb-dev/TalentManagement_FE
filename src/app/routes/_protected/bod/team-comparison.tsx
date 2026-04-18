import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'

const BodTeamComparisonScreen = lazy(() =>
  import('@/features/bod/components/BodAnalyticsScreens').then((module) => ({
    default: module.BodTeamComparisonScreen,
  }))
)

export const Route = createFileRoute('/_protected/bod/team-comparison')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['BOD'], ['bod.'])
    requirePermissionPrefix('bod.')
  },
  component: BodTeamComparisonPage,
})

function BodTeamComparisonPage() {
  return (
    <Suspense fallback={null}>
      <BodTeamComparisonScreen />
    </Suspense>
  )
}
