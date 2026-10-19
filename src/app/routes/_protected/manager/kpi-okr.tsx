import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireKpiOkrEnabled, requireManagerLikeOrPermissionPrefixes } from '@/lib/routeGuards'
import { PageSkeleton } from '@/components/ui/skeleton'

const ManagerSetKpiOkrScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.ManagerSetKpiOkrScreen,
  }))
)

export const Route = createFileRoute('/_protected/manager/kpi-okr')({
  beforeLoad: () => {
    requireKpiOkrEnabled()
    requireManagerLikeOrPermissionPrefixes(['kpi.team_'])
  },
  component: ManagerSetKpiOkrPage,
})

function ManagerSetKpiOkrPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManagerSetKpiOkrScreen />
    </Suspense>
  )
}
