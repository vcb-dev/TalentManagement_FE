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
  return {
    departments: HR_DEPARTMENT_OPTIONS.map((d) => ({
      id: d.value,
      name: d.label,
      isActive: true,
      teams: HR_TEAM_OPTIONS.filter((t) => t.departmentId === d.value).map((t) => ({
        id: t.value,
        name: t.label,
        departmentId: t.departmentId,
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
}
