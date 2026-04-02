import type { Role } from './auth'

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'PROBATION' | 'RESERVED'

export type EmployeeLevel =
  | 'tap_su'
  | 'biet_viec'
  | 'duoc_viec'
  | 'dong_gop_ket_qua'
  | 'tuong'

/** Domain view — có thể map từ components['schemas'] sau codegen. */
export interface EmployeeListItem {
  id: string
  name: string
  email: string
  role: Role
  status: EmployeeStatus
  departmentId: string
  teamIds: string[]
  currentLevel: EmployeeLevel
  currentStar: number
  updatedAt: string
}
