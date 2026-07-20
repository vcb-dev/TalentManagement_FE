import { z } from 'zod'

export const examPaperQuestionTypeSchema = z.enum(['mcq', 'essay'])

/** Thang điểm chấm tự luận — text tiêu chí fix cứng, chỉ % là chỉnh được (tổng 100). */
export const essayCriteriaWeightsSchema = z.object({
  ly_thuyet: z.number().int(),
  thuc_te: z.number().int(),
  trinh_bay: z.number().int(),
})

export const examPaperQuestionApiSchema = z.object({
  id: z.string().uuid().optional(),
  type: examPaperQuestionTypeSchema,
  stem: z.string(),
  options: z.array(z.string()).nullable().optional(),
  correctIndex: z.number().int().nullable().optional(),
  points: z.number().int(),
  criteriaWeights: essayCriteriaWeightsSchema.nullable().optional(),
  sortOrder: z.number().int(),
})

export const examPaperListItemApiSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  passScore: z.number().int(),
  createdByName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  mcqCount: z.number().int(),
  essayCount: z.number().int(),
  submissionCount: z.number().int(),
})

export const examPaperDetailApiSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  passScore: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  questions: z.array(examPaperQuestionApiSchema),
  warning: z.string().nullable().optional(),
})
