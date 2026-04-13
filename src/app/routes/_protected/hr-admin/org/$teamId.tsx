import { createFileRoute } from '@tanstack/react-router'
import { HrTeamManagementScreen } from '@/features/hr-admin/components/HrOrgStructure/HrTeamManagementScreen'
import { requireOrgManageAccess } from '@/features/hr-admin/requireOrgManage'

export const Route = createFileRoute('/_protected/hr-admin/org/$teamId')({
  beforeLoad: () => requireOrgManageAccess(),
  component: HrAdminTeamManagementPage,
})

function HrAdminTeamManagementPage() {
  const { teamId } = Route.useParams()
  return <HrTeamManagementScreen teamId={teamId} />
}
