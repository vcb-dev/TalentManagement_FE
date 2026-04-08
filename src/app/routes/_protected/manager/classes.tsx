import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { ManagerClassesScreen } from '@/features/manager/components/ManagerWorkflowScreens'

export const Route = createFileRoute('/_protected/manager/classes')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['MANAGER'], ['manager.'])
    requirePermissionPrefix('manager.')
  },
  component: ManagerClassesPage,
})

function ManagerClassesPage() {
  return <ManagerClassesScreen />
}
