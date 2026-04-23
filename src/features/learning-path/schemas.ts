import { z } from 'zod'

export const checklistItemApiSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  order: z.number().int(),
})

export const levelSummaryApiSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  starCount: z.number().int().nonnegative(),
})

export const checklistResponseSchema = z.object({
  items: z.array(checklistItemApiSchema),
  completedIds: z.array(z.string().uuid()),
})

export const submissionApiSchema = z.object({
  id: z.string().uuid(),
  starId: z.string(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
  fileName: z.string(),
  createdAt: z.string().datetime(),
})

export const evidenceSubmitResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
})

const levelCodeSchema = z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong'])

const scheduleSlotSchema = z.object({
  id: z.string().uuid(),
  dateIso: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  topic: z.string(),
  location: z.string().nullable(),
  attendance: z.string().optional(),
  isEvaluated: z.boolean().optional(),
})

const enrolledMemberSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  jobTitle: z.string().nullable(),
})

const enrolledClassSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  levelFrom: z.string(),
  levelTo: z.string(),
  status: z.enum(['open', 'full', 'closed']),
  examDate: z.string().datetime().nullable(),
  teacherName: z.string(),
  examQuestions: z.any().nullable().optional(),
  schedules: z.array(scheduleSlotSchema),
  members: z.array(enrolledMemberSchema),
})

/** GET /me/learning-class */
export const meEnrolledClassResponseSchema = z.object({
  enrolledClass: enrolledClassSchema.nullable(),
})

export type MeEnrolledClass = z.infer<typeof enrolledClassSchema>
export type MeEnrolledClassSchedule = z.infer<typeof scheduleSlotSchema>

export const meLearningPathSchema = z.object({
  careerLevel: levelCodeSchema,
  currentStars: z.number().int().nonnegative(),
  roadmapTopics: z
    .array(
      z.object({
        id: z.string(),
        topic: z.string(),
        levelId: levelCodeSchema,
        sortOrder: z.number().int().optional(),
        objectives: z.array(
          z.object({
            id: z.string().uuid(),
            objective: z.string(),
            rowOrder: z.number().int(),
            materialRef: z.string().nullable(),
            trainer: z.string().nullable(),
            assessment: z.string().nullable(),
          })
        ),
      })
    )
    .default([]),
  milestones: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int(),
      title: z.string(),
      description: z.string().nullable(),
      minCareerLevel: levelCodeSchema,
      status: z.enum(['locked', 'in_progress', 'done']),
      completedAt: z.string().datetime().nullable(),
    })
  ),
})
