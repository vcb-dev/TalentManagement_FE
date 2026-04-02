import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/routeGuards'
import { TeamProgressTableContainer } from '@/features/manager/components/TeamProgressTable'

export const Route = createFileRoute('/_protected/manager/team-progress')({
  beforeLoad: () => requireRole('MANAGER'),
  component: TeamProgressTableContainer,
})
