import type { Role } from '@/types/auth'
import { ME_USER_PATCH_KEYS } from '../profile/userSelf.types'
import type { EmployeeCardStatusFilter } from './employeeCard'

export type EmployeeListStatus = 'active' | 'inactive' | 'probation' | 'reserved' | 'transferred'

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
  startMonth?: number
  startYear?: number
  leaveMonth?: number
  leaveYear?: number
  birthMonth?: number
  cardStatus?: EmployeeCardStatusFilter
  /** UUID màu thẻ hoặc `'none'` = chưa có màu. */
  cardColorId?: string
}

export type EditEmployeeBody = Partial<Record<EmployeePatchKey, string | null>> & {
  extraTeamIds?: string[]
}

export const EMPLOYEE_PATCH_KEYS = [
  ...ME_USER_PATCH_KEYS,
  'startDateWork',
  'employeeCodePrimary',
  'employeeIdentifier',
  'leaveDateWork',
  'employeeCardStatus',
  'employeeCardColorId',
  'teamLeaderUserId',
] as const

export type EmployeePatchKey = (typeof EMPLOYEE_PATCH_KEYS)[number]
