import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HrEmployeeList } from '@/features/hr-admin/components/HrEmployeeList'
import { requireEmployeeDirectoryAccess } from '@/features/hr-admin/requireHrAdmin'
import { useAuthStore } from '@/stores/auth.store'

const hrAdminSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(12).max(100).optional().default(15),
  role: z.enum(['MEMBER', 'LEADER', 'MANAGER', 'HR', 'TEACHER', 'BOD']).optional(),
  status: z.enum(['active', 'inactive', 'probation', 'reserved']).optional(),
  mode: z.enum(['view', 'edit']).optional(),
})

export const Route = createFileRoute('/_protected/hr-admin/')({
  validateSearch: (raw) => hrAdminSearchSchema.parse(raw),
  beforeLoad: () => {
    requireEmployeeDirectoryAccess()
  },
  component: HrAdminIndexPage,
})

function HrAdminIndexPage() {
  const search = Route.useSearch()
  const user = useAuthStore((s) => s.user)
  const leaderTeamId = user?.role === 'LEADER' ? user.teamIds?.[0] : undefined
  return (
    <HrEmployeeList
      initialFilters={{
        page: search.page,
        pageSize: search.pageSize,
        status: search.status,
        teamId: leaderTeamId,
      }}
    />
  )
}
