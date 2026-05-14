import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient, getApiErrorMessage } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import { approvalItemApiSchema } from './schemas'
import { managerApi } from './api'
import { managerKeys } from './queryKeys'

export function useTeamProgress(teamId?: string) {
  return useQuery({
    queryKey: managerKeys.teamProgress(teamId),
    queryFn: () => managerApi.teamProgress(teamId),
  })
}

export function useApprovals() {
  return useQuery({
    queryKey: managerKeys.approvals(),
    queryFn: () => managerApi.approvals(),
  })
}

export function useKpiMonthly(month: string) {
  return useQuery({
    queryKey: managerKeys.kpiMonthly(month),
    queryFn: () => managerApi.kpiMonthly(month),
    enabled: month.length > 0,
  })
}

export function useApproveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (isMockApiEnabled()) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        return { id, status: 'APPROVED' }
      }
      const res = await apiClient.post<unknown>(`/manager/approvals/${id}/approve`)
      return res.data
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: managerKeys.approvals() })
      const previousData = qc.getQueryData<any>(managerKeys.approvals())

      if (previousData) {
        const nextData = {
          ...previousData,
          promotions: previousData.promotions.map((p: any) => {
            if (p.id === id) {
              const starBadge = p.badges.find((b: any) => b.label.includes('sao'))
              const stars = starBadge ? parseInt(starBadge.label) || 0 : 0

              if (stars >= 6) {
                // Optimistic level promote
                const levelBadge = p.badges.find((b: any) =>
                  ['Tập sự', 'Biết việc', 'Được việc'].includes(b.label)
                )
                const current = levelBadge?.label || ''
                let next = 'Cấp mới'
                if (current === 'Tập sự') next = 'Biết việc'
                else if (current === 'Biết việc') next = 'Được việc'

                const nextBadges = p.badges.map((b: any) => {
                  if (b.label === current) return { ...b, label: next, tone: 'warning' }
                  if (b.label.includes('sao')) return { ...b, label: '0 sao' }
                  return b
                })
                return { ...p, badges: nextBadges }
              } else {
                // Optimistic star promote
                const nextBadges = p.badges.map((b: any) => {
                  if (b.label.includes('sao')) {
                    const next = stars + 1
                    return { ...b, label: `${next} sao` }
                  }
                  return b
                })
                return { ...p, badges: nextBadges }
              }
            }
            return p
          }),
        }
        qc.setQueryData(managerKeys.approvals(), nextData)
      }

      return { previousData }
    },
    onError: (err, _id, context: any) => {
      if (context?.previousData) {
        qc.setQueryData(managerKeys.approvals(), context.previousData)
      }
      toast.error(getApiErrorMessage(err) || 'Thao tác thất bại')
    },
    onSuccess: (res: any) => {
      if (res?.status === 'PROMOTED' || res?.status === 'STAR_UP') {
        // Modal sẽ được hiển thị bởi Container — không cần toast ở đây
      } else {
        toast.success('Đã thăng cấp sao ⭐')
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: managerKeys.approvals() })
    },
  })
}

export function useRejectRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (isMockApiEnabled()) {
        return safeParse(
          approvalItemApiSchema,
          {
            id,
            type: 'PROMOTION',
            requesterName: '—',
            status: 'REJECTED',
            createdAt: new Date().toISOString(),
          },
          'POST reject (mock)'
        )
      }
      const res = await apiClient.post<unknown>(`/manager/approvals/${id}/reject`)
      return safeParse(approvalItemApiSchema, res.data, 'POST reject')
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: managerKeys.approvals() })
      toast.success('Đã từ chối')
    },
    onError: () => toast.error('Thao tác thất bại'),
  })
}

export function useAllExams() {
  return useQuery({
    queryKey: [...managerKeys.all, 'all-exams'],
    queryFn: () => managerApi.allExams(),
  })
}

export function useManagerClasses(params?: {
  search?: string
  levelFrom?: string
  status?: string
}) {
  return useQuery({
    queryKey: managerKeys.classes(params),
    queryFn: () => managerApi.classes(params),
  })
}

export function useCreateManagerClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: managerApi.createClass,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'classes'] })
      toast.success('Đã tạo lớp')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useUpdateManagerClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      classId,
      input,
    }: {
      classId: string
      input: {
        name?: string
        status?: string
        capacity?: number | null
        examDate?: string | null
        teacherUserId?: string | null
      }
    }) => managerApi.updateClass(classId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'classes'] })
      toast.success('Đã cập nhật lớp')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useDeleteManagerClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (classId: string) => managerApi.deleteClass(classId),
    onMutate: async (classId: string) => {
      await qc.cancelQueries({ queryKey: [...managerKeys.all, 'classes'] })
      const previousClasses = qc.getQueryData<any[]>([...managerKeys.all, 'classes'])

      if (previousClasses) {
        qc.setQueryData(
          [...managerKeys.all, 'classes'],
          previousClasses.filter((c) => c.id !== classId)
        )
      }

      return { previousClasses }
    },
    onError: (error, _classId, context) => {
      if (context?.previousClasses) {
        qc.setQueryData([...managerKeys.all, 'classes'], context.previousClasses)
      }
      toast.error(getApiErrorMessage(error))
    },
    onSuccess: () => {
      toast.success('Đã xóa lớp')
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'classes'] })
    },
  })
}

