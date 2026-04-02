import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/axios'
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
