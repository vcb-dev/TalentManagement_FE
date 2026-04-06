import { createFileRoute } from '@tanstack/react-router'
import { MonthlyReportScreen } from '@/features/kpi-okr'
import { requireRole } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/monthly-report')({
  beforeLoad: () => requireRole('MEMBER', 'LEADER'),
  component: MonthlyReportScreen,
})
