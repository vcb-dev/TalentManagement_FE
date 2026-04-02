import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { MOCK_MY_PROFILE_PAGE } from '@/features/profile/mock/mockMyProfilePage'
import type { MyProfilePage } from '@/features/profile/types'

export const profileApi = {
  getPage: async (): Promise<MyProfilePage> => {
    if (isMockApiEnabled()) {
      return MOCK_MY_PROFILE_PAGE
    }
    const res = await apiClient.get<unknown>('/me/profile')
    return res.data as MyProfilePage
  },
}
