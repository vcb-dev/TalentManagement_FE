import { createFileRoute } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { GraderClassByQuestionScreen } from '@/features/exam/components/GraderClassByQuestionScreen'

export const Route = createFileRoute('/_protected/manager/grade-class/$classId/by-question')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['TEACHER', 'MANAGER', 'BOD'], ['teacher.', 'manager.'])
  },
  component: GraderClassByQuestionPage,
})

function GraderClassByQuestionPage() {
  const { classId } = Route.useParams()
  return <GraderClassByQuestionScreen classId={classId} />
}
