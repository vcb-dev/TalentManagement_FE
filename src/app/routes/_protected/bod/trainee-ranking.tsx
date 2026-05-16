import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { PageSkeleton } from '@/components/ui/skeleton'

const BodTraineeRankingScreen = lazy(() =>
  import('@/features/bod/components/BodAnalyticsScreens').then((module) => ({
    default: module.BodTraineeRankingScreen,
  }))
)

export const Route = createFileRoute('/_protected/bod/trainee-ranking')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['BOD'], ['bod.'])
    requirePermissionPrefix('bod.')
  },
  component: BodTraineeRankingPage,
})

function BodTraineeRankingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BodTraineeRankingScreen />
    </Suspense>
  )
}
