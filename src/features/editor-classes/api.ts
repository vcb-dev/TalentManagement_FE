import { apiClient } from '@/lib/axios'
import { safeParse } from '@/lib/utils'
import {
  bulkExamScheduleResultApiSchema,
  editorClassListItemApiSchema,
  editorClassSyncReportApiSchema,
} from './schemas'
import { z } from 'zod'

export type BulkExamScheduleInput = {
  dateIso: string
  startTime: string
  endTime: string
  topic?: string
  location?: string | null
  paperIds?: string[]
  durationMinutes?: number
  dryRun?: boolean
}

export const editorClassesApi = {
  list: async () => {
    const res = await apiClient.get<unknown>('/manager/editor-classes')
    return safeParse(z.array(editorClassListItemApiSchema), res.data, 'GET /manager/editor-classes')
  },

  sync: async (dryRun?: boolean) => {
    const res = await apiClient.post<unknown>('/manager/editor-classes/sync', { dryRun })
    return safeParse(editorClassSyncReportApiSchema, res.data, 'POST /manager/editor-classes/sync')
  },

  bulkExamSchedules: async (input: BulkExamScheduleInput) => {
    const res = await apiClient.post<unknown>('/manager/editor-classes/exam-schedules/bulk', input)
    return safeParse(
      bulkExamScheduleResultApiSchema,
      res.data,
      'POST /manager/editor-classes/exam-schedules/bulk'
    )
  },
}
