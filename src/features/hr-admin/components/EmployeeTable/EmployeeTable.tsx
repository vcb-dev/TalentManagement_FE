import type { EmployeeEntity } from '@/features/hr-admin/api'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { RoleBadge } from '@/components/shared/RoleBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatViDate } from '@/lib/date'
import type { PaginationState } from '@/types/common'
import type { EmployeeStatus } from '@/types/employee'

export interface EmployeeTableProps {
  employees: EmployeeEntity[]
  isLoading: boolean
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDeactivate: (id: string) => void
  pagination: PaginationState & { total: number }
  onPageChange: (page: number) => void
  /** Quản lý team: chỉ cột Xem. */
  listMode?: 'hr' | 'team'
}

export function EmployeeTable({
  employees,
  isLoading,
  onView,
  onEdit,
  onDeactivate,
  pagination,
  onPageChange,
  listMode = 'hr',
}: EmployeeTableProps) {
  const columns: DataTableColumn<EmployeeEntity>[] = [
    {
      id: 'name',
      header: 'Nhân viên',
      cell: (e) => (
        <div className="flex items-center gap-2">
          <EmployeeAvatar name={e.name} />
          <span>{e.name}</span>
        </div>
      ),
    },
    { id: 'email', header: 'Email', cell: (e) => e.email },
    {
      id: 'role',
      header: 'Vai trò',
      cell: (e) => <RoleBadge role={e.role} />,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (e) => <StatusBadge status={e.status as EmployeeStatus} />,
    },
    {
      id: 'updated',
      header: 'Cập nhật',
      cell: (e) => formatViDate(e.updatedAt),
    },
    {
      id: 'actions',
      header: '',
      cell: (e) => (
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onView(e.id)}>
            Xem
          </Button>
          {listMode === 'hr' ? (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(e.id)}>
                Sửa
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => onDeactivate(e.id)}>
                Vô hiệu
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={employees} isLoading={isLoading} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Trang {pagination.page} — {pagination.total} bản ghi
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Trước
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(pagination.page + 1)}>
            Sau
          </Button>
        </div>
      </div>
    </div>
  )
}
