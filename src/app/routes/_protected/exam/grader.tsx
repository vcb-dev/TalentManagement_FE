import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { GraderExamListScreen } from '@/features/exam/components/GraderExamListScreen'

export const Route = createFileRoute('/_protected/exam/grader')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['TEACHER', 'MANAGER'], ['teacher.', 'manager.'])
  },
  component: GraderExamListPage,
})

function GraderExamListPage() {
  return <GraderExamListScreen />
}
