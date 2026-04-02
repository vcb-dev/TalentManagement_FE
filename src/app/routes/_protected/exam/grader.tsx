import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { GraderExamListScreen } from '@/features/exam/components/GraderExamListScreen'

export const Route = createFileRoute('/_protected/exam/grader')({
  beforeLoad: () => requireRole('TEACHER'),
  component: GraderExamListPage,
})

function GraderExamListPage() {
  return <GraderExamListScreen />
}
