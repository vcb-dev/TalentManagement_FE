import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { GraderPhanLopScreen } from '@/features/exam/components/GraderPhanLopScreen'

const classifySearchSchema = z.object({
  employeeId: z.string().uuid().optional(),
  pass: z.coerce.number().int().min(0).optional(),
  total: z.coerce.number().int().min(1).optional(),
})

export const Route = createFileRoute('/_protected/exam/$examId/classify')({
  validateSearch: (raw) => classifySearchSchema.parse(raw),
  /** Phân lớp sau thi — thuộc Manager (chia lớp). */
  beforeLoad: () => requireRoleOrPermissionPrefixes(['MANAGER'], ['manager.']),
  component: ExamClassifyPage,
})

function ExamClassifyPage() {
  const { examId } = Route.useParams()
  const search = Route.useSearch()
  const employeeId = search.employeeId ?? '00000000-0000-4000-8000-000000000001'
  return (
    <GraderPhanLopScreen
      examId={examId}
      employeeId={employeeId}
      passCount={search.pass}
      totalCount={search.total}
    />
  )
}
