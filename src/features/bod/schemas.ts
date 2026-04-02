import { z } from 'zod'

export const radarCapabilityApiSchema = z.object({
  subject: z.string(),
  A: z.number(),
  fullMark: z.number(),
})

export const headcountSummaryApiSchema = z.object({
  total: z.number(),
  byDepartment: z.array(
    z.object({
      departmentId: z.string().uuid(),
      name: z.string(),
      count: z.number(),
    })
  ),
})

export const bodStatCardsApiSchema = z.object({
  totalHeadcount: z.number(),
  totalDeltaLabel: z.string(),
  goldTierPct: z.number(),
  goldDeltaLabel: z.string(),
  diamondCount: z.number(),
  diamondSubLabel: z.string(),
  resignations: z.number(),
  turnoverLabel: z.string(),
  reserveCount: z.number(),
  reserveSubLabel: z.string(),
})

export const bodLevelRowApiSchema = z.object({
  label: z.string(),
  count: z.number(),
  pctLabel: z.string(),
  barPct: z.number(),
  barTone: z.enum(['gray', 'indigo', 'teal', 'amber', 'red']),
})

export const bodHrMovementRowApiSchema = z.object({
  label: z.string(),
  badge: z.string(),
  badgeTone: z.enum(['green', 'red', 'blue', 'amber', 'gray']),
})

export const bodDeptAlertApiSchema = z.object({
  title: z.string(),
  body: z.string(),
  tone: z.enum(['danger', 'warning', 'success']),
})

export const bodDashboardPageApiSchema = z.object({
  monthLabel: z.string(),
  stats: bodStatCardsApiSchema,
  levelRows: z.array(bodLevelRowApiSchema),
  hrMovement: z.array(bodHrMovementRowApiSchema),
  deptAlerts: z.array(bodDeptAlertApiSchema),
})
