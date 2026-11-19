import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { requireAnyPermissionId } from '@/lib/permissionGuards'
import { ManagerClassesScreen } from '@/features/manager/components/ManagerWorkflowScreens'

const classesSearchSchema = z.object({
  /** Id lộ trình, hoặc 'none' = lớp chưa gắn lộ trình. Bỏ trống = mọi lớp. */
  course: z
    .union([z.literal('none'), z.string().uuid()])
    .optional()
    .catch(undefined),
  /** Id khoá học trong lộ trình đang lọc, hoặc 'whole' = lớp dạy cả lộ trình. Bỏ trống = mọi khoá học. */
  path: z
    .union([z.literal('whole'), z.string().uuid()])
    .optional()
    .catch(undefined),
  /** 'editor' = tab "Lớp Editor"; bỏ trống = tab "Lớp học". */
  tab: z.literal('editor').optional().catch(undefined),
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
  const { course, path, tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ManagerClassesScreen
      courseFilter={{ course, path }}
      onCourseFilterChange={(next) =>
        void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })
      }
      tab={tab === 'editor' ? 'editor' : 'classes'}
      onTabChange={(next) =>
        void navigate({
          search: (prev) => ({ ...prev, tab: next === 'editor' ? 'editor' : undefined }),
          replace: true,
        })
      }
    />
  )
}
