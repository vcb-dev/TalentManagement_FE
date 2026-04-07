import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'
import { ManagerExamScheduleScreen } from '@/features/manager/components/ManagerWorkflowScreens'

export const Route = createFileRoute('/_protected/manager/exam-schedule')({
  beforeLoad: () => {
    requireRole('MANAGER')
    requirePermissionPrefix('manager.')
  },
  component: ManagerExamSchedulePage,
})

function ManagerExamSchedulePage() {
  return <ManagerExamScheduleScreen />
}
