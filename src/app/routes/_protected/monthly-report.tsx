import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireMonthlyReportRoute } from '@/lib/routeGuards'

const MonthlyReportScreen = lazy(() =>
  import('@/features/kpi-okr').then((module) => ({
    default: module.MonthlyReportScreen,
  }))
)

export const Route = createFileRoute('/_protected/monthly-report')({
  beforeLoad: () => requireMonthlyReportRoute(),
  component: MonthlyReportPage,
})

function MonthlyReportPage() {
  return (
    <Suspense fallback={null}>
      <MonthlyReportScreen />
    </Suspense>
  )
}
