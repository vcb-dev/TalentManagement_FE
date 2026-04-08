import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { ApprovalQueueContainer } from '@/features/manager/components/ApprovalQueue'

export const Route = createFileRoute('/_protected/manager/approvals')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['MANAGER'], ['manager.'])
    requirePermissionPrefix('manager.')
  },
  component: ApprovalQueueContainer,
})
