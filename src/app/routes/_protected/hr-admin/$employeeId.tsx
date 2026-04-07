import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HrEmployeeProfile } from '@/features/hr-admin/components/HrEmployeeProfile'
import { useEmployee } from '@/features/hr-admin/hooks'
import { requireHrAdmin } from '@/features/hr-admin/requireHrAdmin'
import { requirePermissionPrefix } from '@/lib/permissionGuards'

const employeeSearchSchema = z.object({
  mode: z.enum(['view', 'edit']).optional(),
})

export const Route = createFileRoute('/_protected/hr-admin/$employeeId')({
  validateSearch: (raw) => employeeSearchSchema.parse(raw),
  beforeLoad: () => {
    requireHrAdmin()
    requirePermissionPrefix('hr.')
  },
  component: EmployeeDetailPage,
})

function EmployeeDetailPage() {
  const { employeeId } = Route.useParams()
  const search = Route.useSearch()
  const { data, isLoading } = useEmployee(employeeId)
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#6B7F96]">
        Đang tải…
      </div>
    )
  }
  if (!data) {
    return (
      <div className="p-4 text-sm text-[#991B1B]">
        Không tìm thấy nhân viên hoặc lỗi tải dữ liệu.
      </div>
    )
  }
  return <HrEmployeeProfile employee={data} initialTab={search.mode === 'edit' ? 4 : 0} />
}
