import { Badge } from '@/components/ui/badge'

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'PROBATION' | 'RESERVED' | 'TRANSFERRED'

export interface StatusBadgeProps {
  status: EmploymentStatus
}

const labels: Record<EmploymentStatus, string> = {
  ACTIVE: 'Đang làm',
  INACTIVE: 'Ngưng',
  PROBATION: 'Thử việc',
  RESERVED: 'Dự phòng',
  TRANSFERRED: 'Điều chuyển',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={status === 'ACTIVE' ? 'default' : 'muted'}>{labels[status]}</Badge>
}
