import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { PageSkeleton } from '@/components/ui/skeleton'

const SalesKpiCatalogScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.SalesKpiCatalogScreen,
  }))
)

export const Route = createFileRoute('/_protected/leader/kpi-sales-config')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['MANAGER'], ['kpi.catalog_'])
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
