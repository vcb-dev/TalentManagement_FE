import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { ApprovalQueueContainer } from '@/features/manager/components/ApprovalQueue'

export const Route = createFileRoute('/_protected/manager/approvals')({
  beforeLoad: () => requireRole('MANAGER'),
  component: ApprovalQueueContainer,
})
