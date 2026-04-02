import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { BodDashboardScreenContainer } from '@/features/bod/components/BodDashboardScreen'

export const Route = createFileRoute('/_protected/bod/dashboard')({
  beforeLoad: () => requireRole('BOD'),
  component: BodDashboardScreenContainer,
})
