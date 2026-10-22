import { createFileRoute } from '@tanstack/react-router'
import { CatalogDivisionAllowlistScreen } from '@/features/kpi-okr/components/CatalogDivisionAllowlistScreen'
import { requireAnyPermissionId } from '@/lib/permissionGuards'
import { requireKpiOkrEnabled } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/hr-admin/settings/kpi-catalog-allowlist')({
  beforeLoad: () => {
    requireKpiOkrEnabled()
    requireAnyPermissionId('kpi.catalog_edit')
  },
  component: CatalogDivisionAllowlistPage,
})

function CatalogDivisionAllowlistPage() {
  return <CatalogDivisionAllowlistScreen />
}
