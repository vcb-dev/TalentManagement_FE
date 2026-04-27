import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { formatViDate } from '@/lib/date'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import { MOCK_APPROVALS_PAGE } from '@/features/manager/mock/mockManagerApprovals'
import { MOCK_TEAM_PROGRESS_PAGE } from '@/features/manager/mock/mockTeamProgress'
import {
  approvalItemApiSchema,
  approvalsPageApiSchema,
  kpiMonthlyApiSchema,
  managerClassActionResponseSchema,
  managerClassApiSchema,
  managerClassCreateResponseSchema,
  managerMemberOptionApiSchema,
  managerRoadmapItemApiSchema,
  managerRoadmapItemCreateResponseSchema,
  managerClassScheduleApiSchema,
  teamMemberProgressApiSchema,
  teamProgressPageApiSchema,
  teamProgressSummaryApiSchema,
  orgItemApiSchema,
  orgCreateResponseApiSchema,
  managerSubmissionApiSchema,
} from './schemas'

function computeSummaryFromMembers(
  members: z.infer<typeof teamMemberProgressApiSchema>[]
): z.infer<typeof teamProgressSummaryApiSchema> {
  const totalMembers = members.length
  const eligibleExam = members.filter((m) => /đủ|ĐK/i.test(m.statusLabel ?? '')).length
  const behind = members.filter(
    (m) => m.rowTone === 'danger' || /bảo lưu/i.test(m.statusLabel ?? '')
  ).length
  const onTrack = members.filter(
    (m) => (m.completionPercent ?? 0) >= 50 && m.rowTone !== 'danger'
  ).length
  const onTrackPct = totalMembers ? Math.round((onTrack / totalMembers) * 1000) / 10 : 0
  return { totalMembers, eligibleExam, onTrack, onTrackPct, behind }
}

function legacyInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? '?'
    const b = parts[parts.length - 1]?.[0] ?? '?'
    return (a + b).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function legacyApprovalsToPage(
  rows: z.infer<typeof approvalItemApiSchema>[]
): z.infer<typeof approvalsPageApiSchema> {
  const typeLabel: Record<string, string> = {
    PROMOTION: 'Thăng cấp',
    SUBMISSION: 'Nộp bài',
    LEAVE: 'Nghỉ phép',
  }
  const pending = rows.filter((r) => r.status === 'PENDING')
  return {
    pendingCount: pending.length,
    promotions: rows.map((r) => ({
      id: r.id,
      initials: legacyInitials(r.requesterName),
      name: r.requesterName,
      description: `${typeLabel[r.type] ?? r.type} · ${formatViDate(r.createdAt)}`,
      badges: [
        {
          label:
            r.status === 'PENDING' ? 'Chờ duyệt' : r.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối',
          tone: r.status === 'PENDING' ? ('warning' as const) : ('neutral' as const),
        },
      ],
      state: r.status === 'PENDING' ? ('actionable' as const) : ('done' as const),
      highlighted: r.status === 'PENDING',
    })),
    graderReviews: [],
  }
}

