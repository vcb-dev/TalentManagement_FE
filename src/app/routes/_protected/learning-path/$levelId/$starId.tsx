import { createFileRoute } from '@tanstack/react-router'
import { ChecklistStarScreen } from '@/features/learning-path/components/ChecklistStarScreen'

export const Route = createFileRoute('/_protected/learning-path/$levelId/$starId')({
  component: LearningChecklistPage,
})

function LearningChecklistPage() {
  const { levelId, starId } = Route.useParams()
  return <ChecklistStarScreen levelId={levelId} starId={starId} />
}
