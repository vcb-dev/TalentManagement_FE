import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'
import { ApprovalQueueContainer } from '@/features/manager/components/ApprovalQueue'

export const Route = createFileRoute('/_protected/manager/approvals')({
  beforeLoad: () => {
    requireRole('MANAGER')
    requirePermissionPrefix('manager.')
  },
  component: ApprovalQueueContainer,
})
