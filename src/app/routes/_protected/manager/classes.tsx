import { createFileRoute } from '@tanstack/react-router'
import { requireAnyPermissionId } from '@/lib/permissionGuards'
import { ManagerClassesScreen } from '@/features/manager/components/ManagerWorkflowScreens'

export const Route = createFileRoute('/_protected/manager/classes')({
  beforeLoad: () => {
    // `hr.classes.view` = HR chỉ xem lớp & học viên; sửa/xoá vẫn cần `manager.classes`.
    requireAnyPermissionId('manager.classes', 'hr.classes.view')
  },
  component: ManagerClassesPage,
})

function ManagerClassesPage() {
  return <ManagerClassesScreen />
}
