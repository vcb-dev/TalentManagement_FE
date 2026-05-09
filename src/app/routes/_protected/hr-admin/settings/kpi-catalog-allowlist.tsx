import { createFileRoute } from '@tanstack/react-router'
import { CatalogDivisionAllowlistScreen } from '@/features/kpi-okr/components/CatalogDivisionAllowlistScreen'
import { requireAnyPermissionId } from '@/lib/permissionGuards'

export const Route = createFileRoute('/_protected/hr-admin/settings/kpi-catalog-allowlist')({
  beforeLoad: () => {
    requireAnyPermissionId('kpi.catalog_edit')
  },
  component: CatalogDivisionAllowlistPage,
})

function CatalogDivisionAllowlistPage() {
  return <CatalogDivisionAllowlistScreen />
}
