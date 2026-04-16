import type { EmployeeEntity } from '@/features/hr-admin/api'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { RoleBadge } from '@/components/shared/RoleBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { PaginationPrevNext } from '@/components/ui/pagination'
import { formatViDate } from '@/lib/date'
import type { PaginationState } from '@/types/common'
import type { EmployeeStatus } from '@/types/employee'

export interface EmployeeTableProps {
  employees: EmployeeEntity[]
  isLoading: boolean
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDeactivate: (id: string) => void
  /** Kích hoạt lại (ACTIVE) — cần quyền ch��nh sửa. */
  onReactivate?: (id: string) => void
  pagination: PaginationState & { total: number }
  onPageChange: (page: number) => void
  /** Danh sách HR vs team: khác cột hành động. */
  listMode?: 'hr' | 'team'
  canEdit?: boolean
  canDeactivate?: boolean
}

export function EmployeeTable({
  employees,
  isLoading,
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
  pagination,
  onPageChange,
  listMode = 'hr',
  canEdit = true,
  canDeactivate = true,
}: EmployeeTableProps) {
  const pageSize = Math.max(1, pagination.pageSize)
  const totalPages = pagination.totalPages ?? Math.max(1, Math.ceil(pagination.total / pageSize))
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pageSize + 1
  const to = Math.min(pagination.page * pageSize, pagination.total)
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
              {canEdit ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(e.id)}>
                  Sửa
                </Button>
              ) : null}
              {e.status === 'INACTIVE' && onReactivate && canEdit ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => onReactivate(e.id)}>
                  Kích hoạt
                </Button>
              ) : null}
              {e.status !== 'INACTIVE' && canDeactivate ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => onDeactivate(e.id)}>
                  Vô hiệu
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={employees} isLoading={isLoading} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {pagination.total === 0
            ? 'Không có bản ghi'
            : `Hiển thị ${from}–${to} trong ${pagination.total} · Trang ${pagination.page}/${totalPages}`}
        </span>
        <PaginationPrevNext
          page={pagination.page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  )
}
