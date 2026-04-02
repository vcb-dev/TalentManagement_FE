import type { EmployeeEntity } from '@/features/hr-admin/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { RoleBadge } from '@/components/shared/RoleBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { EmployeeStatus } from '@/types/employee'

export interface ProfileCardProps {
  employee: EmployeeEntity
}

export function ProfileCard({ employee }: ProfileCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <EmployeeAvatar name={employee.name} className="h-12 w-12 text-sm" />
        <div>
          <CardTitle>{employee.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{employee.email}</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <RoleBadge role={employee.role} />
        <StatusBadge status={employee.status as EmployeeStatus} />
      </CardContent>
    </Card>
  )
}
