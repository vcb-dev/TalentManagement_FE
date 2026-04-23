import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient, getApiErrorMessage } from '@/lib/axios'
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

export function useMyLearningPath() {
  return useQuery({
    queryKey: learningKeys.myPath(),
    queryFn: () => learningApi.myLearningPath(),
  })
}

export function useMyEnrolledClass(range?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: learningKeys.myEnrolledClass(range),
    queryFn: () => learningApi.myEnrolledClass(range),
    placeholderData: (previousData) => previousData,
  })
}

export function useLearningChecklist(levelId: string, starId: string, enabled = true) {
  return useQuery({
    queryKey: learningKeys.checklist(levelId, starId),
    queryFn: () => learningApi.checklist(levelId, starId),
    enabled: enabled && !!levelId?.length && !!starId?.length,
  })
}

export function useStarSubmissions(starId: string) {
  return useQuery({
    queryKey: learningKeys.submissions(starId),
    queryFn: () => learningApi.submissions(starId),
    enabled: !!starId?.length,
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
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return safeParse(evidenceSubmitResponseSchema, res.data, 'POST evidence')
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: learningKeys.checklist(vars.levelId, vars.starId) })
      void qc.invalidateQueries({ queryKey: learningKeys.submissions(vars.starId) })
      toast.success('Đã gửi minh chứng')
    },
    onError: (err) => {
      const msg = getApiErrorMessage(err)
      toast.error(`Gửi minh chứng thất bại: ${msg}`)
    },
  })
}
