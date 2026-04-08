import type { Role } from '@/types/auth'
import { applyMandatoryViewRules } from './effectivePermissions'
import { getTemplateByLinkedRole } from './roleTemplates'

/** Quyền mặc định khi chưa có assignment lưu (theo role hệ thống). */
export function getDefaultPermissionIdsForRole(role: Role): string[] {
  const t = getTemplateByLinkedRole(role)
  if (!t) return []
  return [...applyMandatoryViewRules(new Set(t.permissionIds))]
}
