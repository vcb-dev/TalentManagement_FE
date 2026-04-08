import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useAuthStore } from '@/stores/auth.store'
import {
  mapMeAggregatedToPage,
  type MeDashboard,
  type MeExamAttempt,
  type MeLearningPath,
} from '@/features/profile/meProfileMapper'
import { MOCK_MY_PROFILE_PAGE } from '@/features/profile/mock/mockMyProfilePage'
import type { MyProfilePage } from '@/features/profile/types'
import type { MeUserSelf } from '@/features/profile/userSelf.types'

export const profileApi = {
  getPage: async (): Promise<MyProfilePage> => {
    if (isMockApiEnabled()) {
      return MOCK_MY_PROFILE_PAGE
    }
    const [dash, learning, exams, userRes] = await Promise.all([
      apiClient.get<MeDashboard>('/me/dashboard'),
      apiClient.get<MeLearningPath>('/me/learning-path'),
      apiClient.get<MeExamAttempt[]>('/me/exams'),
      apiClient.get<MeUserSelf>('/me/user'),
    ])
    if (!dash.data?.user?.id || !userRes.data?.id) {
      throw new Error('Không tải được hồ sơ (thiếu dữ liệu người dùng).')
    }
    return mapMeAggregatedToPage(dash.data, learning.data, exams.data, userRes.data)
  },

  /** Upload ảnh đại diện — `multipart/form-data`, field `file`. */
  uploadPortrait: async (file: File): Promise<{ portraitRef: string }> => {
    if (isMockApiEnabled()) {
      await new Promise((r) => setTimeout(r, 400))
      return { portraitRef: '/uploads/portraits/mock.jpg' }
    }
    const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
    const token = useAuthStore.getState().accessToken
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${base}/me/user/portrait`, {
      method: 'POST',
      body,
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || 'Không tải được ảnh lên')
    }
    return res.json() as Promise<{ portraitRef: string }>
  },
}
