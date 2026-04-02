import { ApprovalQueue } from './ApprovalQueue'
import { useApprovals, useApproveRequest, useRejectRequest } from '@/features/manager/hooks'

export function ApprovalQueueContainer() {
  const { data, isLoading } = useApprovals()
  const approve = useApproveRequest()
  const reject = useRejectRequest()
  return (
    <ApprovalQueue
      page={data}
      isLoading={isLoading}
      onApprove={(id) => approve.mutate(id)}
      onReject={(id) => reject.mutate(id)}
    />
  )
}

export { ApprovalQueue }
