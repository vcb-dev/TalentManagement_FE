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
