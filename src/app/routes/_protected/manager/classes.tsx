import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { requireAnyPermissionId } from '@/lib/permissionGuards'
import { ManagerClassesScreen } from '@/features/manager/components/ManagerWorkflowScreens'

const classesSearchSchema = z.object({
  /** Id khoá, hoặc 'none' = lớp chưa gắn khoá. Bỏ trống = mọi lớp. */
  course: z
    .union([z.literal('none'), z.string().uuid()])
    .optional()
    .catch(undefined),
  /** Id lộ trình trong khoá đang lọc, hoặc 'whole' = lớp dạy cả khoá. Bỏ trống = mọi lộ trình. */
  path: z
    .union([z.literal('whole'), z.string().uuid()])
    .optional()
    .catch(undefined),
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
  const { course, path } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ManagerClassesScreen
      courseFilter={{ course, path }}
      onCourseFilterChange={(next) => void navigate({ search: next, replace: true })}
    />
  )
}
