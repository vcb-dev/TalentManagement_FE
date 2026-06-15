import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireManagerLikeOrPermissionPrefixes } from '@/lib/routeGuards'

export const Route = createFileRoute('/_protected/manager/kpi-sales-config')({
  beforeLoad: () => {
    requireManagerLikeOrPermissionPrefixes(['kpi.catalog_'])
    throw redirect({ to: '/manager/kpi-okr' })
  },
  component: () => null,
})
