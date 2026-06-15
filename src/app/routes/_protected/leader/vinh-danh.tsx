import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireManagerLikeOrPermissionPrefixes } from '@/lib/routeGuards'
import { PageSkeleton } from '@/components/ui/skeleton'

const ManagerKpiOkrScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.ManagerKpiOkrScreen,
  }))
)

export const Route = createFileRoute('/_protected/leader/vinh-danh')({
  beforeLoad: () => {
    requireManagerLikeOrPermissionPrefixes([])
  },
  component: VinhDanhPage,
})

function VinhDanhPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManagerKpiOkrScreen />
    </Suspense>
  )
}
