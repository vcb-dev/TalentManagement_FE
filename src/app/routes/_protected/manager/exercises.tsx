import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { ManagerExercisesScreen } from '@/features/manager/components/ManagerWorkflowScreens'

export const Route = createFileRoute('/_protected/manager/exercises')({
  beforeLoad: () => requireRole('MANAGER'),
  component: ManagerExercisesPage,
})

function ManagerExercisesPage() {
  return <ManagerExercisesScreen />
}
