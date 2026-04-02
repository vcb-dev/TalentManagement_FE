import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { ManagerReviewSubmissionsScreen } from '@/features/manager/components/ManagerWorkflowScreens'

export const Route = createFileRoute('/_protected/manager/review-submissions')({
  beforeLoad: () => requireRole('MANAGER'),
  component: ManagerReviewSubmissionsPage,
})

function ManagerReviewSubmissionsPage() {
  return <ManagerReviewSubmissionsScreen />
}
