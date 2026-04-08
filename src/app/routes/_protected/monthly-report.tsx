import { createFileRoute } from '@tanstack/react-router'
import { MonthlyReportScreen } from '@/features/kpi-okr'
import { requireMonthlyReportRoute } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/monthly-report')({
  beforeLoad: () => requireMonthlyReportRoute(),
  component: MonthlyReportScreen,
})
