import { createFileRoute } from '@tanstack/react-router'
import { BodDashboardScreenContainer } from '@/features/bod/components/BodDashboardScreen'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/bod/dashboard')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['BOD'], ['bod.'])
    requirePermissionPrefix('bod.')
  },
  component: BodDashboardScreenContainer,
})
