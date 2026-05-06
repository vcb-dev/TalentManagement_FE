// @ts-nocheck -- route registered automatically by file-based router on next build
import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { CatalogEditorScreen } from '@/features/kpi-okr/components/CatalogEditorScreen'

export const Route = createFileRoute('/_protected/hr-admin/kpi-catalog/$code')({
  beforeLoad: () => {
    requirePermissionPrefix('kpi.catalog_edit')
  },
  component: CatalogEditorPage,
})

function CatalogEditorPage() {
  return <CatalogEditorScreen />
}
