import type { Role } from '@/types/auth'

export type EmployeeListStatus = 'active' | 'inactive' | 'probation' | 'reserved'

export interface EmployeeFilters {
  page: number
  pageSize: number
  role?: Role
  /** Loc nhieu role (query roles, cach nhau boi dau phay); uu tien hon role don. */
  roles?: string
  status?: EmployeeListStatus
  search?: string
  /** Lọc theo team (Quản lý — UUID team). */
  teamId?: string
}
