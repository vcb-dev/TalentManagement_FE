import type { Role } from '@/types/auth'
import { Badge } from '@/components/ui/badge'

export interface RoleBadgeProps {
  role: Role
}

const labels: Record<Role, string> = {
  MEMBER: 'Nhân viên',
  LEADER: 'Trưởng nhóm KPI',
  MANAGER: 'Quản lý',
  HR: 'HR',
  TEACHER: 'Người chấm thi',
  BOD: 'BOD',
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return <Badge variant="outline">{labels[role]}</Badge>
}
