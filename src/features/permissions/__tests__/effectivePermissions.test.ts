import { describe, it, expect } from 'vitest'
import { applyMandatoryViewRules, mergePermissionIds } from '../effectivePermissions'
import { resolveEffectivePermissionSet } from '../resolveEffective'
import type { UserSession } from '@/types/auth'

function makeUser(overrides: Partial<UserSession>): UserSession {
  return {
    id: 'test-id',
    name: 'Test User',
    email: 'test@test.com',
    role: 'MEMBER',
    roles: ['MEMBER'],
    permissions: [],
    permissionIds: [],
    departmentId: 'dept-1',
    teamIds: [],
    staffLevel: 'PROBATION',
    ...overrides,
  }
}

describe('applyMandatoryViewRules', () => {
  it('trả set không rỗng khi đầu vào có ít nhất 1 permission', () => {
    const result = applyMandatoryViewRules(new Set(['dashboard.view']))
    expect(result.size).toBeGreaterThan(0)
  })

  it('không thay đổi set rỗng', () => {
    const result = applyMandatoryViewRules(new Set())
    expect(result.size).toBe(0)
  })

  it('giữ nguyên dashboard.view khi đã có', () => {
    const result = applyMandatoryViewRules(new Set(['dashboard.view']))
    expect(result.has('dashboard.view')).toBe(true)
  })

  it('giữ nguyên tất cả quyền đầu vào', () => {
    const input = new Set(['kpi.view', 'kpi.team_view', 'kpi.team_edit'])
    const result = applyMandatoryViewRules(input)
    for (const id of input) {
      expect(result.has(id)).toBe(true)
    }
  })
})

describe('mergePermissionIds', () => {
  it('gộp array thành Set', () => {
    const result = mergePermissionIds(['a', 'b', 'c'])
    expect(result.has('a')).toBe(true)
    expect(result.has('b')).toBe(true)
    expect(result.has('c')).toBe(true)
  })

  it('loại bỏ trùng lặp', () => {
    const result = mergePermissionIds(['a', 'a', 'b'])
    expect(result.size).toBe(2)
  })
})

describe('resolveEffectivePermissionSet', () => {
  it('trả Set rỗng khi user null', () => {
    expect(resolveEffectivePermissionSet(null).size).toBe(0)
  })

  it('trả Set rỗng khi user undefined', () => {
    expect(resolveEffectivePermissionSet(undefined).size).toBe(0)
  })

  it('MEMBER session có dashboard.view', () => {
    const user = makeUser({ role: 'MEMBER' })
    const perms = resolveEffectivePermissionSet(user)
    expect(perms.has('dashboard.view')).toBe(true)
  })

  it('MEMBER session không có kpi.team_view', () => {
    const user = makeUser({ role: 'MEMBER' })
    const perms = resolveEffectivePermissionSet(user)
    expect(perms.has('kpi.team_view')).toBe(false)
  })

  it('LEADER session có kpi.team_edit', () => {
    const user = makeUser({ role: 'LEADER' })
    const perms = resolveEffectivePermissionSet(user)
    expect(perms.has('kpi.team_edit')).toBe(true)
  })

  it('MANAGER session có hr.org.manage', () => {
    const user = makeUser({ role: 'MANAGER' })
    const perms = resolveEffectivePermissionSet(user)
    expect(perms.has('hr.org.manage')).toBe(true)
  })

  it('permissionIds tường minh được áp dụng thay template', () => {
    const user = makeUser({
      role: 'MEMBER',
      permissionIds: ['kpi.team_view', 'kpi.team_edit'],
    })
    const perms = resolveEffectivePermissionSet(user)
    expect(perms.has('kpi.team_view')).toBe(true)
    expect(perms.has('kpi.team_edit')).toBe(true)
  })

  it('permissionIds API hợp nhất với template role (không mất quyền mặc định)', () => {
    const user = makeUser({
      role: 'MEMBER',
      permissionIds: ['kpi.team_view'],
    })
    const perms = resolveEffectivePermissionSet(user)
    // kpi.view là default MEMBER — vẫn phải có khi có permissionIds
    expect(perms.has('kpi.view')).toBe(true)
  })
})
