import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'
import { TeacherClassDetailScreen } from '@/features/teacher/components/TeacherClassDetailScreen'

export const Route = createFileRoute('/_protected/teacher/classes/$classId')({
  beforeLoad: () => {
    requireRole('TEACHER')
    requirePermissionPrefix('teacher.')
  },
  component: TeacherClassDetailPage,
})

function TeacherClassDetailPage() {
  const { classId } = Route.useParams()
  return <TeacherClassDetailScreen classId={classId} />
}
