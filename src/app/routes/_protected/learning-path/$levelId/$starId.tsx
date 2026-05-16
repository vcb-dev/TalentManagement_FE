import { lazy, Suspense } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { PageSkeleton } from '@/components/ui/skeleton'

const ChecklistStarScreen = lazy(() =>
  import('@/features/learning-path/components/ChecklistStarScreen').then((module) => ({
    default: module.ChecklistStarScreen,
  }))
)

export const Route = createFileRoute('/_protected/learning-path/$levelId/$starId')({
  beforeLoad: () => {
    if (useAuthStore.getState().user?.role === 'MEMBER') {
      throw redirect({
        to: '/learning-path',
        search: { levelId: 'biet_viec', starId: 1 },
      })
    }
  },
  component: LearningChecklistPage,
})

function LearningChecklistPage() {
  const { levelId, starId } = Route.useParams()
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ChecklistStarScreen levelId={levelId} starId={starId} />
    </Suspense>
  )
}