export const managerApi = {
  teamProgress: async (teamId?: string) => {
    if (isMockApiEnabled()) {
      void teamId
      return safeParse(
        teamProgressPageApiSchema,
        MOCK_TEAM_PROGRESS_PAGE,
        'GET team-progress (mock)'
      )
    }
    const res = await apiClient.get<unknown>('/manager/team-progress', { params: { teamId } })
    const raw = res.data
    if (Array.isArray(raw)) {
      const members = safeParse(
        z.array(teamMemberProgressApiSchema),
        raw,
        'GET team-progress members'
      )
      return safeParse(
        teamProgressPageApiSchema,
        { summary: computeSummaryFromMembers(members), members },
        'GET team-progress wrapped'
      )
    }
    return safeParse(teamProgressPageApiSchema, raw, 'GET team-progress')
  },

  approvals: async () => {
    if (isMockApiEnabled()) {
      return safeParse(approvalsPageApiSchema, MOCK_APPROVALS_PAGE, 'GET approvals (mock)')
    }
    const res = await apiClient.get<unknown>('/manager/approvals')
    console.log('[FE API] Approvals Response:', res.data)

    if (res.data && typeof res.data === 'object' && 'promotions' in res.data) {
      return safeParse(approvalsPageApiSchema, res.data, 'GET approvals wrapper')
    }
    // Fallback if legacy
    if (Array.isArray(res.data)) {
      const rows = safeParse(z.array(approvalItemApiSchema), res.data, 'GET approvals legacy')
      return safeParse(approvalsPageApiSchema, legacyApprovalsToPage(rows), 'GET approvals wrapped')
    }
    return safeParse(approvalsPageApiSchema, res.data, 'GET approvals')
  },

  kpiMonthly: async (month: string) => {
    const res = await apiClient.get<unknown>('/manager/kpi', { params: { month } })
    return safeParse(kpiMonthlyApiSchema, res.data, 'GET kpi')
  },

  allExams: async () => {
    const res = await apiClient.get<unknown>('/manager/classes/all-exams')
    return safeParse(
      z.array(managerClassScheduleApiSchema.extend({ className: z.string() })),
      res.data,
      'GET /manager/classes/all-exams'
    )
  },

  classes: async (params?: { search?: string; levelFrom?: string; status?: string }) => {
    const res = await apiClient.get<unknown>('/manager/classes', { params })
    return safeParse(z.array(managerClassApiSchema), res.data, 'GET /manager/classes')
  },

  createClass: async (input: {
    name: string
    levelFrom?: string
    levelTo?: string
    status?: string
    capacity?: number | null
    examDate?: string | null
    memberUserIds?: string[]
    teacherUserId?: string | null
  }) => {
    const res = await apiClient.post<unknown>('/manager/classes', input)
    return safeParse(managerClassCreateResponseSchema, res.data, 'POST /manager/classes')
  },

  updateClass: async (
    classId: string,
    input: {
      name?: string
      status?: string
      capacity?: number | null
      examDate?: string | null
      teacherUserId?: string | null
    }
  ) => {
    const res = await apiClient.patch<unknown>(`/manager/classes/${classId}`, input)
    return safeParse(managerClassActionResponseSchema, res.data, 'PATCH /manager/classes/:id')
  },

  deleteClass: async (classId: string) => {
    const res = await apiClient.delete<unknown>(`/manager/classes/${classId}`)
    return safeParse(managerClassActionResponseSchema, res.data, 'DELETE /manager/classes/:id')
  },

  memberOptions: async (query: string, levelFrom?: string, excludeUserId?: string) => {
    const res = await apiClient.get<unknown>('/manager/classes/member-options', {
      params: { query, levelFrom, excludeUserId: excludeUserId || undefined },
    })
    return safeParse(
      z.array(managerMemberOptionApiSchema),
      res.data,
      'GET /manager/classes/member-options'
    )
  },

  teacherOptions: async (query: string) => {
    const res = await apiClient.get<unknown>('/manager/classes/teacher-options', {
      params: { query },
    })
    return safeParse(
      z.array(managerMemberOptionApiSchema),
      res.data,
      'GET /manager/classes/teacher-options'
    )
  },

  addClassMember: async (classId: string, userId: string) => {
    const res = await apiClient.post<unknown>(`/manager/classes/${classId}/members`, { userId })
    return safeParse(
      managerClassActionResponseSchema,
      res.data,
      'POST /manager/classes/:id/members'
    )
  },

  removeClassMember: async (classId: string, userId: string) => {
    const res = await apiClient.delete<unknown>(`/manager/classes/${classId}/members/${userId}`)
    return safeParse(
      managerClassActionResponseSchema,
      res.data,
      'DELETE /manager/classes/:id/members/:userId'
    )
  },

  roadmapItems: async (params?: { levelLabel?: string; topic?: string; q?: string }) => {
    const res = await apiClient.get<unknown>('/manager/roadmap-items', { params })
    return safeParse(z.array(managerRoadmapItemApiSchema), res.data, 'GET /manager/roadmap-items')
  },

  createRoadmapItem: async (input: {
    levelLabel: string
    topic: string
    objective: string
    materialRef?: string | null
    trainer?: string | null
    assessment?: string | null
    rowOrder?: number | null
  }) => {
    const res = await apiClient.post<unknown>('/manager/roadmap-items', input)
    return safeParse(
      managerRoadmapItemCreateResponseSchema,
      res.data,
      'POST /manager/roadmap-items'
    )
  },

  updateRoadmapItem: async (
    id: string,
    input: {
      levelLabel?: string
      topic?: string
      objective?: string
      materialRef?: string | null
      trainer?: string | null
      assessment?: string | null
      rowOrder?: number | null
    }
  ) => {
    const res = await apiClient.patch<unknown>(`/manager/roadmap-items/${id}`, input)
    return safeParse(managerClassActionResponseSchema, res.data, 'PATCH /manager/roadmap-items/:id')
  },

  deleteRoadmapItem: async (id: string) => {
    const res = await apiClient.delete<unknown>(`/manager/roadmap-items/${id}`)
    return safeParse(
      managerClassActionResponseSchema,
      res.data,
      'DELETE /manager/roadmap-items/:id'
    )
  },

  classSchedules: async (classId: string) => {
    const res = await apiClient.get<unknown>(`/manager/classes/${classId}/schedules`)
    return safeParse(
      z.array(managerClassScheduleApiSchema),
      res.data,
      'GET /manager/classes/:id/schedules'
    )
  },

  createClassSchedule: async (
    classId: string,
    input: {
      dateIso: string
      startTime: string
      endTime: string
      topic: string
      location?: string | null
      isExam?: boolean
      examTeacherUserId?: string | null
      examStatus?: string | null
    }
  ) => {
    const res = await apiClient.post<unknown>(`/manager/classes/${classId}/schedules`, input)
    return safeParse(
      managerClassCreateResponseSchema,
      res.data,
      'POST /manager/classes/:id/schedules'
    )
  },

  updateClassSchedule: async (
    classId: string,
    scheduleId: string,
    input: {
      dateIso?: string
      startTime?: string
      endTime?: string
      topic?: string
      location?: string | null
      isExam?: boolean
      examTeacherUserId?: string | null
      examStatus?: string | null
    }
  ) => {
    const res = await apiClient.patch<unknown>(
      `/manager/classes/${classId}/schedules/${scheduleId}`,
      input
    )
    return safeParse(
      managerClassActionResponseSchema,
      res.data,
      'PATCH /manager/classes/:id/schedules/:scheduleId'
    )
  },

  deleteClassSchedule: async (classId: string, scheduleId: string) => {
    const res = await apiClient.delete<unknown>(
      `/manager/classes/${classId}/schedules/${scheduleId}`
    )
    return safeParse(
      managerClassActionResponseSchema,
      res.data,
      'DELETE /manager/classes/:id/schedules/:scheduleId'
    )
  },

  getDepartments: async () => {
    const res = await apiClient.get<unknown>('/org/departments')
    return safeParse(z.array(orgItemApiSchema), res.data, 'GET /org/departments')
  },
  createDepartment: async (name: string) => {
    const res = await apiClient.post<unknown>('/org/departments', { name })
    return safeParse(orgCreateResponseApiSchema, res.data, 'POST /org/departments')
  },
  updateDepartment: async (id: string, name: string) => {
    const res = await apiClient.patch<unknown>(`/org/departments/${id}`, { name })
    return safeParse(orgItemApiSchema, res.data, 'PATCH /org/departments/:id')
  },
  deleteDepartment: async (id: string) => {
    const res = await apiClient.delete<unknown>(`/org/departments/${id}`)
    return safeParse(orgItemApiSchema, res.data, 'DELETE /org/departments/:id')
  },

  getTeams: async () => {
    const res = await apiClient.get<unknown>('/org/teams')
    return safeParse(z.array(orgItemApiSchema), res.data, 'GET /org/teams')
  },
  createTeam: async (name: string, divisionId: string) => {
    const res = await apiClient.post<unknown>('/org/teams', { name, divisionId })
    return safeParse(orgCreateResponseApiSchema, res.data, 'POST /org/teams')
  },
  updateTeam: async (id: string, body: { name?: string; divisionId?: string }) => {
    const res = await apiClient.patch<unknown>(`/org/teams/${id}`, body)
    return safeParse(orgItemApiSchema, res.data, 'PATCH /org/teams/:id')
  },
  deleteTeam: async (id: string) => {
    const res = await apiClient.delete<unknown>(`/org/teams/${id}`)
    return safeParse(orgItemApiSchema, res.data, 'DELETE /org/teams/:id')
  },

  saveExamQuestions: async (classId: string, questions: any) => {
    const res = await apiClient.patch<unknown>(
      `/manager/classes/${classId}/exam-questions`,
      questions
    )
    return safeParse(
      managerClassActionResponseSchema,
      res.data,
      'PATCH /manager/classes/:id/exam-questions'
    )
  },
  allSubmissions: async () => {
    const res = await apiClient.get<unknown>('/learning/admin/submissions')
    return safeParse(
      z.array(managerSubmissionApiSchema),
      res.data,
      'GET /learning/admin/submissions'
    )
  },
  updateSubmissionStatus: async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    const res = await apiClient.patch<unknown>(`/learning/admin/submissions/${id}`, { status })
    return res.data
  },
}
