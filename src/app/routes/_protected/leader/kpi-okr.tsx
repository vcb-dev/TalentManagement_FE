import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { useAuthStore } from '@/stores/auth.store'

const LeaderKpiOkrScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.LeaderKpiOkrScreen,
  }))
)

const ManagerKpiOkrScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.ManagerKpiOkrScreen,
  }))
)

export const Route = createFileRoute('/_protected/leader/kpi-okr')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['LEADER', 'MANAGER'], ['kpi.team_'])
  },
  component: LeaderKpiOkrPage,
})

function LeaderKpiOkrPage() {
  const role = useAuthStore((s) => s.user?.role)
  return (
    <Suspense fallback={null}>
      {role === 'MANAGER' ? <ManagerKpiOkrScreen /> : <LeaderKpiOkrScreen />}
    </Suspense>
  )
}
