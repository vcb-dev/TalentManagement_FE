import { employeeApi } from '@/features/hr-admin/api'
import type { EmployeeFilters } from '@/features/hr-admin/types'

/**
 * Danh sách & chi tiết nhân sự cho màn **Phân quyền nhân viên**.
 *
 * Backend NestJS: `EmployeesController` — `GET /employees`, `GET /employees/:id`
 * (JWT + `EmployeeDirectoryGuard` / `assertEmployeeDirectoryAccess`).
 *
 * Khi `VITE_USE_MOCK_API=true`, vẫn dùng mock như `employeeApi`.
 */
export const permissionsEmployeeDirectoryApi = {
  list: (filters: EmployeeFilters) => employeeApi.getAll(filters),
  getById: (id: string) => employeeApi.getById(id),
}

export type { EmployeeEntity } from '@/features/hr-admin/api'
