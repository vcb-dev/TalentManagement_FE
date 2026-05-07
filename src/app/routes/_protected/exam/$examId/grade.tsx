import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { GraderChamThiScreen } from '@/features/exam/components/GraderChamThiScreen'

const gradeSearchSchema = z.object({
  employeeId: z.string().uuid().optional(),
})

export const Route = createFileRoute('/_protected/exam/$examId/grade')({
  validateSearch: (raw) => gradeSearchSchema.parse(raw),
  beforeLoad: () =>
    requireRoleOrPermissionPrefixes(
      ['TEACHER', 'MANAGER', 'LEADER'],
      ['teacher.', 'manager.', 'leader.']
    ),
  component: ExamGradePage,
})

function ExamGradePage() {
  const { examId } = Route.useParams()
  const { employeeId: qEmployeeId } = Route.useSearch()
  const employeeId = qEmployeeId ?? '00000000-0000-4000-8000-000000000001'
  return <GraderChamThiScreen examId={examId} employeeId={employeeId} />
}
