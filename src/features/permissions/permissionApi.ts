import { isMockApiEnabled } from '@/lib/mockEnv'
import { apiClient } from '@/lib/axios'
import { safeParse } from '@/lib/utils'
import type { ScopeKey } from './branches'
import type { PermissionAssignmentRecord } from './assignmentStore'
import { getAssignment, saveAssignment } from './assignmentStore'
import { permissionAssignmentRecordSchema } from './permissionAssignment.schema'

/**
 * GET/PUT phân quyền theo nhân viên + scope — mock: localStorage `hrm.v1.permissionAssignments`.
 *
 * **Backend thật (TalentManagement_BE):** tắt `VITE_USE_MOCK_API`.
 * - `GET /users/{userId}/permissions?scope=global` → record hoặc `null` (chưa gán — FE fallback theo role).
 * - `PUT` cùng path + body; cần quyền BOD/MANAGER hoặc `admin.permissions.assign`.
 * - Session: `GET /auth/me` — `permissionIds`, `dataScopeFlags` (xem `authApi.me`).
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
    const data = res.data
    // 204 / body rỗng: axios thường để data là undefined hoặc ''
    if (data === null || data === undefined || data === '') {
      return null
    }
    if (typeof data !== 'object' || Array.isArray(data)) {
      console.error('[permissionApi.getAssignment] Response không phải object', data)
      throw new Error('Invalid API response shape: GET /users/.../permissions')
    }
    return safeParse(permissionAssignmentRecordSchema, data, 'GET /users/.../permissions')
  },

  saveAssignment: async (record: PermissionAssignmentRecord): Promise<void> => {
    if (isMockApiEnabled()) {
      saveAssignment(record)
      return
    }
    const body = permissionAssignmentRecordSchema.parse(record)
    await apiClient.put(`/users/${record.userId}/permissions`, body, {
      params: { scope: record.scopeKey },
    })
  },
}
