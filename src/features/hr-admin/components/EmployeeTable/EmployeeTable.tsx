import type { EmployeeEntity } from '@/features/hr-admin/api'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { employeePortraitUrl } from '@/features/hr-admin/components/HrEmployeeList/employeeListUtils'
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
          <EmployeeAvatar name={e.name} photoUrl={employeePortraitUrl(e.avatarUrl)} />
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
    <div className="min-w-0 space-y-3">
      <div className="rounded-lg border border-border/70 bg-card/40 shadow-sm">
        <DataTable
          columns={columns}
          data={employees}
          isLoading={isLoading}
          getRowKey={(e) => e.id}
          renderMobileRow={(e) => (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <EmployeeAvatar name={e.name} photoUrl={employeePortraitUrl(e.avatarUrl)} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{e.name}</p>
                  <p className="mt-0.5 break-all text-xs text-muted-foreground">{e.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <RoleBadge role={e.role} />
                <StatusBadge status={e.status as EmployeeStatus} />
              </div>
              <p className="text-xs text-muted-foreground">Cập nhật: {formatViDate(e.updatedAt)}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full sm:w-auto"
                  onClick={() => onView(e.id)}
                >
                  Xem
                </Button>
                {listMode === 'hr' ? (
                  <>
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-full sm:w-auto"
                        onClick={() => onEdit(e.id)}
                      >
                        Sửa
                      </Button>
                    ) : null}
                    {e.status === 'INACTIVE' && onReactivate && canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-full sm:w-auto"
                        onClick={() => onReactivate(e.id)}
                      >
                        Kích hoạt
                      </Button>
                    ) : null}
                    {e.status !== 'INACTIVE' && canDeactivate ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-full text-destructive hover:bg-destructive/10 sm:w-auto"
                        onClick={() => onDeactivate(e.id)}
                      >
                        Vô hiệu
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          )}
        />
      </div>
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
