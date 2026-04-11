import { useCallback, useMemo, useState, type SetStateAction } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDeactivateEmployee, useEmployees, useUpdateEmployee } from '@/features/hr-admin/hooks'
import type { EmployeeFilters } from '@/features/hr-admin/types'

const defaultFilters: EmployeeFilters = { page: 1, pageSize: 15 }

/**
 * Bộ lọc từ URL (search params) luôn lấy từ `initial`; chỉ `search` giữ trong state nội bộ
 * vì không nằm trên URL. Tránh `useEffect` + setState (eslint react-hooks/set-state-in-effect).
 */
export function useEmployeeTable(initial?: Partial<EmployeeFilters>) {
  const fromUrl = useMemo(
    () => ({
      page: initial?.page ?? defaultFilters.page,
      pageSize: initial?.pageSize ?? defaultFilters.pageSize,
      role: initial?.role,
      status: initial?.status,
      teamId: initial?.teamId,
    }),
    [initial?.page, initial?.pageSize, initial?.role, initial?.status, initial?.teamId]
  )

  const [search, setSearch] = useState<string | undefined>(undefined)

  const filters = useMemo(
    (): EmployeeFilters => ({
      ...defaultFilters,
      ...fromUrl,
      search,
    }),
    [fromUrl, search]
  )

  const setFilters = useCallback(
    (updater: SetStateAction<EmployeeFilters>) => {
      setSearch((prevSearch) => {
        const current: EmployeeFilters = {
          ...defaultFilters,
          ...fromUrl,
          search: prevSearch,
        }
        const next = typeof updater === 'function' ? updater(current) : updater
        return next.search
      })
    },
    [fromUrl]
  )

  const { data, isLoading } = useEmployees(filters)
  const deactivate = useDeactivateEmployee()
  const update = useUpdateEmployee()
  const navigate = useNavigate()

  const handleDeactivate = (id: string) => {
    if (!window.confirm('Vô hiệu hóa tài khoản nhân viên này?')) return
    deactivate.mutate(id)
  }

  const handleReactivate = (id: string) => {
    if (!window.confirm('Kích hoạt lại tài khoản nhân viên này?')) return
    update.mutate({ id, patch: { status: 'ACTIVE' } })
  }

  const total = data?.total ?? 0
  const pageSize = Math.max(1, filters.pageSize)
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(total / pageSize))

  return {
    employees: data?.data ?? [],
    isLoading,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages,
    },
    onView: (id: string) =>
      void navigate({ to: '/hr-admin/$employeeId', params: { employeeId: id } }),
    onEdit: (id: string) =>
      void navigate({
        to: '/hr-admin/$employeeId',
        params: { employeeId: id },
        search: { mode: 'edit' },
      }),
    onDeactivate: handleDeactivate,
    onReactivate: handleReactivate,
    filters,
    setFilters,
  }
}
