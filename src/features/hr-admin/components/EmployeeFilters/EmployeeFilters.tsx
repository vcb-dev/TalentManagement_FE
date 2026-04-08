import type { Role } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EmployeeListStatus } from '@/features/hr-admin/types'

export interface EmployeeFiltersProps {
  search: string
  role?: Role
  status?: EmployeeListStatus
  onSearchChange: (v: string) => void
  onRoleChange: (v: Role | undefined) => void
  onStatusChange: (v: EmployeeListStatus | undefined) => void
  onApply: () => void
}

const roles: Role[] = ['MEMBER', 'LEADER', 'MANAGER', 'HR', 'TEACHER', 'BOD']
const statuses: EmployeeListStatus[] = ['active', 'inactive', 'probation', 'reserved']

export function EmployeeFilters({
  search,
  role,
  status,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onApply,
}: EmployeeFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Tìm kiếm</span>
        <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Tên, email…" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Vai trò</span>
        <select
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          value={role ?? ''}
          onChange={(e) => onRoleChange((e.target.value || undefined) as Role | undefined)}
        >
          <option value="">Tất cả</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Trạng thái</span>
        <select
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          value={status ?? ''}
          onChange={(e) =>
            onStatusChange((e.target.value || undefined) as EmployeeListStatus | undefined)
          }
        >
          <option value="">Tất cả</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" onClick={onApply}>
        Áp dụng
      </Button>
    </div>
  )
}
