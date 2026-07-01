import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import type { CreateEmployeeInput, PatchEmployeeInput } from '@/types/api'
import { employeeApi, type CreateEmployeeMeta } from './api'
import { employeeKeys } from './queryKeys'
import type { EmployeeFilters } from './types'
import type { IHrEmployeeProfileState } from './components/HrEmployeeProfile/HrEmployeeProfile'

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

/** Danh sách Quản lý / BOD cho select "Quản lý trực tiếp". */
export function useDirectManagerOptions() {
  return useQuery({
    queryKey: employeeKeys.list({ page: 1, pageSize: 500, roles: 'MANAGER,BOD' }),
    queryFn: () => employeeApi.getAll({ page: 1, pageSize: 500, roles: 'MANAGER,BOD' }),
    staleTime: 5 * 60_000,
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
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || 'Không thể tạo nhân viên')
    },
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; patch: PatchEmployeeInput }) =>
      employeeApi.update(args.id, args.patch),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: employeeKeys.detailEmployeeByID(id) })
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
      toast.success('Đã cập nhật nhân viên')
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || 'Không thể cập nhật nhân viên')
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
    onError: (err, _id, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => {
        qc.setQueryData(key, data)
      })
      toast.error(getApiErrorMessage(err) || 'Không thể vô hiệu hóa nhân viên')
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: employeeKeys.detailEmployeeByID(id) })
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
      toast.success('Đã vô hiệu hóa tài khoản')
    },
  })
}

export function useEmployeeById(id: string) {
  return useQuery({
    queryKey: employeeKeys.detailEmployeeByID(id),
    queryFn: () => employeeApi.getEmployeeById(id),
    enabled: id.length > 0,
  })
}

export function useUpdateEmployeeById() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; patch: IHrEmployeeProfileState }) => {
      return employeeApi.updateEmployeeById(args.id, args.patch)
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.detailEmployeeByID(id) })
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
      toast.success('Đã cập nhật nhân viên')
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || 'Không thể cập nhật nhân viên')
    },
  })
}
