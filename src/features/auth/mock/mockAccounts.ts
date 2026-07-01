import type { Role, StaffLevel, UserSession } from '@/types/auth'
import { applyMandatoryViewRules } from '@/features/permissions/effectivePermissions'
import { getDefaultPermissionIdsForRole } from '@/features/permissions/defaultPermissionIds'
import { mergeStoredAssignmentsForUser } from '@/features/permissions/assignmentStore'
import { HR_DEPARTMENT_IDS } from '@/features/hr-admin/hrOrgOptions'

/** UUID cố định cho mock */
const DEPT = HR_DEPARTMENT_IDS.khoiKinhDoanh
const TEAM = '02d0d0d0-0001-4001-8001-000000000301'

function session(
  id: string,
  name: string,
  email: string,
  role: Role,
  staffLevel: StaffLevel,
  permissions: UserSession['permissions'] = []
): UserSession {
  const permissionIds = getDefaultPermissionIdsForRole(role)
  return {
    id,
    name,
    email,
    role,
    roles: [role],
    permissions,
    permissionIds,
    departmentId: DEPT,
    teamIds: [TEAM],
    staffLevel,
  }
}

function inferMockStaffLevel(role: Role): StaffLevel {
  if (role === 'BOD' || role === 'MANAGER') return 'GENERAL'
  if (role === 'HR') return 'PROFICIENT'
  return 'PROBATION'
}

/** Gộp assignment đã lưu (localStorage) vào session mock. */
export function buildSessionWithAssignments(user: UserSession): UserSession {
  const merged = mergeStoredAssignmentsForUser(user.id)
  const base = new Set(user.permissionIds ?? getDefaultPermissionIdsForRole(user.role))
  for (const id of merged.permissionIds) base.add(id)
  const permissionIds = [...applyMandatoryViewRules(base)]
  return {
    ...user,
    roles: user.roles ?? [user.role],
    permissionIds,
    dataScopeFlags: { ...user.dataScopeFlags, ...merged.dataScopeFlags },
  }
}

/** Mật khẩu chung cho mọi tài khoản demo (chỉ khi VITE_USE_MOCK_API=true). */
export const MOCK_PASSWORD = 'Demo@123'

/**
 * Đăng nhập: đúng email + MOCK_PASSWORD → session tương ứng.
 * Gợi ý email theo role để dễ nhớ.
 */
export const MOCK_ACCOUNT_LIST: {
  username: string
  role: Role
  name: string
  description: string
}[] = [
  {
    username: 'hr.admin@vcb.com',
    role: 'HR',
    name: 'Phòng HR Demo',
    description: 'HR Admin — danh sách nhân sự',
  },
  {
    username: 'nhanvien@vcb.com',
    role: 'MEMBER',
    name: 'Nguyễn Nhân Viên',
    description: 'Nhân viên — lộ trình, checklist',
  },
  {
    username: 'leader@vcb.com',
    role: 'LEADER',
    name: 'Trần Trưởng Nhóm',
    description: 'Leader — nhân sự team, KPI/OKR, báo cáo tháng',
  },
  {
    username: 'manager@vcb.com',
    role: 'MANAGER',
    name: 'Lê Quản Lý',
    description: 'Manager — team, KPI',
  },
  {
    username: 'teacher@vcb.com',
    role: 'TEACHER',
    name: 'Phạm Người Chấm',
    description: 'Người chấm thi (Manager chỉ định theo kỳ)',
  },
  {
    username: 'bod@vcb.com',
    role: 'BOD',
    name: 'Vũ BOD',
    description: 'BOD — dashboard tổng quan',
  },
]

const byUsername = new Map<string, UserSession>(
  MOCK_ACCOUNT_LIST.map((a, i) => {
    const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
    return [
      a.username.toLowerCase(),
      session(id, a.name, a.username, a.role, inferMockStaffLevel(a.role)),
    ] as const
  })
)

export function findMockUser(username: string): UserSession | undefined {
  return byUsername.get(username.trim().toLowerCase())
}

export function encodeMockToken(email: string): string {
  const payload = JSON.stringify({ e: email.trim().toLowerCase() })
  return `mock.${btoa(payload)}`
}

export function decodeMockToken(token: string): string | null {
  if (!token.startsWith('mock.')) return null
  try {
    const { e } = JSON.parse(atob(token.slice(5))) as { e: string }
    return e
  } catch {
    return null
  }
}
