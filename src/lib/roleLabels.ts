import type { Role } from '@/types/auth'

/** Nhãn hiển thị vai trò (sidebar, profile). */
export const ROLE_LABEL_VI: Record<Role, string> = {
  MEMBER: 'Nhân viên',
  LEADER: 'Trưởng nhóm',
  MANAGER: 'Quản lý',
  HR: 'Nhân sự',
  TEACHER: 'Giảng viên',
  BOD: 'Ban lãnh đạo',
}

/** Chuỗi vai trò khi có thêm quyền giảng viên (MEMBER + TEACHER, …). */
export function formatRoleLabelsVi(user: { role: Role; roles?: Role[] }): string {
  const list = user.roles?.length ? user.roles : [user.role]
  const unique = [...new Set(list)]
  return unique.map((r) => ROLE_LABEL_VI[r]).join(' · ')
}
