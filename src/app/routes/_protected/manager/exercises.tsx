import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireRole } from '@/lib/routeGuards'
import { ManagerExercisesScreen } from '@/features/manager/components/ManagerWorkflowScreens'

export const Route = createFileRoute('/_protected/manager/exercises')({
  beforeLoad: () => {
    requireRole('MANAGER')
    requirePermissionPrefix('manager.')
  },
  component: ManagerExercisesPage,
})

function ManagerExercisesPage() {
  return <ManagerExercisesScreen />
}
