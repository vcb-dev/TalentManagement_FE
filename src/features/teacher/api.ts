import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { safeParse } from '@/lib/utils'
import {
  teacherClassApiSchema,
  teacherClassDetailApiSchema,
  teacherClassScheduleApiSchema,
  teacherClassRegistrationApiSchema,
  teacherRoadmapItemApiSchema,
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

  grade: async (
    classId: string,
    input: {
      userId: string
      outcome: 'DAT' | 'BAO_LUU' | 'CHO_HOC_LAI' | 'CHIA_TAY'
      score?: number | null
      note?: string | null
    }
  ) => {
    const res = await apiClient.post<unknown>(`/teacher/classes/${classId}/grade`, input)
    return safeParse(teacherGradeResponseSchema, res.data, 'POST /teacher/classes/:id/grade')
  },

  schedules: async (classId: string) => {
    const res = await apiClient.get<unknown>(`/teacher/classes/${classId}/schedules`)
    return safeParse(
      z.array(teacherClassScheduleApiSchema),
      res.data,
      'GET /teacher/classes/:id/schedules'
    )
  },

  roadmapItems: async (classId: string) => {
    const res = await apiClient.get<unknown>(`/teacher/classes/${classId}/roadmap-items`)
    return safeParse(
      z.array(teacherRoadmapItemApiSchema),
      res.data,
      'GET /teacher/classes/:id/roadmap-items'
    )
  },

  createSchedule: async (
    classId: string,
    input: {
      dateIso: string
      startTime: string
      endTime: string
      topic: string
      location?: string | null
      roadmapItemIds: string[]
      roadmapItemDeadlines?: Record<string, string>
      isExam?: boolean
      examQuestions?: any
      materialRef?: string | null
      note?: string | null
    }
  ) => {
    const res = await apiClient.post<unknown>(`/teacher/classes/${classId}/schedules`, input)
    return safeParse(teacherGradeResponseSchema, res.data, 'POST /teacher/classes/:id/schedules')
  },

  updateSchedule: async (
    classId: string,
    scheduleId: string,
    input: {
      dateIso?: string
      startTime?: string
      endTime?: string
      topic?: string
      location?: string | null
      roadmapItemIds?: string[]
      roadmapItemDeadlines?: Record<string, string>
      isExam?: boolean
      examQuestions?: any
      materialRef?: string | null
      note?: string | null
    }
  ) => {
    const res = await apiClient.patch<unknown>(
      `/teacher/classes/${classId}/schedules/${scheduleId}`,
      input
    )
    return safeParse(
      z.object({ ok: z.boolean() }),
      res.data,
      'PATCH /teacher/classes/:id/schedules/:scheduleId'
    )
  },

  deleteSchedule: async (classId: string, scheduleId: string) => {
    const res = await apiClient.delete<unknown>(
      `/teacher/classes/${classId}/schedules/${scheduleId}`
    )
    return safeParse(
      z.object({ ok: z.boolean() }),
      res.data,
      'DELETE /teacher/classes/:id/schedules/:scheduleId'
    )
  },

  updateAttendance: async (
    classId: string,
    scheduleId: string,
    input: { userId: string; attendance?: string; evaluation?: string; evalLink?: string }
  ) => {
    const res = await apiClient.post<unknown>(
      `/teacher/classes/${classId}/schedules/${scheduleId}/attendance`,
      input
    )
    return safeParse(
      z.object({ ok: z.boolean() }),
      res.data,
      'POST /teacher/classes/:id/schedules/:scheduleId/attendance'
    )
  },

  registrations: async (classId: string) => {
    const res = await apiClient.get<unknown>(`/teacher/classes/${classId}/registrations`)
    return safeParse(
      z.array(teacherClassRegistrationApiSchema),
      res.data,
      'GET /teacher/classes/:id/registrations'
    )
  },

  approveRegistration: async (classId: string, registrationId: string) => {
    const res = await apiClient.post<unknown>(
      `/teacher/classes/${classId}/registrations/${registrationId}/approve`
    )
    return safeParse(z.object({ ok: z.boolean() }), res.data, 'POST approve registration')
  },

  rejectRegistration: async (classId: string, registrationId: string, reason: string) => {
    const res = await apiClient.post<unknown>(
      `/teacher/classes/${classId}/registrations/${registrationId}/reject`,
      { reason }
    )
    return safeParse(z.object({ ok: z.boolean() }), res.data, 'POST reject registration')
  },

  removeClassMember: async (
    classId: string,
    userId: string,
    input: { reason: string; isMakeup?: boolean }
  ) => {
    const res = await apiClient.post<unknown>(
      `/teacher/classes/${classId}/members/${userId}/remove`,
      input
    )
    return safeParse(z.object({ ok: z.boolean() }), res.data, 'POST remove class member')
  },
}
