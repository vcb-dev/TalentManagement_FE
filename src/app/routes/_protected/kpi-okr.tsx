import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireMemberKpiOkrRoute } from '@/lib/routeGuards'
import { PageSkeleton } from '@/components/ui/skeleton'

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
    <Suspense fallback={<PageSkeleton />}>
      <MemberKpiOkrScreen />
    </Suspense>
  )
}
