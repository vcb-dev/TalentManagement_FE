import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireKpiOkrEnabled, requireManagerLikeOrPermissionPrefixes } from '@/lib/routeGuards'
import { PageSkeleton } from '@/components/ui/skeleton'

const ManagerKpiApprovalScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.ManagerKpiApprovalScreen,
  }))
)

export const Route = createFileRoute('/_protected/leader/kpi-approval')({
  beforeLoad: () => {
    requireKpiOkrEnabled()
    requireManagerLikeOrPermissionPrefixes([])
  },
  component: KpiApprovalPage,
})

function KpiApprovalPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManagerKpiApprovalScreen />
    </Suspense>
  )
}
