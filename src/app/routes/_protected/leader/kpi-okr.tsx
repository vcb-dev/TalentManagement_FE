import { lazy, Suspense } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { useAuthStore } from '@/stores/auth.store'

const LeaderKpiOkrScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.LeaderKpiOkrScreen,
  }))
)

export const Route = createFileRoute('/_protected/leader/kpi-okr')({
  beforeLoad: () => {
    if (useAuthStore.getState().user?.role === 'MANAGER') {
      throw redirect({ to: '/monthly-report' })
    }
    requireRoleOrPermissionPrefixes(['LEADER'], ['kpi.team_'])
  },
  component: LeaderKpiOkrPage,
})

function LeaderKpiOkrPage() {
  return (
    <Suspense fallback={null}>
      <LeaderKpiOkrScreen />
    </Suspense>
  )
}
