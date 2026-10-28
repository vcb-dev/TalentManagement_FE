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

  it('hides KPI/OKR and monthly report entries while those features are disabled', () => {
    const hiddenRoutes = [
      '/leader/kpi-okr',
      '/manager/kpi-okr',
      '/leader/vinh-danh',
      '/leader/kpi-approval',
      '/kpi-okr-compliance',
      '/hr-admin/settings/kpi-windows',
      '/monthly-report',
    ]
    for (const role of ['MEMBER', 'MANAGER', 'LEADER', 'HR', 'BOD'] as const) {
      const permissions = new Set(getDefaultPermissionIdsForRole(role))
      const canId = (id: string) => permissions.has(id)
      const headerItems = mergeCompactHeaderNavItems(canId, role)
      const sidebarItems = groupedSidebarNavItems(canId, { role } as UserSession).flatMap(
        (g) => g.items
      )

      for (const item of [...headerItems, ...sidebarItems]) {
        expect(hiddenRoutes).not.toContain(item.to)
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
