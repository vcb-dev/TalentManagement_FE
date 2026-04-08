import { redirect } from '@tanstack/react-router'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { useAuthStore } from '@/stores/auth.store'
import { defaultPathForRole } from './routeGuards'

/** Cần ít nhất một quyền có id bắt đầu bằng prefix (vd. manager., bod., hr.) */
export function requirePermissionPrefix(prefix: string) {
  const user = useAuthStore.getState().user
  if (!user) throw redirect({ to: '/login' })
  const eff = resolveEffectivePermissionSet(user)
  const ok = [...eff].some((id) => id.startsWith(prefix))
  if (!ok) throw redirect({ to: defaultPathForRole(user.role) })
}

export function requireAnyPermissionId(...ids: string[]) {
  const user = useAuthStore.getState().user
  if (!user) throw redirect({ to: '/login' })
  const eff = resolveEffectivePermissionSet(user)
  const ok = ids.some((id) => eff.has(id))
  if (!ok) throw redirect({ to: defaultPathForRole(user.role) })
}
