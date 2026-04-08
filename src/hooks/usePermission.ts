import { useCallback, useMemo } from 'react'
import type { Action, Resource } from '@/types/auth'
import { legacyAllowed } from '@/features/permissions/legacyMap'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { useAuthStore } from '@/stores/auth.store'

export function usePermission() {
  const user = useAuthStore((s) => s.user)

  const effectivePermissionIds = useMemo(() => resolveEffectivePermissionSet(user), [user])

  const can = useCallback(
    (action: Action, resource: Resource): boolean => {
      if (!user) return false
      return legacyAllowed(effectivePermissionIds, action, resource)
    },
    [user, effectivePermissionIds]
  )

  const canId = useCallback(
    (permissionId: string) => {
      if (!user) return false
      return effectivePermissionIds.has(permissionId)
    },
    [user, effectivePermissionIds]
  )

  return { can, canId, role: user?.role, effectivePermissionIds }
}
