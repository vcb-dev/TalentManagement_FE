import type { Role, StaffLevel, UserSession } from '@/types/auth'

/** UUID cố định cho mock */
const DEPT = '11111111-1111-4111-8111-111111111111'
const TEAM = '22222222-2222-4222-8222-222222222222'

function session(
  id: string,
  name: string,
  email: string,
  role: Role,
  staffLevel: StaffLevel,
  permissions: UserSession['permissions'] = []
): UserSession {
  return {
    id,
    name,
    email,
    role,
    permissions,
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

/** Mật khẩu chung cho mọi tài khoản demo (chỉ khi VITE_USE_MOCK_API=true). */
export const MOCK_PASSWORD = 'Demo@123'

/**
 * Đăng nhập: đúng email + MOCK_PASSWORD → session tương ứng.
 * Gợi ý email theo role để dễ nhớ.
 */
export const MOCK_ACCOUNT_LIST: {
  email: string
  role: Role
  name: string
  description: string
}[] = [
  {
    email: 'hr.admin@vcb.com',
    role: 'HR',
    name: 'Phòng HR Demo',
    description: 'HR Admin — danh sách nhân sự',
  },
  {
    email: 'nhanvien@vcb.com',
    role: 'MEMBER',
    name: 'Nguyễn Nhân Viên',
    description: 'Nhân viên — lộ trình, checklist',
  },
  {
    email: 'leader@vcb.com',
    role: 'LEADER',
    name: 'Trần Trưởng Nhóm',
    description: 'Leader — nhân sự team, KPI/OKR, báo cáo tháng',
  },
  {
    email: 'manager@vcb.com',
    role: 'MANAGER',
    name: 'Lê Quản Lý',
    description: 'Manager — team, KPI',
  },
  {
    email: 'teacher@vcb.com',
    role: 'TEACHER',
    name: 'Phạm Người Chấm',
    description: 'Người chấm thi (Manager chỉ định theo kỳ)',
  },
  {
    email: 'bod@vcb.com',
    role: 'BOD',
    name: 'Vũ BOD',
    description: 'BOD — dashboard tổng quan',
  },
]

const byEmail = new Map<string, UserSession>(
  MOCK_ACCOUNT_LIST.map((a, i) => {
    const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
    return [
      a.email.toLowerCase(),
      session(id, a.name, a.email, a.role, inferMockStaffLevel(a.role)),
    ] as const
  })
)

export function findMockUser(email: string): UserSession | undefined {
  return byEmail.get(email.trim().toLowerCase())
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
