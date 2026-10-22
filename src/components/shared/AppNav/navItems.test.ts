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
