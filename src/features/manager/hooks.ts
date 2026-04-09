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
        return safeParse(
          approvalItemApiSchema,
          {
            id,
            type: 'PROMOTION',
            requesterName: '—',
            status: 'APPROVED',
            createdAt: new Date().toISOString(),
          },
          'POST approve (mock)'
        )
      }
      const res = await apiClient.post<unknown>(`/manager/approvals/${id}/approve`)
      return safeParse(approvalItemApiSchema, res.data, 'POST approve')
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: managerKeys.approvals() })
      toast.success('Đã duyệt thăng cấp')
    },
    onError: () => toast.error('Duyệt thất bại'),
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

export function useManagerClasses(params?: { search?: string; levelFrom?: string; status?: string }) {
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
    }) =>
      managerApi.updateClass(classId, input),
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'classes'] })
      toast.success('Đã xóa lớp')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useClassMemberOptions(query: string, levelFrom?: string) {
  return useQuery({
    queryKey: managerKeys.classMemberOptions(query, levelFrom),
    queryFn: () => managerApi.memberOptions(query, levelFrom),
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
    mutationFn: ({ classId, userId }: { classId: string; userId: string }) => managerApi.addClassMember(classId, userId),
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
    mutationFn: ({ classId, userId }: { classId: string; userId: string }) => managerApi.removeClassMember(classId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...managerKeys.all, 'classes'] })
      toast.success('Đã xóa nhân sự khỏi lớp')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
