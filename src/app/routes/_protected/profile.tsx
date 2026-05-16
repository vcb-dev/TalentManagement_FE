import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageSkeleton } from '@/components/ui/skeleton'

const MyProfileScreenContainer = lazy(() =>
  import('@/features/profile/components/MyProfileScreen').then((module) => ({
    default: module.MyProfileScreenContainer,
  }))
)

export const Route = createFileRoute('/_protected/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyProfileScreenContainer />
    </Suspense>
  )
}
