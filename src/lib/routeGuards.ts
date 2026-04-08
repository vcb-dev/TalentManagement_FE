import { redirect } from '@tanstack/react-router'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { useAuthStore } from '@/stores/auth.store'
import type { Role, UserSession } from '@/types/auth'

/** Trang mặc định sau đăng nhập / khi không đủ quyền (bám luồng nghiệp vụ VCB HRM). */
export function defaultPathForRole(role: Role | undefined): string {
  if (!role) return '/login'
  switch (role) {
    case 'HR':
      return '/hr-admin'
    case 'BOD':
      return '/bod/dashboard'
    case 'MANAGER':
      return '/hr-admin'
    case 'LEADER':
      return '/dashboard'
    case 'TEACHER':
      return '/teacher/classes'
    case 'MEMBER':
    default:
      return '/dashboard'
  }
}

/**
 * Trang vào đầu tiên khi đã có session — ưu tiên quyền catalog (RBAC động)
 * khi `role` vẫn là MEMBER nhưng đã gán thêm template / quyền tay.
 */
export function defaultEntryPathFromSession(user: UserSession | null | undefined): string {
  if (!user) return '/login'
  const eff = resolveEffectivePermissionSet(user)
  const hasPrefix = (prefix: string) => [...eff].some((id) => id.startsWith(prefix))

  if (hasPrefix('bod.')) return '/bod/dashboard'
  if (eff.has('hr.employees.view') || eff.has('manager.team.view') || hasPrefix('hr.')) {
    return '/hr-admin'
  }
  if (eff.has('teacher.classes.view') || eff.has('teacher.grade')) return '/teacher/classes'
  if (hasPrefix('kpi.team_')) return '/leader/kpi-okr'
  if (hasPrefix('manager.')) return '/manager/classes'
  return defaultPathForRole(user.role)
}

export function requireRole(...allowed: Role[]) {
  const user = useAuthStore.getState().user
  if (!user?.role) throw redirect({ to: '/login' })
  if (!allowed.includes(user.role)) throw redirect({ to: defaultEntryPathFromSession(user) })
}

/**
 * Cho phép vào nếu đúng một trong các `allowedRoles`, hoặc có ít nhất một quyền
 * có id bắt đầu bằng một chuỗi trong `permissionIdPrefixes` (khớp RBAC động).
 */
export function requireRoleOrPermissionPrefixes(
  allowedRoles: Role[],
  permissionIdPrefixes: string[]
) {
  const user = useAuthStore.getState().user
  if (!user) throw redirect({ to: '/login' })
  if (allowedRoles.includes(user.role)) return
  if (permissionIdPrefixes.length === 0) {
    throw redirect({ to: defaultEntryPathFromSession(user) })
  }
  const eff = resolveEffectivePermissionSet(user)
  const ok = [...eff].some((id) =>
    permissionIdPrefixes.some((prefix) => id === prefix || id.startsWith(prefix))
  )
  if (!ok) throw redirect({ to: defaultEntryPathFromSession(user) })
}
