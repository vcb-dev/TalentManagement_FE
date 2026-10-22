import { createFileRoute } from '@tanstack/react-router'
import { PerformanceWindowConfigScreen } from '@/features/kpi-okr/components/PerformanceWindowConfigScreen'
import { requireAnyPermissionId } from '@/lib/permissionGuards'
import { requireKpiOkrEnabled } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/hr-admin/settings/kpi-windows')({
  beforeLoad: () => {
    requireKpiOkrEnabled()
    requireAnyPermissionId('kpi.window_override')
  },
  component: PerformanceWindowConfigPage,
})

function PerformanceWindowConfigPage() {
  return <PerformanceWindowConfigScreen />
}
