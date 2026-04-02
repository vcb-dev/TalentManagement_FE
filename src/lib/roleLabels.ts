import type { Role } from '@/types/auth'

/** Nhãn hiển thị vai trò (sidebar, profile). */
export const ROLE_LABEL_VI: Record<Role, string> = {
  MEMBER: 'Nhân viên',
  MANAGER: 'Quản lý',
  HR_ADMIN: 'HR',
  TEACHER: 'Người chấm thi',
  BOD: 'BOD',
}
