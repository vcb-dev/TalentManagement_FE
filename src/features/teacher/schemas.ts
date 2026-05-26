import { z } from 'zod'

export const teacherClassApiSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  levelFrom: z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong']),
  levelTo: z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong']),
  examDate: z.string().datetime().nullable(),
  status: z.enum(['open', 'full', 'closed']),
  memberCount: z.number().int().nonnegative(),
  pendingRegistrationCount: z.number().int().nonnegative().optional(),
})

export const teacherClassMemberApiSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  latestResult: z
    .object({
      outcome: z.enum(['DAT', 'BAO_LUU', 'CHO_HOC_LAI', 'CHIA_TAY']),
      score: z.number().nullable(),
      gradedAt: z.string().datetime(),
      note: z.string().nullable(),
    })
    .nullable(),
})

export const teacherClassDetailApiSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  levelFrom: z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong']),
  levelTo: z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong']),
  examDate: z.string().datetime().nullable(),
  members: z.array(teacherClassMemberApiSchema),
})

export const teacherGradeResponseSchema = z.object({
  id: z.string().uuid(),
})

export const teacherClassScheduleApiSchema = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid(),
  dateIso: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  topic: z.string(),
  location: z.string().nullable(),
  attendanceData: z.record(z.string(), z.any()).nullable().optional(),
  evaluatedUserIds: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const teacherClassRegistrationApiSchema = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.string(),
  reason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  user: z.object({
    userId: z.string().uuid(),
    name: z.string(),
    email: z.string(),
    jobTitle: z.string().nullable(),
  }),
})
