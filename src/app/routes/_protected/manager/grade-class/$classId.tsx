import { createFileRoute } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { GraderClassByQuestionScreen } from '@/features/exam/components/GraderClassByQuestionScreen'

export const Route = createFileRoute('/_protected/manager/grade-class/$classId')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['TEACHER', 'MANAGER'], ['teacher.', 'manager.'])
  },
  validateSearch: (search: Record<string, unknown>) => ({
    scheduleId: (search.scheduleId as string) || undefined,
  }),
  component: GraderClassByQuestionPage,
})

function GraderClassByQuestionPage() {
  const { classId } = Route.useParams()
  const { scheduleId } = Route.useSearch()
  return <GraderClassByQuestionScreen classId={classId} scheduleId={scheduleId} />
}
