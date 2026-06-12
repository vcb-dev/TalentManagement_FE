import { lazy, Suspense } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { isManagerLikeRole } from '@/lib/managerLikeRole'
import { PageSkeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth.store'

const SalesKpiCatalogScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.SalesKpiCatalogScreen,
  }))
)

export const Route = createFileRoute('/_protected/leader/kpi-sales-config')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (isManagerLikeRole(user?.role)) throw redirect({ to: '/manager/kpi-sales-config' })
    requireRoleOrPermissionPrefixes(['LEADER'], ['kpi.catalog_'])
  },
  component: SalesKpiConfigPage,
})

function SalesKpiConfigPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SalesKpiCatalogScreen />
    </Suspense>
  )
}
