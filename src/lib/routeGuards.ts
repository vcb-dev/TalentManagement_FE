import { redirect } from '@tanstack/react-router'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { useAuthStore } from '@/stores/auth.store'
import type { Role, UserSession } from '@/types/auth'

/** Trang mặc định sau đăng nhập / khi không đủ quyền (bám luồng nghiệp vụ VCB HRM). */
export function defaultPathForRole(role: Role | undefined): string {
  if (!role) return '/login'
  return '/dashboard'
}

/**
 * Trang vào đầu tiên khi đã có session — ưu tiên quyền catalog (RBAC động)
 * khi `role` vẫn là MEMBER nhưng đã gán thêm template / quyền tay.
 */
export function defaultEntryPathFromSession(user: UserSession | null | undefined): string {
  if (!user) return '/login'
  return '/dashboard'
}

export function requireRole(...allowed: Role[]) {
  const user = useAuthStore.getState().user
  if (!user?.role) throw redirect({ to: '/login' })
  if (!allowed.includes(user.role)) throw redirect({ to: defaultEntryPathFromSession(user) })
}

/**
 * Màn KPI/OKR cá nhân (`/kpi-okr`): nhân viên (MEMBER) hoặc ai có quyền chỉnh KPI của chính mình
 * (`kpi.edit_own` trong catalog) — khớp menu & tránh nhảy về Dashboard khi role không phải MEMBER.
 */
export function requireMemberKpiOkrRoute() {
  const user = useAuthStore.getState().user
  if (!user?.role) throw redirect({ to: '/login' })
  if (user.role === 'MEMBER') return
  const eff = resolveEffectivePermissionSet(user)
  if (eff.has('kpi.view') || eff.has('kpi.edit_own')) return
  throw redirect({ to: defaultEntryPathFromSession(user) })
}

/**
 * Báo cáo hàng tháng (`/monthly-report`): MEMBER/LEADER như trước, hoặc bất kỳ ai có quyền catalog
 * `report.view` / `report.edit` — tránh redirect về `/bod/dashboard` khi menu hiện mục báo cáo nhưng role là BOD/MANAGER/HR.
 */
export function requireMonthlyReportRoute() {
  const user = useAuthStore.getState().user
  if (!user?.role) throw redirect({ to: '/login' })
  if (user.role === 'MEMBER' || user.role === 'LEADER') return
  const eff = resolveEffectivePermissionSet(user)
  if (eff.has('report.view') || eff.has('report.edit')) return
  throw redirect({ to: defaultEntryPathFromSession(user) })
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
