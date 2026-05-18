import { describe, it, expect } from 'vitest'
import { getDefaultPermissionIdsForRole } from '../defaultPermissionIds'
import { ROLE_TEMPLATES } from '../roleTemplates'
import { PERMISSION_NODES } from '../catalog'

const ALL_PERMISSION_IDS = new Set(PERMISSION_NODES.map((n) => n.id))

describe('getDefaultPermissionIdsForRole — tính đúng quyền theo role', () => {
  it('MEMBER có dashboard.view và kpi.view', () => {
    const ids = getDefaultPermissionIdsForRole('MEMBER')
    expect(ids).toContain('dashboard.view')
    expect(ids).toContain('kpi.view')
  })

  it('MEMBER không có kpi.team_view, hr.org.manage', () => {
    const ids = getDefaultPermissionIdsForRole('MEMBER')
    expect(ids).not.toContain('kpi.team_view')
    expect(ids).not.toContain('hr.org.manage')
    expect(ids).not.toContain('admin.permissions.assign')
  })

  it('LEADER có kpi.team_view và kpi.team_edit', () => {
    const ids = getDefaultPermissionIdsForRole('LEADER')
    expect(ids).toContain('kpi.team_view')
    expect(ids).toContain('kpi.team_edit')
  })

  it('LEADER không có kpi.leader_review và admin.permissions.assign', () => {
    const ids = getDefaultPermissionIdsForRole('LEADER')
    expect(ids).not.toContain('kpi.leader_review')
    expect(ids).not.toContain('admin.permissions.assign')
  })

  it('MANAGER có kpi.leader_review, hr.org.manage, admin.permissions.assign', () => {
    const ids = getDefaultPermissionIdsForRole('MANAGER')
    expect(ids).toContain('kpi.leader_review')
    expect(ids).toContain('hr.org.manage')
    expect(ids).toContain('admin.permissions.assign')
  })

  it('HR có hr.employees.deactivate và reward.calculate', () => {
    const ids = getDefaultPermissionIdsForRole('HR')
    expect(ids).toContain('hr.employees.deactivate')
    expect(ids).toContain('reward.calculate')
  })

  it('HR không có kpi.team_edit', () => {
    const ids = getDefaultPermissionIdsForRole('HR')
    expect(ids).not.toContain('kpi.team_edit')
    expect(ids).not.toContain('admin.permissions.assign')
  })

  it('role không tồn tại trả mảng rỗng', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = getDefaultPermissionIdsForRole('UNKNOWN_ROLE' as any)
    expect(ids).toEqual([])
  })

  it('tất cả permission id trả về phải tồn tại trong catalog', () => {
    for (const template of ROLE_TEMPLATES) {
      const ids = getDefaultPermissionIdsForRole(template.linkedRole)
      for (const id of ids) {
        expect(ALL_PERMISSION_IDS.has(id), `"${id}" không tồn tại trong catalog`).toBe(true)
      }
    }
  })

  it('trả mảng (không rỗng) cho mọi role có trong ROLE_TEMPLATES', () => {
    for (const template of ROLE_TEMPLATES) {
      const ids = getDefaultPermissionIdsForRole(template.linkedRole)
      expect(ids.length, `template ${template.id} trả mảng rỗng`).toBeGreaterThan(0)
    }
  })
})

describe('ROLE_TEMPLATES — tính toàn vẹn dữ liệu', () => {
  it('mỗi template có permissionIds không rỗng', () => {
    for (const t of ROLE_TEMPLATES) {
      expect(t.permissionIds.length, `template ${t.id} trống`).toBeGreaterThan(0)
    }
  })

  it('mọi permissionId trong template tồn tại trong catalog', () => {
    for (const t of ROLE_TEMPLATES) {
      for (const id of t.permissionIds) {
        expect(
          ALL_PERMISSION_IDS.has(id),
          `"${id}" trong template ${t.id} không có trong catalog`
        ).toBe(true)
      }
    }
  })

  it('không có template nào bị trùng linkedRole', () => {
    const roles = ROLE_TEMPLATES.map((t) => t.linkedRole)
    const unique = new Set(roles)
    expect(unique.size).toBe(roles.length)
  })

  it('có template cho MEMBER, LEADER, MANAGER, HR', () => {
    const roles = new Set(ROLE_TEMPLATES.map((t) => t.linkedRole))
    expect(roles.has('MEMBER')).toBe(true)
    expect(roles.has('LEADER')).toBe(true)
    expect(roles.has('MANAGER')).toBe(true)
    expect(roles.has('HR')).toBe(true)
  })
})
