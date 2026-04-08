import { createFileRoute } from '@tanstack/react-router'
import { HrEmployeeList } from '@/features/hr-admin/components/HrEmployeeList'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/manager/team-progress')({
  beforeLoad: () => {
    requireRole('MANAGER')
    requirePermissionPrefix('manager.')
  },
  component: ManagerTeamPersonnelPage,
})

function ManagerTeamPersonnelPage() {
  return <HrEmployeeList variant="team" />
}
