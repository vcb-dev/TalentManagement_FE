import type { Role } from '@/types/auth'

export type EmployeeListStatus = 'active' | 'inactive' | 'probation' | 'reserved'

export interface EmployeeFilters {
  page: number
  pageSize: number
  role?: Role
  status?: EmployeeListStatus
  search?: string
}
