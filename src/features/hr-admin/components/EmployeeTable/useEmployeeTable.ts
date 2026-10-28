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
      startMonth: initial?.startMonth,
      startYear: initial?.startYear,
      leaveMonth: initial?.leaveMonth,
      leaveYear: initial?.leaveYear,
      birthMonth: initial?.birthMonth,
      cardStatus: initial?.cardStatus,
      cardColorId: initial?.cardColorId,
    }),
    [
      initial?.page,
      initial?.pageSize,
      initial?.role,
      initial?.status,
      initial?.teamId,
      initial?.startMonth,
      initial?.startYear,
      initial?.leaveMonth,
      initial?.leaveYear,
      initial?.birthMonth,
      initial?.cardStatus,
      initial?.cardColorId,
    ]
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

  const [confirmPending, setConfirmPending] = useState<{
    type: 'deactivate' | 'reactivate'
    id: string
  } | null>(null)

  const { data, isLoading, isFetching, isPlaceholderData } = useEmployees(filters)
  const deactivate = useDeactivateEmployee()
  const update = useUpdateEmployee()
  const navigate = useNavigate()

  const handleConfirmPending = () => {
    if (!confirmPending) return
    if (confirmPending.type === 'deactivate') {
      deactivate.mutate(confirmPending.id)
    } else {
      update.mutate({ id: confirmPending.id, patch: { status: 'ACTIVE' } })
    }
    setConfirmPending(null)
  }

  const total = data?.total ?? 0
  const pageSize = Math.max(1, filters.pageSize)
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(total / pageSize))

  return {
    employees: data?.data ?? [],
    isLoading,
    /** Đang tải trang mới (kể cả khi vẫn hiển thị data cũ) — dùng để khoá pagination/bộ lọc. */
    isFetching,
    /** false khi đang hiện dữ liệu giữ chỗ của query trước. */
    isPageResolved: data !== undefined && !isPlaceholderData,
    pagination: {
      // Dùng trang BE đã kẹp thay vì page vượt giới hạn trên URL.
      page: isPlaceholderData ? filters.page : (data?.page ?? filters.page),
      pageSize: isPlaceholderData ? filters.pageSize : (data?.pageSize ?? filters.pageSize),
      total,
      totalPages,
      statusCounts: data?.statusCounts,
    },
    onView: (id: string) =>
      void navigate({ to: '/hr-admin/$employeeId', params: { employeeId: id } }),
    onEdit: (id: string) =>
      void navigate({
        to: '/hr-admin/$employeeId',
        params: { employeeId: id },
        search: { mode: 'edit' },
      }),
    onDeactivate: (id: string) => setConfirmPending({ type: 'deactivate', id }),
    onReactivate: (id: string) => setConfirmPending({ type: 'reactivate', id }),
    confirmPending,
    onConfirmPending: handleConfirmPending,
    onCancelPending: () => setConfirmPending(null),
    filters,
    setFilters,
  }
}
