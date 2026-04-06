import { createFileRoute, redirect } from '@tanstack/react-router'
import { ChecklistStarScreen } from '@/features/learning-path/components/ChecklistStarScreen'
import { useAuthStore } from '@/stores/auth.store'

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
  return <ChecklistStarScreen levelId={levelId} starId={starId} />
}
