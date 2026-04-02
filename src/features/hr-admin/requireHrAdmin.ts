import { requireRole } from '@/lib/routeGuards'

/** Chỉ HR được vào khu vực quản trị nhân sự toàn công ty. */
export function requireHrAdmin() {
  requireRole('HR_ADMIN')
}
