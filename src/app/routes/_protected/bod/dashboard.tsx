import { createFileRoute } from '@tanstack/react-router'
import { BodDashboardScreenContainer } from '@/features/bod/components/BodDashboardScreen'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/bod/dashboard')({
  beforeLoad: () => {
    requireRole('BOD')
    requirePermissionPrefix('bod.')
  },
  component: BodDashboardScreenContainer,
})
