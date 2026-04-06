import { createFileRoute } from '@tanstack/react-router'
import { HrEmployeeList } from '@/features/hr-admin/components/HrEmployeeList'
import { requireRole } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/leader/team/')({
  beforeLoad: () => requireRole('LEADER'),
  component: LeaderTeamPersonnelPage,
})

function LeaderTeamPersonnelPage() {
  return <HrEmployeeList variant="leader" />
}
