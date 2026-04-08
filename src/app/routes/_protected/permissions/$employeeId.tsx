import { createFileRoute } from '@tanstack/react-router'
import { EmployeePermissionsScreen } from '@/features/permissions/components/EmployeePermissionsScreen'
import { usePermissionsEmployee } from '@/features/permissions/employeeDirectoryHooks'
import { requireBodOrManager } from '@/features/hr-admin/requireBodOrManager'
import { requirePermissionPrefix } from '@/lib/permissionGuards'

export const Route = createFileRoute('/_protected/permissions/$employeeId')({
  beforeLoad: () => {
    requireBodOrManager()
    requirePermissionPrefix('admin.')
  },
  component: EmployeePermissionsDetailPage,
})

function EmployeePermissionsDetailPage() {
  const { employeeId } = Route.useParams()
  const { data, isLoading } = usePermissionsEmployee(employeeId)

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Đang tải…
      </div>
    )
  }
  if (!data) {
    return (
      <div className="p-4 text-sm text-red-800">Không tìm thấy nhân viên hoặc lỗi tải dữ liệu.</div>
    )
  }
  return <EmployeePermissionsScreen employee={data} />
}
