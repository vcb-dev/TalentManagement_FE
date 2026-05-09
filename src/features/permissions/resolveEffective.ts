import type { UserSession } from '@/types/auth'
import { applyMandatoryViewRules } from './effectivePermissions'
import { getDefaultPermissionIdsForRole } from './defaultPermissionIds'
import { legacyPermissionsToIds } from './legacyMap'

/** Tập id quyền hiệu lực cho user (ưu tiên permissionIds từ API/mock). */
export function resolveEffectivePermissionSet(user: UserSession | null | undefined): Set<string> {
  if (!user) return new Set()
  const roleDefaults = getDefaultPermissionIdsForRole(user.role)
  if (user.permissionIds && user.permissionIds.length > 0) {
    /** Hợp với template role trên FE để quyền mới (vd. company.landing.edit) hiện ngay cả khi phiên API cũ chưa gồm id. */
    return applyMandatoryViewRules(new Set([...user.permissionIds, ...roleDefaults]))
  }
  const base = new Set(roleDefaults)
  for (const id of legacyPermissionsToIds(user.permissions)) base.add(id)
  return applyMandatoryViewRules(base)
}
