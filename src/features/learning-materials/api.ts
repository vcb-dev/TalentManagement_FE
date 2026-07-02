import { apiClient } from '@/lib/axios'
import { safeParse } from '@/lib/utils'
import { learningMaterialApiSchema } from './schemas'
import { z } from 'zod'

export type LearningMaterialInput = {
  title: string
  url?: string | null
  fileRef?: string | null
  note?: string | null
  classId?: string | null
}

export const learningMaterialsApi = {
  listForManager: async () => {
    const res = await apiClient.get<unknown>('/manager/learning-materials')
    return safeParse(
      z.array(learningMaterialApiSchema),
      res.data,
      'GET /manager/learning-materials'
    )
  },

  listMine: async () => {
    const res = await apiClient.get<unknown>('/learning-materials/my')
    return safeParse(z.array(learningMaterialApiSchema), res.data, 'GET /learning-materials/my')
  },

  create: async (input: LearningMaterialInput) => {
    const res = await apiClient.post<unknown>('/manager/learning-materials', input)
    return safeParse(learningMaterialApiSchema, res.data, 'POST /manager/learning-materials')
  },

  update: async (id: string, input: Partial<LearningMaterialInput>) => {
    const res = await apiClient.patch<unknown>(`/manager/learning-materials/${id}`, input)
    return safeParse(learningMaterialApiSchema, res.data, 'PATCH /manager/learning-materials/:id')
  },

  remove: async (id: string) => {
    await apiClient.delete<unknown>(`/manager/learning-materials/${id}`)
  },

  upload: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.post<{ fileUrl: string; fileName: string }>(
      '/manager/learning-materials/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data
  },
}
