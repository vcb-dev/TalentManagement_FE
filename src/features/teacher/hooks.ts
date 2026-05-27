import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { teacherApi } from './api'

const teacherKeys = {
  all: ['teacher'] as const,
  classes: () => [...teacherKeys.all, 'classes'] as const,
  classDetail: (classId: string) => [...teacherKeys.all, 'class-detail', classId] as const,
  schedules: (classId: string) => [...teacherKeys.all, 'schedules', classId] as const,
  roadmapItems: (classId: string) => [...teacherKeys.all, 'roadmap-items', classId] as const,
  registrations: (classId: string) => [...teacherKeys.all, 'registrations', classId] as const,
}

export function useTeacherClasses(enabled = true) {
  return useQuery({
    queryKey: teacherKeys.classes(),
    queryFn: () => teacherApi.classes(),
    enabled,
  })
}

export function useTeacherClassDetail(classId: string, enabled = true) {
  return useQuery({
    queryKey: teacherKeys.classDetail(classId),
    queryFn: () => teacherApi.classDetail(classId),
    enabled: enabled && classId.length > 0,
  })
}

export function useTeacherGrade(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      userId: string
      outcome: 'DAT' | 'BAO_LUU' | 'CHO_HOC_LAI' | 'CHIA_TAY'
      score?: number | null
      note?: string | null
    }) => teacherApi.grade(classId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teacherKeys.classDetail(classId) })
      toast.success('Đã chấm bài')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useTeacherSchedules(classId: string) {
  return useQuery({
    queryKey: teacherKeys.schedules(classId),
    queryFn: () => teacherApi.schedules(classId),
    enabled: classId.length > 0,
  })
}

export function useTeacherRoadmapItems(classId: string) {
  return useQuery({
    queryKey: teacherKeys.roadmapItems(classId),
    queryFn: () => teacherApi.roadmapItems(classId),
    enabled: classId.length > 0,
  })
}

export function useTeacherCreateSchedule(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      dateIso: string
      startTime: string
      endTime: string
      topic: string
      location?: string | null
      roadmapItemIds: string[]
    }) => teacherApi.createSchedule(classId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teacherKeys.schedules(classId) })
      toast.success('Đã thêm lịch học')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useTeacherUpdateSchedule(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      scheduleId,
      input,
    }: {
      scheduleId: string
      input: {
        dateIso?: string
        startTime?: string
        endTime?: string
        topic?: string
        location?: string | null
        roadmapItemIds?: string[]
      }
    }) => teacherApi.updateSchedule(classId, scheduleId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teacherKeys.schedules(classId) })
      toast.success('Đã cập nhật lịch học')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useTeacherDeleteSchedule(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (scheduleId: string) => teacherApi.deleteSchedule(classId, scheduleId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teacherKeys.schedules(classId) })
      toast.success('Đã xóa lịch học')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useTeacherUpdateAttendance(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      scheduleId,
      input,
    }: {
      scheduleId: string
      input: { userId: string; attendance?: string; evaluation?: string; evalLink?: string }
    }) => teacherApi.updateAttendance(classId, scheduleId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teacherKeys.schedules(classId) })
      toast.success('Đã lưu thông tin buổi học')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useTeacherClassRegistrations(classId: string) {
  return useQuery({
    queryKey: teacherKeys.registrations(classId),
    queryFn: () => teacherApi.registrations(classId),
    enabled: classId.length > 0,
  })
}

export function useApproveClassRegistration(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (registrationId: string) => teacherApi.approveRegistration(classId, registrationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teacherKeys.registrations(classId) })
      void qc.invalidateQueries({ queryKey: teacherKeys.classDetail(classId) })
      void qc.invalidateQueries({ queryKey: teacherKeys.classes() })
    },
  })
}

export function useRejectClassRegistration(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { registrationId: string; reason: string }) =>
      teacherApi.rejectRegistration(classId, input.registrationId, input.reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teacherKeys.registrations(classId) })
      void qc.invalidateQueries({ queryKey: teacherKeys.classes() })
    },
  })
}
