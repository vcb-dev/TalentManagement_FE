import { createFileRoute } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { EditorExamGradingScreen } from '@/features/exam-papers/components/EditorExamGradingScreen'

export const Route = createFileRoute('/_protected/manager/grade-editor-exam/$scheduleId')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(
      ['TEACHER', 'MANAGER', 'BOD', 'LEADER'],
      ['teacher.', 'manager.', 'leader.']
    )
  },
  component: GradeEditorExamPage,
})

function GradeEditorExamPage() {
  const { scheduleId } = Route.useParams()
  return <EditorExamGradingScreen scheduleId={scheduleId} />
}
