import { redirect } from '@tanstack/react-router'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { defaultEntryPathFromSession } from '@/lib/routeGuards'
import { useAuthStore } from '@/stores/auth.store'

export function requireOrgManageAccess() {
  const user = useAuthStore.getState().user
  if (!user) throw redirect({ to: '/login' })
  const eff = resolveEffectivePermissionSet(user)
  if (eff.has('hr.org.manage')) return
  if (user.role === 'HR') return
  throw redirect({ to: defaultEntryPathFromSession(user) })
}
