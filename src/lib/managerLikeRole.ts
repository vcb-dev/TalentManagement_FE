import type { Role } from '@/types/auth'

/** Role dùng giao diện / luồng Quản lý (Manager ops, KPI team, HR scoped…). */
export const MANAGER_LIKE_ROLES = ['MANAGER', 'BOD'] as const satisfies readonly Role[]

export function isManagerLikeRole(role: Role | undefined | null): boolean {
  return role != null && (MANAGER_LIKE_ROLES as readonly Role[]).includes(role)
}
