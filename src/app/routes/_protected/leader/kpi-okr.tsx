import { createFileRoute } from '@tanstack/react-router'
import { LeaderKpiOkrScreen } from '@/features/kpi-okr'
import { requireRole } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/leader/kpi-okr')({
  beforeLoad: () => requireRole('LEADER'),
  component: LeaderKpiOkrScreen,
})
