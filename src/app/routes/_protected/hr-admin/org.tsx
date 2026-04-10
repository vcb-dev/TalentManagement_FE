import { createFileRoute } from '@tanstack/react-router'
import { HrOrgStructure } from '@/features/hr-admin/components/HrOrgStructure/HrOrgStructure'
import { requireOrgManageAccess } from '@/features/hr-admin/requireOrgManage'

export const Route = createFileRoute('/_protected/hr-admin/org')({
  beforeLoad: () => requireOrgManageAccess(),
  component: HrOrgStructure,
})
