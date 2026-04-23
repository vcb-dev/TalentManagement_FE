import { z } from 'zod'

export const examSummaryApiSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  scheduledAt: z.string().datetime(),
  status: z.enum(['UPCOMING', 'IN_PROGRESS', 'COMPLETED']),
})

export type ExamScheduleRow = z.infer<typeof examSummaryApiSchema>

export const examListApiSchema = z.object({
  data: z.array(examSummaryApiSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export const examResultApiSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  employeeId: z.string().uuid(),
  result: z.enum(['DAT', 'BAO_LUU', 'CHO_HOC_LAI', 'CHIA_TAY']),
  classifiedAt: z.string().datetime(),
})

export const gradeFormSchema = z.object({
  score: z.number().min(0).max(100),
  note: z.string().optional(),
})

export const examSubmissionApiSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  teamGroup: z.string().nullable().optional(),
  classId: z.string().nullable().optional(),
  answers: z.any().optional(),
  grades: z.any().optional(),
  totalScore: z.number().nullable().optional(),
  status: z.enum(['pending', 'grading', 'done']),
  graderNote: z.string().nullable().optional(),
  gradedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  learningClass: z
    .object({
      name: z.string(),
      examQuestions: z.any().nullable().optional(),
    })
    .nullable()
    .optional(),
})
