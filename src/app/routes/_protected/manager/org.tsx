import { createFileRoute } from '@tanstack/react-router'
import { requireAnyPermissionId } from '@/lib/permissionGuards'
import { OrgManagementScreen } from '@/features/manager/components/OrgManagement/OrgManagementScreen'

export const Route = createFileRoute('/_protected/manager/org')({
  beforeLoad: () => {
    requireAnyPermissionId('admin.permissions.assign')
  },
  component: OrgManagementPage,
})

function OrgManagementPage() {
  return <OrgManagementScreen />
}
