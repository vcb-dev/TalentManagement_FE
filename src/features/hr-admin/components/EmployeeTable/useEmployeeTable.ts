import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDeactivateEmployee, useEmployees } from '@/features/hr-admin/hooks'
import type { EmployeeFilters } from '@/features/hr-admin/types'

const defaultFilters: EmployeeFilters = { page: 1, pageSize: 20 }

export function useEmployeeTable(initial?: Partial<EmployeeFilters>) {
  const [filters, setFilters] = useState<EmployeeFilters>({ ...defaultFilters, ...initial })
  const { data, isLoading } = useEmployees(filters)
  const deactivate = useDeactivateEmployee()
  const navigate = useNavigate()

  const handleDeactivate = (id: string) => {
    deactivate.mutate(id)
  }

  return {
    employees: data?.data ?? [],
    isLoading,
    pagination: { page: filters.page, pageSize: filters.pageSize, total: data?.total ?? 0 },
    onView: (id: string) =>
      void navigate({ to: '/hr-admin/$employeeId', params: { employeeId: id } }),
    onEdit: (id: string) =>
      void navigate({
        to: '/hr-admin/$employeeId',
        params: { employeeId: id },
        search: { mode: 'edit' },
      }),
    onDeactivate: handleDeactivate,
    onPageChange: (page: number) => setFilters((f) => ({ ...f, page })),
    filters,
    setFilters,
  }
}
