import type { EmployeeFilters } from '@/features/hr-admin/types'
import { employeeKeys } from '@/features/hr-admin/queryKeys'

/**
 * Dùng chung `employeeKeys` với HR để cache GET /employees khớp khi chuyển trang.
 */
export const permissionsEmployeeKeys = {
  list: (filters: EmployeeFilters) => employeeKeys.list(filters),
  detail: (id: string) => employeeKeys.detail(id),
}
