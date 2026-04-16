import type { Role } from '@/types/auth'

/** Nhãn hiển thị vai trò (sidebar, profile). */
export const ROLE_LABEL_VI: Record<Role, string> = {
  MEMBER: 'Nhân viên',
  LEADER: 'Leader',
  MANAGER: 'Quản lý',
  HR: 'HR',
  TEACHER: 'Người chấm thi',
  BOD: 'BOD',
}

/** Chuỗi vai trò khi có thêm quyền giảng viên (MEMBER + TEACHER, …). */
export function formatRoleLabelsVi(user: { role: Role; roles?: Role[] }): string {
  const list = user.roles?.length ? user.roles : [user.role]
  const unique = [...new Set(list)]
  return unique.map((r) => ROLE_LABEL_VI[r]).join(' · ')
}
