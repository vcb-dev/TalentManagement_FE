// @ts-nocheck -- route registered automatically by file-based router on next build
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireKpiOkrEnabled } from '@/lib/routeGuards'
import { UserSnapshotScreen } from '@/features/kpi-okr/components/UserSnapshotScreen'

const snapshotSearchSchema = z.object({
  year: z.number().optional(),
  month: z.number().optional(),
})

export const Route = createFileRoute('/_protected/manager/people/$userId')({
  beforeLoad: () => {
    requireKpiOkrEnabled()
    requirePermissionPrefix('kpi.snapshot_view')
  },
  validateSearch: snapshotSearchSchema,
  component: UserSnapshotPage,
})

function UserSnapshotPage() {
  return <UserSnapshotScreen />
}
