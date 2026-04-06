import type { Role } from '@/types/auth'

/** Nhãn hiển thị vai trò (sidebar, profile). */
export const ROLE_LABEL_VI: Record<Role, string> = {
  MEMBER: 'Nhân viên',
  LEADER: 'Trưởng nhóm KPI',
  MANAGER: 'Quản lý',
  HR_ADMIN: 'HR',
  TEACHER: 'Người chấm thi',
  BOD: 'BOD',
}
