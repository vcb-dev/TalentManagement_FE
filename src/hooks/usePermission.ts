import { useCallback } from 'react'
import type { Action, Permission, Resource, Role, UserSession } from '@/types/auth'
import { useAuthStore } from '@/stores/auth.store'

/**
 * TODO: REMOVE — temp fallback until /auth/me returns permissions.
 * Xóa toàn bộ block fallback này trước khi production.
 */
function getTempDevPermissionsForRole(role: Role | undefined): Permission[] {
  if (!role) return []
  const allEmployee: Permission[] = [
    { action: 'view', resource: 'employee' },
    { action: 'create', resource: 'employee' },
    { action: 'edit', resource: 'employee' },
    { action: 'deactivate', resource: 'employee' },
  ]
  const matrix: Record<Role, Permission[]> = {
    MEMBER: [
      { action: 'view', resource: 'employee' },
      { action: 'view', resource: 'checklist' },
      { action: 'view', resource: 'exam' },
      { action: 'view', resource: 'kpi' },
      { action: 'view', resource: 'okr' },
      { action: 'view', resource: 'monthly_report' },
    ],
    LEADER: [
      { action: 'view', resource: 'employee' },
      { action: 'view', resource: 'team' },
      { action: 'create', resource: 'kpi' },
      { action: 'edit', resource: 'kpi' },
      { action: 'view', resource: 'kpi' },
      { action: 'create', resource: 'okr' },
      { action: 'edit', resource: 'okr' },
      { action: 'view', resource: 'okr' },
      { action: 'create', resource: 'monthly_report' },
      { action: 'edit', resource: 'monthly_report' },
      { action: 'view', resource: 'monthly_report' },
    ],
    MANAGER: [
      ...allEmployee,
      { action: 'view', resource: 'team' },
      { action: 'approve', resource: 'promotion' },
      { action: 'view', resource: 'kpi' },
      { action: 'classify', resource: 'exam' },
    ],
    HR_ADMIN: [
      ...allEmployee,
      { action: 'view', resource: 'department' },
      { action: 'grade', resource: 'exam' },
    ],
    TEACHER: [
      { action: 'view', resource: 'employee' },
      { action: 'view', resource: 'exam' },
      { action: 'grade', resource: 'exam' },
    ],
    BOD: [
      { action: 'view', resource: 'employee' },
      { action: 'view', resource: 'radar_chart' },
      { action: 'view', resource: 'department' },
    ],
  }
  return matrix[role] ?? []
}

function resolvePermissions(user: UserSession): Permission[] {
  if (import.meta.env.DEV && user.permissions.length === 0) {
    return getTempDevPermissionsForRole(user.role)
  }
  return user.permissions
}

export function usePermission() {
  const user = useAuthStore((s) => s.user)

  const can = useCallback(
    (action: Action, resource: Resource): boolean => {
      if (!user) return false
      const effective = resolvePermissions(user)
      return effective.some((p) => p.action === action && p.resource === resource)
    },
    [user]
  )

  return { can, role: user?.role }
}
