import { createFileRoute } from '@tanstack/react-router'
import RewardsPage from '@/features/rewards/RewardsPage'

export const Route = createFileRoute('/_protected/rewards')({
  component: RewardsPage,
})
