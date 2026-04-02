import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { ManagerClassesScreen } from '@/features/manager/components/ManagerWorkflowScreens'

export const Route = createFileRoute('/_protected/manager/classes')({
  beforeLoad: () => requireRole('MANAGER'),
  component: ManagerClassesPage,
})

function ManagerClassesPage() {
  return <ManagerClassesScreen />
}
