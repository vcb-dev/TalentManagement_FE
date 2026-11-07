import { describe, expect, it } from 'vitest'
import {
  groupedSidebarNavItems,
  isNavItemActive,
  MANAGER_OPS_ITEMS,
  mergeCompactHeaderNavItems,
  ROOM_BOOKING_ITEMS,
} from './navItems'
import { getDefaultPermissionIdsForRole } from '@/features/permissions/defaultPermissionIds'
import type { UserSession } from '@/types/auth'

describe('mergeCompactHeaderNavItems', () => {
  it('shows my learning classes for HR users', () => {
    const permissions = new Set(getDefaultPermissionIdsForRole('HR'))
    const items = mergeCompactHeaderNavItems((id) => permissions.has(id), 'HR')

    expect(items.some((item) => item.to === '/learning-classes')).toBe(true)
  })

  it('hides my classes and exam results for shared admin accounts only', () => {
    // Admin dùng chung = BOD + quyền HR; BOD thật vẫn thấy 2 mục này.
    const permissions = new Set([
      ...getDefaultPermissionIdsForRole('BOD'),
      ...getDefaultPermissionIdsForRole('HR'),
    ])
    const canId = (id: string) => permissions.has(id)
    const hiddenRoutes = ['/learning-classes', '/exam']

    const adminRoutes = [
      ...mergeCompactHeaderNavItems(canId, 'BOD', true),
      ...groupedSidebarNavItems(canId, {
        role: 'BOD',
        isAdminAccount: true,
      } as UserSession).flatMap((g) => g.items),
    ].map((item) => item.to)
    for (const to of hiddenRoutes) expect(adminRoutes).not.toContain(to)

    const bodRoutes = mergeCompactHeaderNavItems(canId, 'BOD').map((item) => item.to)
    for (const to of hiddenRoutes) expect(bodRoutes).toContain(to)
  })

  it('hides the learning path tab for every role but keeps the courses tab', () => {
    for (const role of ['MEMBER', 'LEADER', 'MANAGER', 'HR', 'BOD', 'TEACHER'] as const) {
      const permissions = new Set(getDefaultPermissionIdsForRole(role))
      const canId = (id: string) => permissions.has(id)
      const routes = [
        ...mergeCompactHeaderNavItems(canId, role),
        ...groupedSidebarNavItems(canId, { role } as UserSession).flatMap((g) => g.items),
      ].map((item) => item.to)

      expect(routes).not.toContain('/learning-path')
      expect(routes).toContain('/courses')
    }
  })

  it('shows monthly activities to every role and to shared admin accounts', () => {
    for (const role of ['MEMBER', 'LEADER', 'MANAGER', 'HR', 'BOD', 'TEACHER'] as const) {
      const permissions = new Set(getDefaultPermissionIdsForRole(role))
      const canId = (id: string) => permissions.has(id)
      const routes = [
        ...mergeCompactHeaderNavItems(canId, role),
        ...mergeCompactHeaderNavItems(canId, role, true),
        ...groupedSidebarNavItems(canId, { role } as UserSession).flatMap((g) => g.items),
      ].map((item) => item.to)

      expect(routes.filter((to) => to === '/activities')).toHaveLength(3)
    }
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
      const permissions = new Set(
        getDefaultPermissionIdsForRole(role as keyof typeof expectedRoutes)
      )
      const canId = (id: string) => permissions.has(id)
      const headerRoutes = mergeCompactHeaderNavItems(
        canId,
        role as keyof typeof expectedRoutes
      ).map((item) => item.to)
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

describe('isNavItemActive', () => {
  const classesItem = MANAGER_OPS_ITEMS.find((i) => i.to === '/manager/classes')!
  const roomDefault = ROOM_BOOKING_ITEMS[0]!
  const roomRequests = ROOM_BOOKING_ITEMS[1]!

  it('keeps a page highlighted when the page uses its own query (?tab=other)', () => {
    expect(isNavItemActive('/manager/classes', classesItem, { tab: 'other' })).toBe(true)
  })

  it('still separates items that share a route by search tab', () => {
    expect(isNavItemActive('/room-booking', roomDefault, { tab: 'requests' })).toBe(false)
    expect(isNavItemActive('/room-booking', roomRequests, { tab: 'requests' })).toBe(true)
    expect(isNavItemActive('/room-booking', roomDefault, {})).toBe(true)
  })
})
