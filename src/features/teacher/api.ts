import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { safeParse } from '@/lib/utils'
import {
  teacherClassApiSchema,
  teacherClassDetailApiSchema,
  teacherGradeResponseSchema,
} from './schemas'

export const teacherApi = {
  classes: async () => {
    const res = await apiClient.get<unknown>('/teacher/classes')
    return safeParse(z.array(teacherClassApiSchema), res.data, 'GET /teacher/classes')
  },

  classDetail: async (classId: string) => {
    const res = await apiClient.get<unknown>(`/teacher/classes/${classId}`)
    return safeParse(teacherClassDetailApiSchema, res.data, 'GET /teacher/classes/:id')
  },

  grade: async (classId: string, input: { userId: string; outcome: 'DAT' | 'BAO_LUU' | 'CHO_HOC_LAI' | 'CHIA_TAY'; score?: number | null; note?: string | null }) => {
    const res = await apiClient.post<unknown>(`/teacher/classes/${classId}/grade`, input)
    return safeParse(teacherGradeResponseSchema, res.data, 'POST /teacher/classes/:id/grade')
  },
}
