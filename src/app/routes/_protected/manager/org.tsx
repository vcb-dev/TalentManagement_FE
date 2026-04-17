import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireAnyPermissionId } from '@/lib/permissionGuards'

export const Route = createFileRoute('/_protected/manager/org')({
  beforeLoad: () => {
    requireAnyPermissionId('admin.permissions.assign')
    throw redirect({ to: '/hr-admin/org' })
  },
})
