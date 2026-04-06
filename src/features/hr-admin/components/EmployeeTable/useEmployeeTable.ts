import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDeactivateEmployee, useEmployees } from '@/features/hr-admin/hooks'
import type { EmployeeFilters } from '@/features/hr-admin/types'

const defaultFilters: EmployeeFilters = { page: 1, pageSize: 20 }

export type UseEmployeeTableOptions = {
  /** Điều hướng Xem/Sửa tới màn Quản lý (team) thay vì HR. */
  managerScope?: boolean
  /** Điều hướng tới màn Leader (`/leader/team/...`). */
  leaderScope?: boolean
}

export function useEmployeeTable(initial?: Partial<EmployeeFilters>, options?: UseEmployeeTableOptions) {
  const managerScope = options?.managerScope === true
  const leaderScope = options?.leaderScope === true
  const [filters, setFilters] = useState<EmployeeFilters>({ ...defaultFilters, ...initial })
  const { data, isLoading } = useEmployees(filters)
  const deactivate = useDeactivateEmployee()
  const navigate = useNavigate()

  const handleDeactivate = (id: string) => {
    deactivate.mutate(id)
  }

  const teamSearch = filters.teamId ? { teamId: filters.teamId } : {}

  const toTeamEmployee = (id: string) =>
    leaderScope
      ? ({
          to: '/leader/team/$employeeId',
          params: { employeeId: id },
          search: teamSearch,
        } as const)
      : ({
          to: '/manager/team/$employeeId',
          params: { employeeId: id },
          search: teamSearch,
        } as const)

  return {
    employees: data?.data ?? [],
    isLoading,
    pagination: { page: filters.page, pageSize: filters.pageSize, total: data?.total ?? 0 },
    onView: (id: string) =>
      void navigate(
        managerScope || leaderScope ? toTeamEmployee(id) : { to: '/hr-admin/$employeeId', params: { employeeId: id } }
      ),
    onEdit: (id: string) =>
      void navigate(
        managerScope || leaderScope
          ? toTeamEmployee(id)
          : {
              to: '/hr-admin/$employeeId',
              params: { employeeId: id },
              search: { mode: 'edit' },
            }
      ),
    onDeactivate: handleDeactivate,
    onPageChange: (page: number) => setFilters((f) => ({ ...f, page })),
    filters,
    setFilters,
  }
}
