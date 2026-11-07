import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { safeParse } from '@/lib/utils'

const levelCodeSchema = z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong'])

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
  learningClassName: z.string().nullable().optional(),
  teamPosition: z.string().nullable().optional(),
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
  nextStarTopics: z
    .array(
      z.object({
        topic: z.string(),
        objectives: z.array(z.string()),
      })
    )
    .optional(),
})

export type MyDashboardResponse = z.infer<typeof myDashboardSchema>

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const countSchema = z.number().int().nonnegative()
const bucketSchema = z.object({ key: z.string(), label: z.string(), count: countSchema })
const labelCountSchema = z.object({ label: z.string().nullable(), count: countSchema })
const attendanceSchema = z.object({ present: countSchema, late: countSchema, absent: countSchema })
/** Bài đã nộp; `waiting` = đã nộp chưa có kết quả, `other` = bảo lưu / chia tay. */
const examTallySchema = z.object({
  submitted: countSchema,
  passed: countSchema,
  retake: countSchema,
  other: countSchema,
  waiting: countSchema,
})

export const overviewSummarySchema = z.object({
  period: z.object({
    year: z.number().int(),
    startMonth: z.number().int().min(1).max(12),
    endMonth: z.number().int().min(1).max(12),
  }),
  today: isoDateSchema,
  hr: z.object({
    /** Mọi hồ sơ (kể cả đã nghỉ) — khớp "Tổng nhân sự" của trang Danh sách nhân sự khi không lọc. */
    totalProfiles: countSchema,
    /** Đúng trạng thái ACTIVE; mọi phần cơ cấu bên dưới chỉ tính nhóm này. */
    active: countSchema,
    newHires: countSchema,
    leaves: countSchema,
    /** Đã nghỉ nhưng không có ngày nghỉ — không xếp được vào tháng nào. */
    leftWithoutDate: countSchema,
    monthly: z.array(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        newHires: countSchema,
        leaves: countSchema,
      })
    ),
    byDivision: z.array(
      z.object({ id: z.string().nullable(), name: z.string(), count: countSchema })
    ),
    byTeam: z.array(
      z.object({
        id: z.string().nullable(),
        name: z.string(),
        divisionName: z.string().nullable(),
        count: countSchema,
      })
    ),
    byTeamPosition: z.array(labelCountSchema),
    byGender: z.array(labelCountSchema),
    byTenure: z.array(bucketSchema),
    byAge: z.array(bucketSchema),
    tenureMissing: countSchema,
    ageMissing: countSchema,
  }),
  learning: z.object({
    classes: z.object({
      total: countSchema,
      knowledge: countSchema,
      other: countSchema,
      open: countSchema,
      closed: countSchema,
    }),
    enrollments: countSchema,
    learners: countSchema,
    activeLearners: countSchema,
    sessions: z.object({ total: countSchema, held: countSchema, upcoming: countSchema }),
    attendance: attendanceSchema,
    exams: examTallySchema.extend({ schedules: countSchema }),
    backlog: z.object({ gradingWaiting: countSchema, registrationsPending: countSchema }),
    classRows: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum(['open', 'full', 'closed']),
        isKnowledgeWork: z.boolean(),
        kind: z.string().nullable(),
        startDate: isoDateSchema,
        endDate: isoDateSchema.nullable(),
        teacherName: z.string().nullable(),
        memberCount: countSchema,
        sessions: z.object({ total: countSchema, held: countSchema }),
        exams: countSchema,
        attendance: attendanceSchema,
        results: examTallySchema,
      })
    ),
    agenda: z.array(
      z.object({
        id: z.string(),
        classId: z.string(),
        className: z.string(),
        memberCount: countSchema,
        dateIso: isoDateSchema,
        startTime: z.string(),
        endTime: z.string(),
        topic: z.string(),
        isExam: z.boolean(),
        location: z.string().nullable(),
      })
    ),
  }),
})

export type OverviewSummary = z.infer<typeof overviewSummarySchema>

export const dashboardApi = {
  me: async () => {
    const res = await apiClient.get<unknown>('/me/dashboard')
    return safeParse(myDashboardSchema, res.data, 'GET /me/dashboard')
  },

  overviewSummary: async (year: number, startMonth: number, endMonth: number) => {
    const res = await apiClient.get<unknown>('/me/overview-summary', {
      params: { year, startMonth, endMonth },
    })
    return safeParse(overviewSummarySchema, res.data, 'GET /me/overview-summary')
  },
}
