import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { ManagerClassExamsScreen } from '@/features/manager/components/ManagerHub/ManagerClassExamsScreen'

export const Route = createFileRoute('/_protected/manager/class-exams')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['MANAGER'], ['manager.'])
    requirePermissionPrefix('manager.')
  },
  component: ManagerClassExamsPage,
})

function ManagerClassExamsPage() {
  return <ManagerClassExamsScreen />
}
