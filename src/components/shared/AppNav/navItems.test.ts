import { describe, expect, it } from 'vitest'
import { mergeCompactHeaderNavItems } from './navItems'
import { getDefaultPermissionIdsForRole } from '@/features/permissions/defaultPermissionIds'

describe('mergeCompactHeaderNavItems', () => {
  it('shows my learning classes for HR users', () => {
    const permissions = new Set(getDefaultPermissionIdsForRole('HR'))
    const items = mergeCompactHeaderNavItems((id) => permissions.has(id), 'HR')

    expect(items.some((item) => item.to === '/learning-classes')).toBe(true)
  })

  it('shows team KPI and monthly report entries for managers', () => {
    const permissions = new Set(getDefaultPermissionIdsForRole('MANAGER'))
    const items = mergeCompactHeaderNavItems((id) => permissions.has(id), 'MANAGER')

    expect(items.some((item) => item.to === '/leader/kpi-okr')).toBe(true)
    expect(items.some((item) => item.to === '/monthly-report')).toBe(true)
  })
})
