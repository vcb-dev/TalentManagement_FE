import { apiClient } from '@/lib/axios'
import { HR_DEPARTMENT_OPTIONS, HR_TEAM_OPTIONS } from '@/features/hr-admin/hrOrgOptions'
import { isMockApiEnabled } from '@/lib/mockEnv'
import type { Role } from '@/types/auth'

export type OrgTreeTeam = {
  id: string
  name: string
  departmentId: string
  leaderUserId: string | null
}

export type OrgTreeDepartment = {
  id: string
  name: string
  isActive: boolean
  teams: OrgTreeTeam[]
}

export type OrgTreeResponse = {
  departments: OrgTreeDepartment[]
}

/** Team row từ GET /organization/departments-with-teams */
export type OrgAdminTeamRow = {
  id: string
  name: string
  departmentId: string
  leaderUserId: string | null
  leader: {
    id: string
    displayName: string | null
    email: string | null
    employeeCodePrimary: string | null
  } | null
  _count: { memberships: number }
}

export type OrgAdminDepartmentRow = {
  id: string
  name: string
  isActive: boolean
  teams: OrgAdminTeamRow[]
}

export type TeamMemberRow = {
  userId: string
  email: string | null
  displayName: string | null
  employeeCodePrimary: string | null
  joinedAt: string
  role: Role
  status: 'ACTIVE' | 'INACTIVE' | 'PROBATION' | 'RESERVED'
  avatarUrl: string | null
  portraitRef: string | null
}

export const DEPTS_WITH_TEAMS_QUERY_KEY = ['organization', 'departments-with-teams'] as const

export function teamMembersQueryKey(teamId: string) {
  return ['organization', 'team-members', teamId] as const
}

function mockOrgTree(): OrgTreeResponse {
  const teamDeptMap: Record<string, string> = {
    '22222222-2222-4222-8222-222222222222': '11111111-1111-4111-8111-111111111111',
    '66666666-6666-4666-8666-666666666666': '11111111-1111-4111-8111-111111111111',
    '77777777-7777-4777-8777-777777777777': '22222222-2222-4222-8222-222222222221',
  }
  return {
    departments: HR_DEPARTMENT_OPTIONS.map((d) => ({
      id: d.value,
      name: d.label,
      isActive: true,
      teams: HR_TEAM_OPTIONS.filter((t) => teamDeptMap[t.value] === d.value).map((t) => ({
        id: t.value,
        name: t.label,
        departmentId: teamDeptMap[t.value] ?? d.value,
        leaderUserId: null,
      })),
    })),
  }
}

export const organizationApi = {
  getTree: async (): Promise<OrgTreeResponse> => {
    if (isMockApiEnabled()) return mockOrgTree()
    const res = await apiClient.get<OrgTreeResponse>('/organization/tree')
    return res.data
  },

  listDepartments: async () => {
    if (isMockApiEnabled()) {
      return HR_DEPARTMENT_OPTIONS.map((d) => ({
        id: d.value,
        name: d.label,
        isActive: true,
        _count: {
          teams: mockOrgTree().departments.find((x) => x.id === d.value)?.teams.length ?? 0,
        },
      }))
    }
    const res = await apiClient.get<
      {
        id: string
        name: string
        isActive: boolean
        _count: { teams: number }
      }[]
    >('/organization/departments')
    return res.data
  },

  createDepartment: async (body: { name: string }) => {
    const res = await apiClient.post<unknown>('/organization/departments', body)
    return res.data as { id: string }
  },

  patchDepartment: async (id: string, body: { name?: string; isActive?: boolean }) => {
    const res = await apiClient.patch<unknown>(`/organization/departments/${id}`, body)
    return res.data
  },

  createTeam: async (body: {
    name: string
    departmentId: string
    leaderUserId?: string | null
  }) => {
    const res = await apiClient.post<unknown>('/organization/teams', body)
    return res.data as { id: string }
  },

  patchTeam: async (id: string, body: { name?: string; leaderUserId?: string | null }) => {
    const res = await apiClient.patch<unknown>(`/organization/teams/${id}`, body)
    return res.data
  },

  setTeamMembers: async (teamId: string, userIds: string[]) => {
    const res = await apiClient.post<unknown>(`/organization/teams/${teamId}/members`, {
      userIds,
    })
    return res.data as { teamId: string; memberCount: number }
  },

  listDepartmentsWithTeams: async (): Promise<OrgAdminDepartmentRow[]> => {
    if (isMockApiEnabled()) {
      const tree = mockOrgTree()
      return tree.departments.map((d) => ({
        id: d.id,
        name: d.name,
        isActive: d.isActive,
        teams: d.teams.map((t) => ({
          id: t.id,
          name: t.name,
          departmentId: t.departmentId,
          leaderUserId: t.leaderUserId,
          leader: null,
          _count: { memberships: 0 },
        })),
      }))
    }
    const res = await apiClient.get<OrgAdminDepartmentRow[]>('/organization/departments-with-teams')
    return res.data
  },

  getTeamMembers: async (teamId: string): Promise<{ teamId: string; members: TeamMemberRow[] }> => {
    if (isMockApiEnabled()) {
      return { teamId, members: [] }
    }
    const res = await apiClient.get<{ teamId: string; members: TeamMemberRow[] }>(
      `/organization/teams/${teamId}/members`
    )
    return res.data
  },

  addTeamMembers: async (teamId: string, userIds: string[]) => {
    if (isMockApiEnabled()) throw new Error('Mock: không thêm thành viên')
    const res = await apiClient.post<{ teamId: string; added: number }>(
      `/organization/teams/${teamId}/members/add`,
      { userIds }
    )
    return res.data
  },

  removeTeamMembers: async (teamId: string, userIds: string[]) => {
    if (isMockApiEnabled()) throw new Error('Mock')
    const res = await apiClient.post<{ teamId: string; removed: number }>(
      `/organization/teams/${teamId}/members/remove`,
      { userIds }
    )
    return res.data
  },
}
