import type { EmployeeEntity } from '@/features/hr-admin/api'
import type { EmployeeFilters } from '@/features/hr-admin/types'
import type { CreateEmployeeInput, PatchEmployeeInput } from '@/types/api'
import type { MeUserSelf } from '@/features/profile/userSelf.types'
import { HR_DEPARTMENT_IDS, HR_TEAM_OPTIONS } from '@/features/hr-admin/hrOrgOptions'

export type CreateEmployeeMeta = {
  initialLevel?: 'tap_su' | 'biet_viec'
}

const DEPT = HR_DEPARTMENT_IDS.khoiKinhDoanh
const DEPT_NAME = 'KH\u1ED0I KINH DOANH'
/** Team demo — LIVESTREAM 1 */
export const MOCK_TEAM_NS01 = '02d0d0d0-0001-4001-8001-000000000301'
/** Team demo — LIVESTREAM 2 */
export const MOCK_TEAM_NS02 = '02d0d0d0-0001-4001-8001-000000000302'

function teamLabelForMock(teamId: string): string {
  return HR_TEAM_OPTIONS.find((t) => t.value === teamId)?.label ?? 'Nh\u00F3m (mock)'
}

function emp(
  p: Omit<
    EmployeeEntity,
    'departmentId' | 'departmentName' | 'teamIds' | 'teamNames' | 'createdAt' | 'updatedAt'
  >,
  teamIds: string[] = [MOCK_TEAM_NS01]
): EmployeeEntity {
  const now = new Date().toISOString()
  return {
    ...p,
    departmentId: DEPT,
    departmentName: DEPT_NAME,
    teamIds,
    teamNames: teamIds.map(teamLabelForMock),
    createdAt: now,
    updatedAt: now,
  }
}

/** Danh sách cố định — có thể chỉnh sửa trong dev. */
let rows: EmployeeEntity[] = [
  emp(
    {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Nguyễn Thành',
      email: 'n.thanh@vcb.com',
      role: 'MEMBER',
      status: 'ACTIVE',
      currentLevel: 'duoc_viec',
      currentStar: 5,
    },
    [MOCK_TEAM_NS01]
  ),
  emp(
    {
      id: '10000000-0000-4000-8000-000000000002',
      name: 'Trần Linh',
      email: 't.linh@vcb.com',
      role: 'MEMBER',
      status: 'ACTIVE',
      currentLevel: 'biet_viec',
      currentStar: 3,
    },
    [MOCK_TEAM_NS02]
  ),
  emp(
    {
      id: '10000000-0000-4000-8000-000000000003',
      name: 'Lê Minh',
      email: 'l.minh@vcb.com',
      role: 'MANAGER',
      status: 'ACTIVE',
      currentLevel: 'dong_gop_ket_qua',
      currentStar: 6,
    },
    [MOCK_TEAM_NS01]
  ),
  emp(
    {
      id: '10000000-0000-4000-8000-000000000007',
      name: 'Hoàng Kiệt',
      email: 'h.kiet@vcb.com',
      role: 'LEADER',
      status: 'ACTIVE',
      currentLevel: 'duoc_viec',
      currentStar: 4,
    },
    [MOCK_TEAM_NS01]
  ),
  emp(
    {
      id: '10000000-0000-4000-8000-000000000004',
      name: 'Phạm Hùng',
      email: 'p.hung@vcb.com',
      role: 'MEMBER',
      status: 'PROBATION',
      currentLevel: 'tap_su',
      currentStar: 0,
    },
    [MOCK_TEAM_NS01]
  ),
  emp(
    {
      id: '10000000-0000-4000-8000-000000000005',
      name: 'Ngô An',
      email: 'n.an@vcb.com',
      role: 'MEMBER',
      status: 'RESERVED',
      currentLevel: 'biet_viec',
      currentStar: 2,
    },
    [MOCK_TEAM_NS02]
  ),
  emp(
    {
      id: '10000000-0000-4000-8000-000000000006',
      name: 'Vũ Bình',
      email: 'v.binh@vcb.com',
      role: 'MEMBER',
      status: 'INACTIVE',
      currentLevel: 'biet_viec',
      currentStar: 0,
    },
    [MOCK_TEAM_NS01]
  ),
  emp(
    {
      id: '10000000-0000-4000-8000-000000000008',
      name: 'Đỗ Quang',
      email: 'd.quang@vcb.com',
      role: 'MEMBER',
      status: 'TRANSFERRED',
      currentLevel: 'biet_viec',
      currentStar: 2,
    },
    [MOCK_TEAM_NS02]
  ),
]

