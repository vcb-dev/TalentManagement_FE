import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/axios'
import { safeParse } from '@/lib/utils'
import { learningApi } from './api'
import { evidenceSubmitResponseSchema } from './schemas'
import { learningKeys } from './queryKeys'

export function useLearningLevels() {
  return useQuery({
    queryKey: learningKeys.levels(),
    queryFn: () => learningApi.levels(),
  })
}

export function useLearningChecklist(levelId: string, starId: string) {
  return useQuery({
    queryKey: learningKeys.checklist(levelId, starId),
    queryFn: () => learningApi.checklist(levelId, starId),
    enabled: levelId.length > 0 && starId.length > 0,
  })
}

export function useStarSubmissions(starId: string) {
  return useQuery({
    queryKey: learningKeys.submissions(starId),
    queryFn: () => learningApi.submissions(starId),
    enabled: starId.length > 0,
  })
}

export function useSubmitEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { levelId: string; starId: string; itemId: string; file: File }) => {
      const form = new FormData()
      form.append('itemId', input.itemId)
      form.append('file', input.file)
      const res = await apiClient.post<unknown>(
        `/learning/levels/${input.levelId}/stars/${input.starId}/evidence`,
        form
      )
      return safeParse(evidenceSubmitResponseSchema, res.data, 'POST evidence')
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: learningKeys.checklist(vars.levelId, vars.starId) })
      void qc.invalidateQueries({ queryKey: learningKeys.submissions(vars.starId) })
      toast.success('Đã gửi minh chứng')
    },
    onError: () => toast.error('Gửi minh chứng thất bại'),
  })
}
