import type { Action, Permission, Resource } from '@/types/auth'
import { PERMISSION_NODES } from './catalog'

const legacyToIds = new Map<string, string[]>()

for (const n of PERMISSION_NODES) {
  if (!n.legacy) continue
  const key = `${n.legacy.action}:${n.legacy.resource}`
  const list = legacyToIds.get(key) ?? []
  list.push(n.id)
  legacyToIds.set(key, list)
}

export function permissionIdsForLegacy(action: Action, resource: Resource): string[] {
  return legacyToIds.get(`${action}:${resource}`) ?? []
}

/** Kiểm tra legacy: có ít nhất một id ánh xạ tới cặp action/resource trong tập đã cấp */
export function legacyAllowed(
  effectiveIds: Set<string>,
  action: Action,
  resource: Resource
): boolean {
  const ids = permissionIdsForLegacy(action, resource)
  return ids.some((id) => effectiveIds.has(id))
}

/** Chuyển mảng Permission cũ sang tập id (best-effort) */
export function legacyPermissionsToIds(permissions: Permission[]): Set<string> {
  const s = new Set<string>()
  for (const p of permissions) {
    for (const id of permissionIdsForLegacy(p.action, p.resource)) s.add(id)
  }
  return s
}
