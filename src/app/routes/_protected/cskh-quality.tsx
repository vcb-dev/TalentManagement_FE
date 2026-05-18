import { createFileRoute } from '@tanstack/react-router'
import { CskhQualityPage } from '@/features/cskh-quality/CskhQualityPage'
import { requireAnyPermissionId } from '@/lib/permissionGuards'

export const Route = createFileRoute('/_protected/cskh-quality')({
  beforeLoad: () =>
    requireAnyPermissionId('manager.approvals', 'hr.employees.view', 'bod.dashboard.view'),
  component: CskhQualityPage,
})
