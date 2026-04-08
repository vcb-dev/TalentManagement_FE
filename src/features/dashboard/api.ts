import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { safeParse } from '@/lib/utils'

const levelCodeSchema = z.enum([
  'tap_su',
  'biet_viec',
  'duoc_viec',
  'dong_gop_ket_qua',
  'tuong',
])

const dashboardUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  fullNameLegal: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  teamGroup: z.string().nullable().optional(),
  departmentName: z.string().nullable().optional(),
  portraitRef: z.string().nullable().optional(),
  phonePrimary: z.string().nullable().optional(),
  employeeCodePrimary: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  startDateWork: z.string().nullable().optional(),
})

const careerSchema = z
  .object({
    careerLevel: levelCodeSchema,
    currentStars: z.number().int().nonnegative(),
    eligiblePromote: z.boolean().optional(),
  })
  .nullable()
  .optional()

const promotionSchema = z.object({
  promotedAt: z.string(),
  fromLevel: levelCodeSchema.nullable().optional(),
  toLevel: levelCodeSchema,
  note: z.string().nullable().optional(),
})

const levelSourceSchema = z
  .object({
    source: z.string().nullable().optional(),
    starCount: z.number().int().nullable().optional(),
    levelExercises: z.unknown().nullable().optional(),
    snapshotAt: z.string().datetime().nullable().optional(),
  })
  .optional()

const highlightAchievementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  score: z.number().int().nullable().optional(),
  levelScope: z.string().nullable().optional(),
  achievedAt: z.string(),
})

export const myDashboardSchema = z.object({
  staffLevel: z.enum(['PROBATION', 'PROFICIENT', 'GENERAL', 'UNKNOWN']).optional(),
  levelSource: levelSourceSchema,
  user: dashboardUserSchema,
  career: careerSchema,
  promotionHistory: z.array(promotionSchema).default([]),
  highlightAchievements: z.array(highlightAchievementSchema).default([]),
})

export type MyDashboardResponse = z.infer<typeof myDashboardSchema>

export const dashboardApi = {
  me: async () => {
    const res = await apiClient.get<unknown>('/me/dashboard')
    return safeParse(myDashboardSchema, res.data, 'GET /me/dashboard')
  },
}
