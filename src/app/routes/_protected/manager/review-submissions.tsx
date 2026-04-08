import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'
import { ManagerReviewSubmissionsScreen } from '@/features/manager/components/ManagerWorkflowScreens'

export const Route = createFileRoute('/_protected/manager/review-submissions')({
  beforeLoad: () => {
    requireRole('MANAGER')
    requirePermissionPrefix('manager.')
  },
  component: ManagerReviewSubmissionsPage,
})

function ManagerReviewSubmissionsPage() {
  return <ManagerReviewSubmissionsScreen />
}
