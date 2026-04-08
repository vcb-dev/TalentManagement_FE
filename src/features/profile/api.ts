import { MOCK_MY_PROFILE_PAGE } from '@/features/profile/mock/mockMyProfilePage'
import type { MyProfilePage } from '@/features/profile/types'

export const profileApi = {
  getPage: async (): Promise<MyProfilePage> => MOCK_MY_PROFILE_PAGE,
}
