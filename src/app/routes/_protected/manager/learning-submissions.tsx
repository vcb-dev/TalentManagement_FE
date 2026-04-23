import { createFileRoute } from '@tanstack/react-router'
import { ManagerLearningSubmissionsScreen } from '@/features/manager/components/ManagerHub'

export const Route = createFileRoute('/_protected/manager/learning-submissions')({
  component: ManagerLearningSubmissionsScreen,
})
