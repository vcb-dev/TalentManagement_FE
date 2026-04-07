import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import { MOCK_MY_DASHBOARD } from '@/features/dashboard/mock/mockMyDashboard'

const levelCodeSchema = z.enum([
  'tap_su',
  'biet_viec',
  'duoc_viec',
  'dong_gop_ket_qua',
  'tuong',
])

const mePublicUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  fullNameLegal: z.string().nullable(),
  jobTitle: z.string().nullable(),
  teamGroup: z.string().nullable(),
  departmentName: z.string().nullable(),
  portraitRef: z.string().nullable(),
  phonePrimary: z.string().nullable(),
  employeeCodePrimary: z.string().nullable(),
  birthDate: z.string().nullable(),
  startDateWork: z.string().nullable(),
})

const meCareerSchema = z
  .object({
    careerLevel: levelCodeSchema,
    currentStars: z.number().int().nonnegative(),
    eligiblePromote: z.boolean(),
  })
  .nullable()

const mePromotionSchema = z.object({
  fromLevel: levelCodeSchema.nullable(),
  toLevel: levelCodeSchema,
  promotedAt: z.string(),
  note: z.string().nullable(),
})

export const meDashboardApiSchema = z.object({
  user: mePublicUserSchema,
  appProfile: z.unknown().nullable(),
  career: meCareerSchema,
  promotionHistory: z.array(mePromotionSchema),
  learningStats: z.object({
    milestonesByStatus: z.record(z.number()),
    examsByOutcome: z.record(z.number()),
  }),
})

export type MeDashboardApi = z.infer<typeof meDashboardApiSchema>

export const dashboardApi = {
  me: async () => {
    if (isMockApiEnabled()) {
      return safeParse(meDashboardApiSchema, MOCK_MY_DASHBOARD, 'GET /me/dashboard (mock)')
    }
    const res = await apiClient.get<unknown>('/me/dashboard')
    return safeParse(meDashboardApiSchema, res.data, 'GET /me/dashboard')
  },
}

