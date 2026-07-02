import { z } from 'zod'

export const examPaperQuestionTypeSchema = z.enum(['mcq', 'essay'])

export const examPaperQuestionApiSchema = z.object({
  id: z.string().uuid().optional(),
  type: examPaperQuestionTypeSchema,
  stem: z.string(),
  options: z.array(z.string()).nullable().optional(),
  correctIndex: z.number().int().nullable().optional(),
  points: z.number().int(),
  sortOrder: z.number().int(),
})

export const examPaperListItemApiSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  questions: z.array(examPaperQuestionApiSchema),
  warning: z.string().nullable().optional(),
})
