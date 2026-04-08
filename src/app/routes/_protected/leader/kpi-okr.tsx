import { createFileRoute } from '@tanstack/react-router'
import { LeaderKpiOkrScreen } from '@/features/kpi-okr'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/leader/kpi-okr')({
  beforeLoad: () => requireRoleOrPermissionPrefixes(['LEADER'], ['kpi.team_']),
  component: LeaderKpiOkrScreen,
})
