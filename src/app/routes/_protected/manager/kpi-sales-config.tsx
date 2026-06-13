import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/manager/kpi-sales-config')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['MANAGER'], ['kpi.catalog_'])
    throw redirect({ to: '/manager/kpi-okr' })
  },
  component: () => null,
})
