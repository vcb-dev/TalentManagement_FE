import { z } from 'zod'

export const teamMemberProgressApiSchema = z.object({
  employeeId: z.string().uuid(),
  name: z.string(),
  currentLevel: z.string(),
  currentStar: z.number(),
  completionPercent: z.number(),
  initials: z.string().optional(),
  roleLabel: z.string().optional(),
  starLabel: z.string().optional(),
  starMax: z.number().optional(),
  statusLabel: z.string().optional(),
  statusVariant: z.enum(['success', 'warning', 'info', 'danger', 'neutral']).optional(),
  updatedLabel: z.string().optional(),
  rowTone: z.enum(['default', 'success', 'danger']).optional(),
  avatarClass: z.string().optional(),
  progressBarVariant: z.enum(['indigo', 'teal', 'amber', 'red']).optional(),
})

export const teamProgressSummaryApiSchema = z.object({
  totalMembers: z.number(),
  eligibleExam: z.number(),
  onTrack: z.number(),
  onTrackPct: z.number(),
  behind: z.number(),
})

export const teamOptionApiSchema = z.object({
  id: z.string(),
  label: z.string(),
})

export const teamProgressPageApiSchema = z.object({
  summary: teamProgressSummaryApiSchema,
  members: z.array(teamMemberProgressApiSchema),
  teams: z.array(teamOptionApiSchema).optional(),
})

export const approvalItemApiSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['PROMOTION', 'SUBMISSION', 'LEAVE']),
  requesterName: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  createdAt: z.string().datetime(),
})

export const promotionBadgeApiSchema = z.object({
  label: z.string(),
  tone: z.enum(['success', 'neutral', 'warning', 'danger', 'info']),
})

export const promotionRequestApiSchema = z.object({
  id: z.string().uuid(),
  initials: z.string().optional(),
  avatarClass: z.string().optional(),
  name: z.string(),
  description: z.string(),
  badges: z.array(promotionBadgeApiSchema),
  state: z.enum(['actionable', 'waiting', 'done']),
  stateLabel: z.string().optional(),
  highlighted: z.boolean().optional(),
})

export const graderReviewRowApiSchema = z.object({
  id: z.string().uuid(),
  employeeName: z.string(),
  detail: z.string(),
  graderVerdict: z.enum(['pass', 'fail']),
})

export const approvalsPageApiSchema = z.object({
  pendingCount: z.number(),
  promotions: z.array(promotionRequestApiSchema),
  graderReviews: z.array(graderReviewRowApiSchema),
})

export const kpiMonthlyApiSchema = z.object({
  month: z.string(),
  metrics: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
      target: z.number(),
    })
  ),
})

export const managerClassMemberApiSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  joinedAt: z.string().datetime(),
})

export const managerClassScheduleApiSchema = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid(),
  dateIso: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  topic: z.string(),
  location: z.string().nullable(),
  isExam: z.boolean().optional(),
  examTeacherUserId: z.string().uuid().nullable().optional(),
  examTeacherName: z.string().nullable().optional(),
  examStatus: z.string().nullable().optional(),
  examQuestions: z.any().nullable().optional(),
  materialRef: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  isNew: z.boolean().optional(),
})

export const managerClassApiSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  kind: z.string().nullable().optional(),
  isKnowledgeWork: z.boolean().optional(),
  levelFrom: z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong']),
  levelTo: z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong']),
  status: z.enum(['open', 'full', 'closed']),
  capacity: z.number().int().nullable(),
  examDate: z.string().datetime().nullable(),
  teacher: z
    .object({
      userId: z.string().uuid(),
      name: z.string(),
      email: z.string(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  memberCount: z.number().int().nonnegative(),
  members: z.array(managerClassMemberApiSchema),
  examQuestions: z.any().nullable(),
  schedules: z.array(managerClassScheduleApiSchema).optional(),
})

export const managerClassCreateResponseSchema = z.object({
  id: z.string().uuid(),
})

export const managerClassActionResponseSchema = z.object({
  ok: z.boolean(),
})

export const managerMemberOptionApiSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string(),
})

export const managerRoadmapItemApiSchema = z.object({
  id: z.string().uuid(),
  levelLabel: z.string(),
  topic: z.string(),
  objective: z.string(),
  materialRef: z.string().nullable(),
  trainer: z.string().nullable(),
  assessment: z.string().nullable(),
  sourceFile: z.string(),
  sheetName: z.string(),
  rowOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const managerRoadmapItemCreateResponseSchema = z.object({
  id: z.string().uuid(),
})

export const orgItemApiSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export const orgCreateResponseApiSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
})

export const managerSubmissionApiSchema = z.object({
  id: z.string(),
  userName: z.string(),
  team: z.string().nullish(),
  level: z.string().nullish(),
  topic: z.string(),
  objective: z.string(),
  fileName: z.string().optional(),
  fileRef: z.string().optional(),
  url: z.string().optional(),
  fileMissing: z.boolean().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'GRADED']),
  score: z.number().nullish(),
  managerComment: z.string().nullish(),
  hostComment: z.string().nullish(),
  createdAt: z.string().datetime(),
})
