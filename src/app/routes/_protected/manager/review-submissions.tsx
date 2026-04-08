import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { ManagerReviewSubmissionsScreen } from '@/features/manager/components/ManagerWorkflowScreens'

export const Route = createFileRoute('/_protected/manager/review-submissions')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['MANAGER'], ['manager.'])
    requirePermissionPrefix('manager.')
  },
  component: ManagerReviewSubmissionsPage,
})

function ManagerReviewSubmissionsPage() {
  return <ManagerReviewSubmissionsScreen />
}
