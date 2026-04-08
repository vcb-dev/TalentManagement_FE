import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HrEmployeeList } from '@/features/hr-admin/components/HrEmployeeList'
import { requireEmployeeDirectoryAccess } from '@/features/hr-admin/requireHrAdmin'

const hrAdminSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  role: z.enum(['MEMBER', 'MANAGER', 'HR', 'TEACHER', 'BOD']).optional(),
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
  return (
    <HrEmployeeList
      initialFilters={{
        page: search.page,
        pageSize: 48,
        role: search.role,
        status: search.status,
      }}
    />
  )
}