function statusFilter(f: EmployeeFilters['status']): EmployeeEntity['status'] | undefined {
  if (!f) return undefined
  const map: Record<string, EmployeeEntity['status']> = {
    active: 'ACTIVE',
    inactive: 'INACTIVE',
    probation: 'PROBATION',
    reserved: 'RESERVED',
    transferred: 'TRANSFERRED',
  }
  return map[f]
}

export function getMockEmployees(filters: EmployeeFilters): {
  data: EmployeeEntity[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  statusCounts: {
    ACTIVE: number
    INACTIVE: number
    PROBATION: number
    RESERVED: number
    TRANSFERRED: number
  }
} {
  let list = [...rows]
  if (filters.teamId) {
    list = list.filter((e) => e.teamIds.includes(filters.teamId!))
  }
  if (filters.roles?.trim()) {
    const rs = new Set(
      filters.roles
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    )
    list = list.filter((e) => rs.has(e.role))
  } else if (filters.role) {
    list = list.filter((e) => e.role === filters.role)
  }
  const st = statusFilter(filters.status)
  if (st) list = list.filter((e) => e.status === st)
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase()
    list = list.filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
  }
  const total = list.length
  const pageSize = Math.min(200, Math.max(1, filters.pageSize || 20))
  const page = Math.max(1, filters.page || 1)
  const start = (page - 1) * pageSize
  const data = list.slice(start, start + pageSize)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const statusCounts = { ACTIVE: 0, INACTIVE: 0, PROBATION: 0, RESERVED: 0, TRANSFERRED: 0 }
  for (const e of list) statusCounts[e.status]++
  return { data, total, page, pageSize, totalPages, statusCounts }
}

export function getMockEmployeeById(id: string): EmployeeEntity | undefined {
  return rows.find((e) => e.id === id)
}

export function mockDeactivateEmployee(id: string): EmployeeEntity | undefined {
  const i = rows.findIndex((e) => e.id === id)
  if (i < 0) return undefined
  const now = new Date().toISOString()
  rows[i] = { ...rows[i]!, status: 'INACTIVE', updatedAt: now }
  return rows[i]
}

export function mockPatchEmployee(
  id: string,
  patch: PatchEmployeeInput
): EmployeeEntity | undefined {
  const i = rows.findIndex((e) => e.id === id)
  if (i < 0) return undefined
  const now = new Date().toISOString()
  const cur = rows[i]!
  const next: EmployeeEntity = { ...cur, updatedAt: now }
  if (patch.name !== undefined) next.name = patch.name.trim()
  if (patch.email !== undefined) next.email = patch.email.trim()
  if (patch.role !== undefined) next.role = patch.role
  if (patch.departmentId !== undefined) {
    next.departmentId = patch.departmentId
    next.departmentName = DEPT_NAME
  }
  if (patch.teamId !== undefined) {
    next.teamIds = [patch.teamId, ...cur.teamIds.slice(1)]
    next.teamNames = next.teamIds.map(teamLabelForMock)
  }
  if (patch.extraTeamIds !== undefined) {
    const primary = next.teamIds[0] ?? MOCK_TEAM_NS01
    next.teamIds = [primary, ...patch.extraTeamIds.filter((id) => id !== primary)]
    next.teamNames = next.teamIds.map(teamLabelForMock)
  }
  if (patch.status !== undefined) next.status = patch.status
  if (patch.phone !== undefined) next.phone = patch.phone.trim() || null
  if (patch.birthDate !== undefined) next.birthDate = patch.birthDate.trim() || null
  if (patch.directManager !== undefined) next.directManager = patch.directManager?.trim() || null
  if (patch.startDate !== undefined) next.startDate = patch.startDate.trim() || null
  if (patch.currentLevel !== undefined) next.currentLevel = patch.currentLevel
  rows[i] = next
  return next
}

