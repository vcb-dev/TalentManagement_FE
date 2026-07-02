import { z } from 'zod'

export const learningMaterialApiSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  url: z.string().nullable(),
  fileRef: z.string().nullable(),
  note: z.string().nullable(),
  classId: z.string().uuid().nullable(),
  className: z.string().nullable(),
  appliesToAllEditorClasses: z.boolean(),
  createdByName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
