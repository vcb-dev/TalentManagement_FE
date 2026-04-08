import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'
import { TeacherClassesScreen } from '@/features/teacher/components/TeacherClassesScreen'

export const Route = createFileRoute('/_protected/teacher/classes/')({
  beforeLoad: () => {
    requireRole('TEACHER')
    requirePermissionPrefix('teacher.')
  },
  component: TeacherClassesPage,
})

function TeacherClassesPage() {
  return <TeacherClassesScreen />
}
