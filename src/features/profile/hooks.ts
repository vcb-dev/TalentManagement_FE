import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { authKeys } from '@/features/auth/queryKeys'
import { profileApi, type MeAttachmentField } from '@/features/profile/api'
import { profileKeys } from '@/features/profile/queryKeys'
import { dashboardKeys } from '@/features/dashboard/queryKeys'
import { useChecklistReminderStore } from '@/features/checklist/loginReminder'
import type { MeUserPatchKey } from '@/features/profile/userSelf.types'

export type PatchMeUserBody = Partial<Record<MeUserPatchKey, string | null>> & {
  extraTeamIds?: string[]
  teamLeaderUserId?: string | null
}

export function useMyProfilePage() {
  return useQuery({
    queryKey: profileKeys.page(),
    queryFn: () => profileApi.getPage(),
  })
}

export function useMeUserSelf(enabled = true) {
  return useQuery({
    queryKey: profileKeys.userSelf(),
    queryFn: () => profileApi.getUserSelf(),
    enabled,
  })
}

export function useMyTeamLeaderOptions() {
  return useQuery({
    queryKey: profileKeys.teamLeaderOptions(),
    queryFn: () => profileApi.getTeamLeaderOptions(),
    staleTime: 5 * 60_000,
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
        qc.invalidateQueries({ queryKey: profileKeys.userSelf() }),
        qc.invalidateQueries({ queryKey: authKeys.me() }),
        qc.invalidateQueries({ queryKey: dashboardKeys.me() }),
      ])
      // Ở đây chứ không ở `mutate(..., { onSuccess })`: lưu xong hồ sơ refetch → form mount lại,
      // callback gắn theo component có thể không chạy.
      useChecklistReminderStore.getState().resumeChecklists()
    },
  })
}

export function useMeAttachmentSignedUrl() {
  return useMutation({
    mutationFn: (field: MeAttachmentField) => profileApi.getAttachmentSignedUrl(field),
  })
}

/** Signed URL sống 5 phút — cache 4 phút. */
export function useMeAttachmentPreviewUrl(
  field: MeAttachmentField,
  objectPath: string | null | undefined
) {
  const path = objectPath?.trim() ?? ''
  return useQuery({
    queryKey: profileKeys.attachmentPreview(field, path),
    queryFn: () => profileApi.getAttachmentSignedUrl(field),
    enabled: path.length > 0,
    staleTime: 4 * 60_000,
    gcTime: 4 * 60_000,
  })
}

/** Không refetch hồ sơ (đổi `updatedAt` → form mount lại, mất thay đổi chưa lưu) — chỉ đánh dấu stale. */
export function useUploadMeAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { field: MeAttachmentField; file: File }) =>
      profileApi.uploadAttachment(args.field, args.file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: profileKeys.page(), refetchType: 'none' })
      void qc.invalidateQueries({ queryKey: profileKeys.userSelf(), refetchType: 'none' })
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
        qc.invalidateQueries({ queryKey: dashboardKeys.me() }),
      ])
    },
  })
}
