import { useNavigate } from '@tanstack/react-router'
import { EmployeeTable } from './EmployeeTable'
import { useEmployeeTable } from './useEmployeeTable'
import type { EmployeeFilters } from '@/features/hr-admin/types'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'

/** Demo / tái sử dụng nhanh — phân trang cập nhật qua URL `/hr-admin` giống HrEmployeeList. */
export function EmployeeTableContainer(props?: { initial?: Partial<EmployeeFilters> }) {
  const table = useEmployeeTable(props?.initial)
  const navigate = useNavigate()
  return (
    <>
      <EmployeeTable
        employees={table.employees}
        isLoading={table.isLoading}
        onView={table.onView}
        onEdit={table.onEdit}
        onDeactivate={table.onDeactivate}
        onReactivate={table.onReactivate}
        pagination={table.pagination}
        onPageChange={(page) => {
          void navigate({
            to: '/hr-admin',
            search: (s) => ({ ...s, page, pageSize: s.pageSize ?? 15 }),
          })
        }}
        listMode="hr"
      />
      <ConfirmDialog
        open={table.confirmPending !== null}
        onOpenChange={(open) => { if (!open) table.onCancelPending() }}
        title={table.confirmPending?.type === 'deactivate' ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?'}
        description={
          table.confirmPending?.type === 'deactivate'
            ? 'Nhân viên sẽ không thể đăng nhập sau khi bị vô hiệu hóa.'
            : 'Nhân viên sẽ được khôi phục quyền đăng nhập.'
        }
        confirmLabel={table.confirmPending?.type === 'deactivate' ? 'Vô hiệu hóa' : 'Kích hoạt'}
        destructive={table.confirmPending?.type === 'deactivate'}
        onConfirm={table.onConfirmPending}
      />
    </>
  )
}

export { EmployeeTable }
