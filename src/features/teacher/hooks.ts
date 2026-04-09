import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { teacherApi } from './api'

const teacherKeys = {
  all: ['teacher'] as const,
  classes: () => [...teacherKeys.all, 'classes'] as const,
  classDetail: (classId: string) => [...teacherKeys.all, 'class-detail', classId] as const,
}

export function useTeacherClasses() {
  return useQuery({
    queryKey: teacherKeys.classes(),
    queryFn: () => teacherApi.classes(),
  })
}

export function useTeacherClassDetail(classId: string) {
  return useQuery({
    queryKey: teacherKeys.classDetail(classId),
    queryFn: () => teacherApi.classDetail(classId),
    enabled: classId.length > 0,
  })
}

export function useTeacherGrade(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; outcome: 'DAT' | 'BAO_LUU' | 'CHO_HOC_LAI' | 'CHIA_TAY'; score?: number | null; note?: string | null }) =>
      teacherApi.grade(classId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teacherKeys.classDetail(classId) })
      toast.success('Đã chấm bài')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
