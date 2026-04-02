import { createFileRoute } from '@tanstack/react-router'
import { MyProfileScreenContainer } from '@/features/profile/components/MyProfileScreen'

export const Route = createFileRoute('/_protected/profile')({
  component: MyProfileScreenContainer,
})
