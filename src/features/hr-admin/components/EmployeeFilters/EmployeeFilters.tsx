import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { Role } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { InputController, SelectController } from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
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
    <Form {...filtersForm}>
      <form className="flex flex-wrap items-end gap-2" onSubmit={applyFilters}>
        <InputController
          control={filtersForm.control}
          name="search"
          label="Tìm kiếm"
          labelClassName="text-xs font-normal text-muted-foreground"
          className="min-w-[200px] space-y-1"
          placeholder="Tên, email…"
        />
        <SelectController
          control={filtersForm.control}
          name="role"
          label="Vai trò"
          labelClassName="text-xs font-normal text-muted-foreground"
          className="min-w-[140px] space-y-1"
          triggerClassName="h-9 rounded-md"
        >
          <SelectItem value="__none">Tất cả</SelectItem>
          {roles.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectController>
        <SelectController
          control={filtersForm.control}
          name="status"
          label="Trạng thái"
          labelClassName="text-xs font-normal text-muted-foreground"
          className="min-w-[160px] space-y-1"
          triggerClassName="h-9 rounded-md"
        >
          <SelectItem value="__none">Tất cả</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectController>
        <Button type="submit">Áp dụng</Button>
      </form>
    </Form>
  )
}
