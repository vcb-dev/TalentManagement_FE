import type { EmployeeEntity } from '@/features/hr-admin/api'
import type { EmployeeFilters } from '@/features/hr-admin/types'
import type { CreateEmployeeInput } from '@/types/api'

export type CreateEmployeeMeta = {
  initialLevel?: 'tap_su' | 'biet_viec'
  secondaryTeamId?: string
}

const DEPT = '11111111-1111-4111-8111-111111111111'
const TEAM = '22222222-2222-4222-8222-222222222222'

function emp(p: Omit<EmployeeEntity, 'departmentId' | 'teamIds' | 'createdAt' | 'updatedAt'>): EmployeeEntity {
  const now = new Date().toISOString()
  return {
    ...p,
    departmentId: DEPT,
    teamIds: [TEAM],
    createdAt: now,
    updatedAt: now,
  }
}

/** Danh sách cố định — có thể chỉnh sửa trong dev. */
let rows: EmployeeEntity[] = [
  emp({
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Nguyễn Thành',
    email: 'n.thanh@vcb.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    currentLevel: 'duoc_viec',
    currentStar: 5,
  }),
  emp({
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Trần Linh',
    email: 't.linh@vcb.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    currentLevel: 'biet_viec',
    currentStar: 3,
  }),
  emp({
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Lê Minh',
    email: 'l.minh@vcb.com',
    role: 'MANAGER',
    status: 'ACTIVE',
    currentLevel: 'dong_gop_ket_qua',
    currentStar: 6,
  }),
  emp({
    id: '10000000-0000-4000-8000-000000000004',
    name: 'Phạm Hùng',
    email: 'p.hung@vcb.com',
    role: 'MEMBER',
    status: 'PROBATION',
    currentLevel: 'tap_su',
    currentStar: 0,
  }),
  emp({
    id: '10000000-0000-4000-8000-000000000005',
    name: 'Ngô An',
    email: 'n.an@vcb.com',
    role: 'MEMBER',
    status: 'RESERVED',
    currentLevel: 'biet_viec',
    currentStar: 2,
  }),
  emp({
    id: '10000000-0000-4000-8000-000000000006',
    name: 'Vũ Bình',
    email: 'v.binh@vcb.com',
    role: 'MEMBER',
    status: 'INACTIVE',
    currentLevel: 'biet_viec',
    currentStar: 0,
  }),
]

function statusFilter(f: EmployeeFilters['status']): EmployeeEntity['status'] | undefined {
  if (!f) return undefined
  const map: Record<string, EmployeeEntity['status']> = {
    active: 'ACTIVE',
    inactive: 'INACTIVE',
    probation: 'PROBATION',
    reserved: 'RESERVED',
  }
  return map[f]
}

export function getMockEmployees(filters: EmployeeFilters): {
  data: EmployeeEntity[]
  total: number
  page: number
  pageSize: number
  totalPages: number
} {
  let list = [...rows]
  if (filters.role) list = list.filter((e) => e.role === filters.role)
  const st = statusFilter(filters.status)
  if (st) list = list.filter((e) => e.status === st)
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase()
    list = list.filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
  }
  const total = list.length
  const pageSize = filters.pageSize
  const page = filters.page
  const start = (page - 1) * pageSize
  const data = list.slice(start, start + pageSize)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return { data, total, page, pageSize, totalPages }
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

export function mockCreateEmployee(input: CreateEmployeeInput, meta?: CreateEmployeeMeta): EmployeeEntity {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const teamIds = [input.teamId]
  const sec = meta?.secondaryTeamId?.trim()
  if (sec && sec.length === 36) teamIds.push(sec)
  const row: EmployeeEntity = {
    id,
    name: input.name,
    email: input.email,
    role: input.role,
    status: 'ACTIVE',
    departmentId: input.departmentId,
    teamIds,
    currentLevel: meta?.initialLevel ?? 'tap_su',
    currentStar: 0,
    createdAt: now,
    updatedAt: now,
  }
  rows = [row, ...rows]
  return row
}
