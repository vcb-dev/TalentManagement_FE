import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'

/** BOD / Quản lý, hoặc được gán quyền phân quyền (`admin.*`). */
export function requireBodOrManager() {
  requireRoleOrPermissionPrefixes(['BOD', 'MANAGER'], ['admin.'])
}
