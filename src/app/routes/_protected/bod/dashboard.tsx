import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'

const BodDashboardScreenContainer = lazy(() =>
  import('@/features/bod/components/BodDashboardScreen').then((module) => ({
    default: module.BodDashboardScreenContainer,
  }))
)

export const Route = createFileRoute('/_protected/bod/dashboard')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['BOD'], ['bod.'])
    requirePermissionPrefix('bod.')
  },
  component: BodDashboardPage,
})

function BodDashboardPage() {
  return (
    <Suspense fallback={null}>
      <BodDashboardScreenContainer />
    </Suspense>
  )
}
