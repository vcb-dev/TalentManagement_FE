import type { UserSession } from '@/types/auth'
import { applyMandatoryViewRules } from './effectivePermissions'
import { getDefaultPermissionIdsForRole } from './defaultPermissionIds'
import { legacyPermissionsToIds } from './legacyMap'

/** Tập id quyền hiệu lực cho user (ưu tiên permissionIds từ API/mock). */
export function resolveEffectivePermissionSet(user: UserSession | null | undefined): Set<string> {
  if (!user) return new Set()
  if (user.permissionIds && user.permissionIds.length > 0) {
    return applyMandatoryViewRules(new Set(user.permissionIds))
  }
  const base = new Set(getDefaultPermissionIdsForRole(user.role))
  for (const id of legacyPermissionsToIds(user.permissions)) base.add(id)
  return applyMandatoryViewRules(base)
}
