import { createFileRoute } from '@tanstack/react-router'
import { CompanyLandingSettingsScreen } from '@/features/landing/CompanyLandingSettingsScreen'
import { requireAnyPermissionId } from '@/lib/permissionGuards'

export const Route = createFileRoute('/_protected/hr-admin/settings/company-landing')({
  beforeLoad: () => {
    requireAnyPermissionId('company.landing.edit')
  },
  component: CompanyLandingSettingsPage,
})

function CompanyLandingSettingsPage() {
  return <CompanyLandingSettingsScreen />
}
