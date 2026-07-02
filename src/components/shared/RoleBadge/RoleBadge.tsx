import type { Role } from '@/types/auth'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'

export interface RoleBadgeProps {
  role: Role
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant="outline" className="font-medium">
      {ROLE_LABEL_VI[role]}
    </Badge>
  )
}
