import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireMemberKpiOkrRoute } from '@/lib/routeGuards'

const MemberKpiOkrScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.MemberKpiOkrScreen,
  }))
)

export const Route = createFileRoute('/_protected/kpi-okr')({
  beforeLoad: () => requireMemberKpiOkrRoute(),
  component: MemberKpiOkrPage,
})

function MemberKpiOkrPage() {
  return (
    <Suspense fallback={null}>
      <MemberKpiOkrScreen />
    </Suspense>
  )
}
