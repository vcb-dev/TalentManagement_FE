import { createFileRoute } from '@tanstack/react-router'
import { MemberKpiOkrScreen } from '@/features/kpi-okr'
import { requireMemberKpiOkrRoute } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/kpi-okr')({
  beforeLoad: () => requireMemberKpiOkrRoute(),
  component: MemberKpiOkrScreen,
})
