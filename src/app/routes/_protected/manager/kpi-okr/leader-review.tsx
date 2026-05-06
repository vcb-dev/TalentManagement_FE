// @ts-nocheck -- route registered automatically by file-based router on next build
import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { LeaderReviewScreen } from '@/features/kpi-okr/components/LeaderReviewScreen'

export const Route = createFileRoute('/_protected/manager/kpi-okr/leader-review')({
  beforeLoad: () => {
    requirePermissionPrefix('kpi.leader_review')
  },
  component: LeaderReviewPage,
})

function LeaderReviewPage() {
  return <LeaderReviewScreen />
}
