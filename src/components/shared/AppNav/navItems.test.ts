import { describe, expect, it } from 'vitest'
import { groupedSidebarNavItems, mergeCompactHeaderNavItems } from './navItems'
import { getDefaultPermissionIdsForRole } from '@/features/permissions/defaultPermissionIds'
import type { UserSession } from '@/types/auth'

describe('mergeCompactHeaderNavItems', () => {
  it('shows my learning classes for HR users', () => {
    const permissions = new Set(getDefaultPermissionIdsForRole('HR'))
    const items = mergeCompactHeaderNavItems((id) => permissions.has(id), 'HR')

    expect(items.some((item) => item.to === '/learning-classes')).toBe(true)
  })

  it('shows KPI/OKR and monthly report entries to the roles that own them', () => {
    const expectedRoutes = {
      MEMBER: ['/monthly-report'],
      LEADER: ['/leader/kpi-okr', '/monthly-report'],
      MANAGER: [
        '/manager/kpi-okr',
        '/leader/vinh-danh',
        '/leader/kpi-approval',
        '/monthly-report',
        '/kpi-okr-compliance',
        '/hr-admin/settings/kpi-windows',
      ],
      HR: ['/monthly-report', '/kpi-okr-compliance', '/hr-admin/settings/kpi-windows'],
    } as const
    for (const [role, routes] of Object.entries(expectedRoutes)) {
      const permissions = new Set(getDefaultPermissionIdsForRole(role as keyof typeof expectedRoutes))
      const canId = (id: string) => permissions.has(id)
      const headerRoutes = mergeCompactHeaderNavItems(canId, role as keyof typeof expectedRoutes).map(
        (item) => item.to
      )
      const sidebarRoutes = groupedSidebarNavItems(canId, { role } as UserSession)
        .flatMap((g) => g.items)
        .map((item) => item.to)

      for (const to of routes) {
        expect(headerRoutes).toContain(to)
        expect(sidebarRoutes).toContain(to)
      }
    }
  })
})
