import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'

export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED'

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  ACTIVE: 'Đang chạy',
  PAUSED: 'Tạm dừng',
  COMPLETED: 'Đã kết thúc',
}

/** Tạm ẩn "Vai trò trong dự án" — dữ liệu BE vẫn giữ. */
export const SHOW_PROJECT_ROLE = false

export type ProjectEntity = {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  activeMemberCount: number
  createdAt: string
  updatedAt: string
}

export type EmployeeProjectMembership = {
  id: string
  projectId: string
  projectName: string
  projectStatus: ProjectStatus
  roleInProject: string | null
  joinedAt: string | null
  leftAt: string | null
  note: string | null
  isActive: boolean
  assignedByName: string | null
  updatedAt: string
}

export type ProjectMember = {
  membershipId: string
  userId: string
  name: string
  email: string | null
  avatarUrl: string | null
  employeeCode: string | null
  jobTitle: string | null
  teamName: string | null
  departmentName: string | null
  isEmployeeInactive: boolean
  roleInProject: string | null
  joinedAt: string | null
  leftAt: string | null
  note: string | null
  isActive: boolean
}

export type CreateProjectInput = {
  name: string
  description?: string | null
  status?: ProjectStatus
  startDate?: string | null
  endDate?: string | null
}

export type ProjectMembershipInput = {
  projectId: string
  roleInProject: string | null
  joinedAt: string | null
  leftAt: string | null
  note: string | null
}

export type AddProjectMembersInput = {
  userIds: string[]
  roleInProject?: string | null
  joinedAt: string | null
  note: string | null
}

function mockUnsupported(): never {
  throw new Error('Chế độ mock chưa hỗ trợ quản lý dự án')
}

export const projectApi = {
  list: async () => {
    if (isMockApiEnabled()) return [] as ProjectEntity[]
    const res = await apiClient.get<ProjectEntity[]>('/projects')
    return res.data
  },

  create: async (input: CreateProjectInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<ProjectEntity>('/projects', input)
    return res.data
  },

  update: async (id: string, input: Partial<CreateProjectInput>) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.patch<ProjectEntity>(`/projects/${id}`, input)
    return res.data
  },

  /** BE chỉ cho xoá dự án chưa từng có ai tham gia. */
  remove: async (id: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.delete<{ id: string }>(`/projects/${id}`)
    return res.data
  },

  listMembers: async (projectId: string) => {
    if (isMockApiEnabled()) return [] as ProjectMember[]
    const res = await apiClient.get<ProjectMember[]>(`/projects/${projectId}/members`)
    return res.data
  },

  /** BE từ chối cả lô nếu có người đã trong dự án. */
  addMembers: async (projectId: string, input: AddProjectMembersInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<{ addedCount: number }>(
      `/projects/${projectId}/members`,
      input
    )
    return res.data
  },

  listForEmployee: async (employeeId: string) => {
    if (isMockApiEnabled()) return [] as EmployeeProjectMembership[]
    const res = await apiClient.get<EmployeeProjectMembership[]>(
      `/employees/hr/${employeeId}/projects`
    )
    return res.data
  },

  assign: async (employeeId: string, input: ProjectMembershipInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<EmployeeProjectMembership>(
      `/employees/hr/${employeeId}/projects`,
      input
    )
    return res.data
  },

  updateMembership: async (
    employeeId: string,
    membershipId: string,
    input: Partial<ProjectMembershipInput>
  ) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.patch<EmployeeProjectMembership>(
      `/employees/hr/${employeeId}/projects/${membershipId}`,
      input
    )
    return res.data
  },

  removeMembership: async (employeeId: string, membershipId: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.delete<{ id: string }>(
      `/employees/hr/${employeeId}/projects/${membershipId}`
    )
    return res.data
  },
}
