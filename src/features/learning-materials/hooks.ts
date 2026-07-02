import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { learningMaterialsApi, type LearningMaterialInput } from './api'
import { learningMaterialsKeys } from './queryKeys'

export function useManagerLearningMaterials() {
  return useQuery({
    queryKey: learningMaterialsKeys.managerList(),
    queryFn: learningMaterialsApi.listForManager,
  })
}

export function useMyLearningMaterials(enabled = true) {
  return useQuery({
    queryKey: learningMaterialsKeys.myList(),
    queryFn: learningMaterialsApi.listMine,
    enabled,
  })
}

export function useCreateLearningMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LearningMaterialInput) => learningMaterialsApi.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: learningMaterialsKeys.all })
      toast.success('Đã thêm tài liệu')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useUpdateLearningMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<LearningMaterialInput> }) =>
      learningMaterialsApi.update(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: learningMaterialsKeys.all })
      toast.success('Đã cập nhật tài liệu')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useDeleteLearningMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => learningMaterialsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: learningMaterialsKeys.all })
      toast.success('Đã xóa tài liệu')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
