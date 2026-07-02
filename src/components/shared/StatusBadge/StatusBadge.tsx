import { Badge } from '@/components/ui/badge'

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'PROBATION' | 'RESERVED'

export interface StatusBadgeProps {
  status: EmploymentStatus
}

const labels: Record<EmploymentStatus, string> = {
  ACTIVE: 'Đang làm',
  INACTIVE: 'Ngưng',
  PROBATION: 'Thử việc',
  RESERVED: 'Dự phòng',
}

const variants: Record<EmploymentStatus, 'success' | 'muted' | 'warning' | 'outline'> = {
  ACTIVE: 'success',
  INACTIVE: 'muted',
  PROBATION: 'warning',
  RESERVED: 'outline',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
