import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'

const LeaderKpiOkrScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.LeaderKpiOkrScreen,
  }))
)

export const Route = createFileRoute('/_protected/leader/kpi-okr')({
  beforeLoad: () => requireRoleOrPermissionPrefixes(['LEADER'], ['kpi.team_']),
  component: LeaderKpiOkrPage,
})

function LeaderKpiOkrPage() {
  return (
    <Suspense fallback={null}>
      <LeaderKpiOkrScreen />
    </Suspense>
  )
}
