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
