import { z } from 'zod'

export const examSummaryApiSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  scheduledAt: z.string().datetime(),
  status: z.enum(['UPCOMING', 'IN_PROGRESS', 'COMPLETED']),
})

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