export function useClassMemberOptions(query: string, levelFrom?: string, excludeUserId?: string) {
  return useQuery({
    queryKey: managerKeys.classMemberOptions(query, levelFrom, excludeUserId),
    queryFn: () => managerApi.memberOptions(query, levelFrom, excludeUserId),
    enabled: query.trim().length >= 1,
  })
}

export function useTeacherOptions(query: string) {
  return useQuery({
    queryKey: [...managerKeys.all, 'teacher-options', query],
    queryFn: () => managerApi.teacherOptions(query),
    enabled: query.trim().length >= 1,
  })
}

export function useAddClassMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, userId }: { classId: string; userId: string }) =>
      managerApi.addClassMember(classId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'classes'] })
      toast.success('Đã thêm nhân sự vào lớp')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useRemoveClassMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, userId }: { classId: string; userId: string }) =>
      managerApi.removeClassMember(classId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'classes'] })
      toast.success('Đã xóa nhân sự khỏi lớp')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useManagerRoadmapItems(params?: {
  levelLabel?: string
  topic?: string
  q?: string
}) {
  return useQuery({
    queryKey: managerKeys.roadmapItems(params),
    queryFn: () => managerApi.roadmapItems(params),
  })
}

export function useCreateManagerRoadmapItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: managerApi.createRoadmapItem,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'roadmap-items'] })
      toast.success('Đã thêm mục lộ trình')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useUpdateManagerRoadmapItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Parameters<typeof managerApi.updateRoadmapItem>[1]
    }) => managerApi.updateRoadmapItem(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'roadmap-items'] })
      toast.success('Đã cập nhật mục lộ trình')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useDeleteManagerRoadmapItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => managerApi.deleteRoadmapItem(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'roadmap-items'] })
      toast.success('Đã xóa mục lộ trình')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useClassSchedules(classId: string) {
  return useQuery({
    queryKey: managerKeys.classSchedules(classId),
    queryFn: () => managerApi.classSchedules(classId),
    enabled: classId.length > 0,
  })
}

export function useCreateClassSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      classId,
      input,
    }: {
      classId: string
      input: {
        dateIso: string
        startTime: string
        endTime: string
        topic: string
        location?: string | null
        isExam?: boolean
        examTeacherUserId?: string | null
        examStatus?: string | null
      }
    }) => managerApi.createClassSchedule(classId, input),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: managerKeys.classSchedules(vars.classId) })
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'all-exams'] })
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'classes'] })
      toast.success('Đã thêm lịch học')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useUpdateClassSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      classId,
      scheduleId,
      input,
    }: {
      classId: string
      scheduleId: string
      input: {
        dateIso?: string
        startTime?: string
        endTime?: string
        topic?: string
        location?: string | null
        isExam?: boolean
        examTeacherUserId?: string | null
        examStatus?: string | null
      }
    }) => managerApi.updateClassSchedule(classId, scheduleId, input),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: managerKeys.classSchedules(vars.classId) })
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'all-exams'] })
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'classes'] })
      toast.success('Đã cập nhật lịch học')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useDeleteClassSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, scheduleId }: { classId: string; scheduleId: string }) =>
      managerApi.deleteClassSchedule(classId, scheduleId),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: managerKeys.classSchedules(vars.classId) })
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'all-exams'] })
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'classes'] })
      toast.success('Đã xóa lịch học')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export const useSaveExamQuestions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { classId: string; questions: any }) =>
      managerApi.saveExamQuestions(input.classId, input.questions),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['manager', 'classes', variables.classId] })
      toast.success('Lưu đề thi thành công')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export const useSaveScheduleExamQuestions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { classId: string; scheduleId: string; questions: any }) =>
      managerApi.saveScheduleExamQuestions(input.classId, input.scheduleId, input.questions),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: managerKeys.classSchedules(variables.classId) })
      qc.invalidateQueries({ queryKey: [...managerKeys.all, 'all-exams'] })
      toast.success('Lưu đề thi buổi thi thành công')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export const useManagerSubmissions = () => {
  return useQuery({
    queryKey: ['manager', 'learning-submissions'],
    queryFn: () => managerApi.allSubmissions(),
  })
}

export const useUpdateSubmissionStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: string; score?: number; managerComment?: string }) =>
      managerApi.updateSubmissionStatus(input.id, input.status, input.score, input.managerComment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager', 'learning-submissions'] })
      toast.success('Cập nhật trạng thái thành công')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
