import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
  const filtersForm = useForm<{
    search: string
    role: Role | ''
    status: EmployeeListStatus | ''
  }>({
    defaultValues: {
      search,
      role: role ?? '',
      status: status ?? '',
    },
  })

  useEffect(() => {
    filtersForm.reset({
      search,
      role: role ?? '',
      status: status ?? '',
    })
  }, [search, role, status, filtersForm])

  const applyFilters = filtersForm.handleSubmit((values) => {
    onSearchChange(values.search)
    onRoleChange((values.role || undefined) as Role | undefined)
    onStatusChange((values.status || undefined) as EmployeeListStatus | undefined)
    onApply()
  })

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={applyFilters}>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Tìm kiếm</span>
        <Input {...filtersForm.register('search')} placeholder="Tên, email…" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Vai trò</span>
        <select
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          {...filtersForm.register('role')}
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
          {...filtersForm.register('status')}
        >
          <option value="">Tất cả</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit">Áp dụng</Button>
    </form>
  )
}
