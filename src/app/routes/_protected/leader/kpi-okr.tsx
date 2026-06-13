import { lazy, Suspense } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { PageSkeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth.store'

const LeaderKpiOkrScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.LeaderKpiOkrScreen,
  }))
)

export const Route = createFileRoute('/_protected/leader/kpi-okr')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'MANAGER') throw redirect({ to: '/manager/kpi-okr' })
    requireRoleOrPermissionPrefixes(['LEADER'], ['kpi.team_'])
  },
  component: LeaderKpiOkrPage,
})

function LeaderKpiOkrPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeaderKpiOkrScreen />
    </Suspense>
  )
}
