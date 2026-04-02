import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { ManagerExamScheduleScreen } from '@/features/manager/components/ManagerWorkflowScreens'

export const Route = createFileRoute('/_protected/manager/exam-schedule')({
  beforeLoad: () => requireRole('MANAGER'),
  component: ManagerExamSchedulePage,
})

function ManagerExamSchedulePage() {
  return <ManagerExamScheduleScreen />
}
