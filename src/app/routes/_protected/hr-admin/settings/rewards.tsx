import { createFileRoute } from '@tanstack/react-router'
import { RewardAdminScreen } from '@/features/reward-admin/RewardAdminScreen'
import { requireAnyPermissionId } from '@/lib/permissionGuards'

export const Route = createFileRoute('/_protected/hr-admin/settings/rewards')({
  beforeLoad: () => {
    requireAnyPermissionId('reward.threshold_view', 'reward.calculate', 'reward.record_view')
  },
  component: RewardsAdminPage,
})

function RewardsAdminPage() {
  return <RewardAdminScreen />
}
