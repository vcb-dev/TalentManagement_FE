import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { CskhQualityPage } from '@/features/cskh-quality/CskhQualityPage'
import { requireAnyPermissionId } from '@/lib/permissionGuards'

const cskhQualitySearchSchema = z.object({
  tab: z.enum(['overview', 'fb-page', 'audit', 'config']).optional(),
})

function normalizeCskhQualitySearch(raw: unknown) {
  const input =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {}
  if (input.tab === 'monitor') input.tab = 'audit'
  return cskhQualitySearchSchema.parse(input)
}

export const Route = createFileRoute('/_protected/cskh-quality')({
  validateSearch: normalizeCskhQualitySearch,
  beforeLoad: ({ search }) => {
    requireAnyPermissionId('manager.approvals', 'hr.employees.view', 'bod.dashboard.view')
    if (!search.tab) {
      throw redirect({ to: '/cskh-quality', search: { tab: 'overview' } })
    }
  },
  component: CskhQualityPage,
})
