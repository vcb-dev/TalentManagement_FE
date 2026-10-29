import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { requireAnyPermissionId } from '@/lib/permissionGuards'
import { ManagerClassesScreen } from '@/features/manager/components/ManagerWorkflowScreens'

const classesSearchSchema = z.object({
  /** Bỏ trống = tab "Lớp học tri thức". */
  tab: z.enum(['other']).optional().catch(undefined),
})

export const Route = createFileRoute('/_protected/manager/classes')({
  validateSearch: (raw) => classesSearchSchema.parse(raw),
  beforeLoad: () => {
    // `hr.classes.view` = HR chỉ xem lớp & học viên; sửa/xoá vẫn cần `manager.classes`.
    requireAnyPermissionId('manager.classes', 'hr.classes.view')
  },
  component: ManagerClassesPage,
})

function ManagerClassesPage() {
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ManagerClassesScreen
      tab={tab === 'other' ? 'other' : 'knowledge'}
      onTabChange={(next) =>
        void navigate({ search: { tab: next === 'other' ? 'other' : undefined }, replace: true })
      }
    />
  )
}
