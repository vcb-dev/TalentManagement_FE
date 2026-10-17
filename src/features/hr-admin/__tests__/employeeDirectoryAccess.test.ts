import { describe, expect, it } from 'vitest'
import type { Role, UserSession } from '@/types/auth'
import { hasEmployeeDirectoryAccess } from '../requireHrAdmin'

function makeUser(role: Role, permissionIds: string[] = []): UserSession {
  return {
    id: 'u1',
    name: 'Test',
    email: 'test@gmail.com',
    role,
    roles: [role],
    permissions: [],
    permissionIds,
    departmentId: 'dept-1',
    teamIds: [],
    staffLevel: 'PROBATION',
  }
}

/** Tab "Dự án" ở /hr-admin/org chỉ hiện khi khớp `EmployeeDirectoryGuard` ở BE. */
describe('hasEmployeeDirectoryAccess', () => {
  it('chưa đăng nhập → không có quyền', () => {
    expect(hasEmployeeDirectoryAccess(null)).toBe(false)
    expect(hasEmployeeDirectoryAccess(undefined)).toBe(false)
  })

  it('HR / BOD / Quản lý → có quyền theo vai trò', () => {
    for (const role of ['HR', 'BOD', 'MANAGER'] as const) {
      expect(hasEmployeeDirectoryAccess(makeUser(role))).toBe(true)
    }
  })

  it('nhân viên / trưởng nhóm / giáo viên không được gán thêm quyền → không có quyền', () => {
    for (const role of ['MEMBER', 'LEADER', 'TEACHER'] as const) {
      expect(hasEmployeeDirectoryAccess(makeUser(role))).toBe(false)
    }
  })

  it('được gán hr.employees.view hoặc manager.team.view → có quyền', () => {
    expect(hasEmployeeDirectoryAccess(makeUser('MEMBER', ['hr.employees.view']))).toBe(true)
    expect(hasEmployeeDirectoryAccess(makeUser('LEADER', ['manager.team.view']))).toBe(true)
  })
})
