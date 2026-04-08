import type { ScopeKey } from './branches'
import { applyMandatoryViewRules } from './effectivePermissions'

const STORAGE_KEY = 'hrm.v1.permissionAssignments'

export interface PermissionAssignmentRecord {
  userId: string
  scopeKey: ScopeKey
  roleTemplateIds: string[]
  /** Tập quyền hiệu lực sau khi user chọn template + chỉnh cây (đã áp rule view) */
  grantedPermissionIds: string[]
  dataScopeFlags: Record<string, boolean>
}

function storageKey(userId: string, scopeKey: ScopeKey): string {
  return `${userId}::${scopeKey}`
}

function readAll(): Record<string, PermissionAssignmentRecord> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, PermissionAssignmentRecord>
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, PermissionAssignmentRecord>) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getAssignment(
  userId: string,
  scopeKey: ScopeKey
): PermissionAssignmentRecord | undefined {
  const all = readAll()
  return all[storageKey(userId, scopeKey)]
}

export function saveAssignment(record: PermissionAssignmentRecord): void {
  const all = readAll()
  all[storageKey(record.userId, record.scopeKey)] = {
    ...record,
    grantedPermissionIds: [...applyMandatoryViewRules(new Set(record.grantedPermissionIds))],
  }
  writeAll(all)
}

/** Union mọi scope đã lưu cho user — dùng cho mock session (demo). */
export function mergeStoredAssignmentsForUser(userId: string): {
  permissionIds: string[]
  dataScopeFlags: Record<string, boolean>
} {
  const all = readAll()
  const merged = new Set<string>()
  const flags: Record<string, boolean> = {}
  for (const rec of Object.values(all)) {
    if (rec.userId !== userId) continue
    for (const id of rec.grantedPermissionIds) merged.add(id)
    for (const [k, v] of Object.entries(rec.dataScopeFlags ?? {})) {
      if (v) flags[k] = true
    }
  }
  return {
    permissionIds: [...applyMandatoryViewRules(merged)],
    dataScopeFlags: flags,
  }
}
