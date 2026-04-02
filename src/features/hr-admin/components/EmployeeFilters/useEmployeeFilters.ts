import { useState } from 'react'
import type { Role } from '@/types/auth'
import type { EmployeeFilters as EmployeeFiltersModel, EmployeeListStatus } from '@/features/hr-admin/types'

export function useEmployeeFilters(onChange: (next: Partial<EmployeeFiltersModel>) => void) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role | undefined>()
  const [status, setStatus] = useState<EmployeeListStatus | undefined>()

  const apply = () => {
    onChange({ search: search || undefined, role, status, page: 1 })
  }

  return {
    search,
    role,
    status,
    onSearchChange: setSearch,
    onRoleChange: setRole,
    onStatusChange: setStatus,
    onApply: apply,
  }
}
