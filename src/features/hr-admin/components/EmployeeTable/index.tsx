import { useNavigate } from '@tanstack/react-router'
import { EmployeeTable } from './EmployeeTable'
import { useEmployeeTable } from './useEmployeeTable'
import type { EmployeeFilters } from '@/features/hr-admin/types'

/** Demo / tái sử dụng nhanh — phân trang cập nhật qua URL `/hr-admin` giống HrEmployeeList. */
export function EmployeeTableContainer(props?: { initial?: Partial<EmployeeFilters> }) {
  const table = useEmployeeTable(props?.initial)
  const navigate = useNavigate()
  return (
    <EmployeeTable
      employees={table.employees}
      isLoading={table.isLoading}
      onView={table.onView}
      onEdit={table.onEdit}
      onDeactivate={table.onDeactivate}
      onReactivate={table.onReactivate}
      pagination={table.pagination}
      onPageChange={(page) => {
        void navigate({ to: '/hr-admin', search: (s) => ({ ...s, page }) })
      }}
      listMode="hr"
    />
  )
}

export { EmployeeTable }
