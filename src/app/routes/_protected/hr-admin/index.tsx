import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HrEmployeeList } from '@/features/hr-admin/components/HrEmployeeList'
import { requireHrAdmin } from '@/features/hr-admin/requireHrAdmin'
import { requirePermissionPrefix } from '@/lib/permissionGuards'

const hrAdminSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  role: z.enum(['MEMBER', 'MANAGER', 'HR_ADMIN', 'TEACHER', 'BOD']).optional(),
  status: z.enum(['active', 'inactive', 'probation', 'reserved']).optional(),
  mode: z.enum(['view', 'edit']).optional(),
})

export const Route = createFileRoute('/_protected/hr-admin/')({
  validateSearch: (raw) => hrAdminSearchSchema.parse(raw),
  beforeLoad: () => {
    requireHrAdmin()
    requirePermissionPrefix('hr.')
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
