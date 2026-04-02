import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { TeacherClassesScreen } from '@/features/teacher/components/TeacherClassesScreen'

export const Route = createFileRoute('/_protected/teacher/classes/')({
  beforeLoad: () => requireRole('TEACHER'),
  component: TeacherClassesPage,
})

function TeacherClassesPage() {
  return <TeacherClassesScreen />
}
