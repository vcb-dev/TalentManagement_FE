import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { authKeys } from '@/features/auth/queryKeys'
import { profileApi } from '@/features/profile/api'
import { profileKeys } from '@/features/profile/queryKeys'
import type { MeUserPatchKey } from '@/features/profile/userSelf.types'

export type PatchMeUserBody = Partial<Record<MeUserPatchKey, string | null>>

export function useMyProfilePage() {
  return useQuery({
    queryKey: profileKeys.page(),
    queryFn: () => profileApi.getPage(),
  })
}

export function usePatchMeUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: PatchMeUserBody) => {
      if (isMockApiEnabled()) {
        await new Promise((r) => setTimeout(r, 280))
        return
      }
      await apiClient.patch<unknown>('/me/user', body)
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: profileKeys.page() }),
        qc.invalidateQueries({ queryKey: authKeys.me() }),
      ])
    },
  })
}

export function useUploadMePortrait() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => profileApi.uploadPortrait(file),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: profileKeys.page() }),
        qc.invalidateQueries({ queryKey: authKeys.me() }),
      ])
    },
  })
}
