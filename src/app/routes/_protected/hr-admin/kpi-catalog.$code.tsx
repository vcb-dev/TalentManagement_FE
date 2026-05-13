// @ts-nocheck -- route registered automatically by file-based router on next build
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/hr-admin/kpi-catalog/$code')({
  beforeLoad: () => {
    throw redirect({ to: '/hr-admin' })
  },
  component: () => null,
})
