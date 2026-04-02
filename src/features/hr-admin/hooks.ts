import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CreateEmployeeInput } from '@/types/api'
import { employeeApi, type CreateEmployeeMeta } from './api'
import { employeeKeys } from './queryKeys'
import type { EmployeeFilters } from './types'

type EmployeeListData = Awaited<ReturnType<typeof employeeApi.getAll>>

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => employeeApi.getAll(filters),
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeApi.getById(id),
    enabled: id.length > 0,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { input: CreateEmployeeInput; meta?: CreateEmployeeMeta }) =>
      employeeApi.create(args.input, args.meta),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
      toast.success('Đã tạo nhân viên')
    },
    onError: () => {
      toast.error('Không thể tạo nhân viên')
    },
  })
}

export function useDeactivateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => employeeApi.deactivate(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: employeeKeys.lists() })
      const snapshots = qc.getQueriesData({ queryKey: employeeKeys.lists() }) as [
        readonly unknown[],
        EmployeeListData | undefined,
      ][]
      snapshots.forEach(([key, old]) => {
        if (!old) return
        qc.setQueryData(key, {
          ...old,
          data: old.data.map((e) => (e.id === id ? { ...e, status: 'INACTIVE' as const } : e)),
        })
      })
      return { snapshots }
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => {
        qc.setQueryData(key, data)
      })
      toast.error('Không thể vô hiệu hóa nhân viên')
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
      toast.success('Đã vô hiệu hóa tài khoản')
    },
  })
}
