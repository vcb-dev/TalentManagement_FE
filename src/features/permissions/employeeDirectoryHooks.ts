import { useQuery } from '@tanstack/react-query'
import type { EmployeeFilters } from '@/features/hr-admin/types'
import { permissionsEmployeeDirectoryApi } from './permissionsEmployeeDirectoryApi'
import { permissionsEmployeeKeys } from './queryKeys'

/**
 * Danh sách nhân sự trên màn Phân quyền — gọi `GET /employees` (hoặc mock).
 */
export function usePermissionsEmployeeList(filters: EmployeeFilters) {
  return useQuery({
    queryKey: permissionsEmployeeKeys.list(filters),
    queryFn: () => permissionsEmployeeDirectoryApi.list(filters),
  })
}

/**
 * Chi tiết một nhân viên (màn chỉnh quyền) — `GET /employees/:id`.
 */
export function usePermissionsEmployee(id: string) {
  return useQuery({
    queryKey: permissionsEmployeeKeys.detail(id),
    queryFn: () => permissionsEmployeeDirectoryApi.getById(id),
    enabled: id.length > 0,
  })
}
