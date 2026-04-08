import { isMockApiEnabled } from '@/lib/mockEnv'
import { apiClient } from '@/lib/axios'
import type { ScopeKey } from './branches'
import type { PermissionAssignmentRecord } from './assignmentStore'
import { getAssignment, saveAssignment } from './assignmentStore'

/**
 * GET/PUT phân quyền theo nhân viên + scope — mock: localStorage key `hrm.v1.permissionAssignments`.
 *
 * **Contract backend dự kiến (khi tắt mock):**
 * - `GET /users/{userId}/permissions?scope=global` → `PermissionAssignmentRecord`
 * - `PUT /users/{userId}/permissions?scope=global` body: cùng shape; server merge effective + audit.
 * - `GET /auth/me` trả `UserSession` kèm `permissionIds[]`, `roles[]`, `dataScopeFlags` (đã mở rộng trong openapi.json).
 */
export const permissionApi = {
  getAssignment: async (
    userId: string,
    scopeKey: ScopeKey
  ): Promise<PermissionAssignmentRecord | null> => {
    if (isMockApiEnabled()) {
      return getAssignment(userId, scopeKey) ?? null
    }
    const res = await apiClient.get<unknown>(`/users/${userId}/permissions`, {
      params: { scope: scopeKey },
    })
    return res.data as PermissionAssignmentRecord
  },

  saveAssignment: async (record: PermissionAssignmentRecord): Promise<void> => {
    if (isMockApiEnabled()) {
      saveAssignment(record)
      return
    }
    await apiClient.put(`/users/${record.userId}/permissions`, record, {
      params: { scope: record.scopeKey },
    })
  },
}