/** Hồ sơ đầy đủ (`GET/PATCH /employees/hr/:id`) — chỉ lưu phần đã chỉnh sửa, phần còn lại suy ra từ `rows`. */
const profileOverrides = new Map<string, Partial<MeUserSelf>>()

function buildMockProfile(e: EmployeeEntity): MeUserSelf {
  return {
    role: e.role,
    id: e.id,
    larkRecordId: `mock-${e.id}`,
    email: e.email,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    lastSyncedAt: e.updatedAt,
    startDateWork: e.startDate ?? null,
    employmentStatus: e.status,
    fullNameLegal: e.name,
    displayName: e.name,
    employeeCodePrimary: null,
    employeeCodeSecondary: null,
    contractType: e.role,
    jobTitle: null,
    teamGroup: e.teamNames?.[0] ?? null,
    departmentName: e.departmentName ?? null,
    divisionId: e.departmentId || null,
    teamId: e.teamIds[0] ?? null,
    extraTeamIds: e.teamIds.slice(1),
    teamIds: e.teamIds,
    directManager: e.directManager ?? null,
    portraitRef: e.avatarUrl ?? null,
    gender: null,
    birthDate: e.birthDate ?? null,
    phonePrimary: e.phone ?? null,
    phoneSecondary: null,
    workplaceBranch: null,
    educationLevel: null,
    addressCurrent: null,
    addressHousehold: null,
    identityDocumentInfo: null,
    maritalStatus: null,
    childrenInfo: null,
    emergencyContact1: null,
    emergencyContact2: null,
    schoolName: null,
    bankAccountInfo: null,
    vehicleInfo: null,
    hometownDetail: null,
    ethnicity: null,
    religion: null,
    familyNotes: null,
    fatherGuardianContact: null,
    motherGuardianContact: null,
    attachmentIdFront: null,
    attachmentIdBack: null,
    policyAcknowledgement: null,
    hrOfficerName: null,
    facebookUrl: null,
    socialNickname: null,
    profileReviewDate: null,
    cvAttachmentRef: null,
    notes: null,
    teamPosition: null,
    currentLearningClassName: null,
    insuranceBookNumber: null,
    managerBlockCode: null,
  }
}

export function getMockEmployeeProfileById(id: string): MeUserSelf | undefined {
  const e = getMockEmployeeById(id)
  if (!e) return undefined
  return { ...buildMockProfile(e), ...profileOverrides.get(id) }
}

export function mockUpdateEmployeeProfile(
  id: string,
  patch: Partial<MeUserSelf>
): MeUserSelf | undefined {
  const e = getMockEmployeeById(id)
  if (!e) return undefined
  const next: Partial<MeUserSelf> = {
    ...profileOverrides.get(id),
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  profileOverrides.set(id, next)
  return { ...buildMockProfile(e), ...next }
}

export function mockCreateEmployee(
  input: CreateEmployeeInput,
  meta?: CreateEmployeeMeta
): EmployeeEntity {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const teamIds = [input.teamId, ...(input.extraTeamIds ?? []).filter((id) => id !== input.teamId)]
  const row: EmployeeEntity = {
    id,
    name: input.name,
    email: input.email,
    role: input.role,
    status: 'ACTIVE',
    departmentId: input.departmentId,
    departmentName: 'Phòng ban (mock)',
    teamIds,
    teamNames: teamIds.map(teamLabelForMock),
    currentLevel: meta?.initialLevel ?? 'tap_su',
    currentStar: 0,
    phone: input.phone?.trim() || null,
    birthDate: input.birthDate?.trim() || null,
    startDate: input.startDate?.trim() || null,
    createdAt: now,
    updatedAt: now,
  }
  rows = [row, ...rows]
  return row
}
