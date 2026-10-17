import { redirect } from '@tanstack/react-router'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { defaultEntryPathFromSession, requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { useAuthStore } from '@/stores/auth.store'
import type { Role, UserSession } from '@/types/auth'

/** HR theo hợp đồng, hoặc tài khoản được gán quyền nhóm `hr.*` (RBAC động). */
export function requireHrAdmin() {
  requireRoleOrPermissionPrefixes(['HR'], ['hr.'])
}

const DIRECTORY_ROLES: Role[] = ['HR', 'BOD', 'MANAGER']

/** Khớp `EmployeeDirectoryGuard` ở BE. */
export function hasEmployeeDirectoryAccess(user: UserSession | null | undefined): boolean {
  if (!user) return false
  if (DIRECTORY_ROLES.includes(user.role)) return true
  const eff = resolveEffectivePermissionSet(user)
  return eff.has('hr.employees.view') || eff.has('manager.team.view')
}

export function requireEmployeeDirectoryAccess() {
  const user = useAuthStore.getState().user
  if (!user) throw redirect({ to: '/login' })
  if (hasEmployeeDirectoryAccess(user)) return
  throw redirect({ to: defaultEntryPathFromSession(user) })
}
