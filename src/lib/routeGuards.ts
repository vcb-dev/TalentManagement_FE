import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/auth'

/** Trang mặc định sau đăng nhập / khi không đủ quyền (bám luồng nghiệp vụ VCB HRM). */
export function defaultPathForRole(role: Role | undefined): string {
  if (!role) return '/login'
  switch (role) {
    case 'HR_ADMIN':
      return '/hr-admin'
    case 'BOD':
      return '/bod/dashboard'
    case 'MANAGER':
      return '/manager/team-progress'
    case 'LEADER':
      return '/dashboard'
    case 'TEACHER':
      return '/teacher/classes'
    case 'MEMBER':
    default:
      return '/dashboard'
  }
}

export function requireRole(...allowed: Role[]) {
  const role = useAuthStore.getState().user?.role
  if (!role) throw redirect({ to: '/login' })
  if (!allowed.includes(role)) throw redirect({ to: defaultPathForRole(role) })
}
