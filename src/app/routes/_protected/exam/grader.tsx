import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'
import { GraderExamListScreen } from '@/features/exam/components/GraderExamListScreen'

export const Route = createFileRoute('/_protected/exam/grader')({
  beforeLoad: () => {
    requireRole('TEACHER')
    requirePermissionPrefix('teacher.')
  },
  component: GraderExamListPage,
})

function GraderExamListPage() {
  return <GraderExamListScreen />
}
