import { createFileRoute } from '@tanstack/react-router'
import { MemberKpiOkrScreen } from '@/features/kpi-okr'
import { requireRole } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/kpi-okr')({
  beforeLoad: () => requireRole('MEMBER'),
  component: MemberKpiOkrScreen,
})
