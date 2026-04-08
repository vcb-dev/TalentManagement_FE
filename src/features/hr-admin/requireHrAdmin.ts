import { redirect } from '@tanstack/react-router'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { defaultEntryPathFromSession, requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/auth'

/** HR theo hợp đồng, hoặc tài khoản được gán quyền nhóm `hr.*` (RBAC động). */
export function requireHrAdmin() {
  requireRoleOrPermissionPrefixes(['HR'], ['hr.'])
}

const DIRECTORY_ROLES: Role[] = ['HR', 'BOD', 'MANAGER', 'LEADER']

/**
 * Danh sách + chi tiết nhân sự dùng chung (`/hr-admin`) — HR / BOD / Quản lý / Trưởng nhóm theo role
 * hoặc quyền xem danh bạ (`hr.employees.view`, `manager.team.view`, nhóm KPI team).
 */
export function requireEmployeeDirectoryAccess() {
  const user = useAuthStore.getState().user
  if (!user) throw redirect({ to: '/login' })
  if (DIRECTORY_ROLES.includes(user.role)) return
  const eff = resolveEffectivePermissionSet(user)
  if (eff.has('hr.employees.view')) return
  if (eff.has('manager.team.view')) return
  if ([...eff].some((id) => id.startsWith('kpi.team_'))) return
  throw redirect({ to: defaultEntryPathFromSession(user) })
}
