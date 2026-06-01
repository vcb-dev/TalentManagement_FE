import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { MOCK_MY_PROFILE_PAGE } from '@/features/profile/mock/mockMyProfilePage'
import type { MyProfilePage } from '@/features/profile/types'
import {
  mapMeAggregatedToPage,
  type MeDashboard,
  type MeExamAttempt,
  type MeLearningPath,
} from '@/features/profile/meProfileMapper'
import type { MeUserSelf } from '@/features/profile/userSelf.types'

function rawToMeDashboard(raw: unknown): MeDashboard {
  const d = raw as Partial<MeDashboard> & {
    learningStats?: {
      milestonesByStatus?: Record<string, number>
      examsByOutcome?: Record<string, number>
    }
  }
  if (!d.user) {
    throw new Error('GET /me/dashboard không trả về user')
  }
  const ls = d.learningStats
  return {
    user: d.user,
    appProfile: d.appProfile ?? null,
    career: d.career ?? null,
    promotionHistory: d.promotionHistory ?? [],
    learningStats: {
      milestonesByStatus: ls?.milestonesByStatus ?? {},
      examsByOutcome: ls?.examsByOutcome ?? {},
    },
    nextStarTopics: (raw as any).nextStarTopics ?? [],
  }
}

export const profileApi = {
  /**
   * Gom dữ liệu từ các endpoint thực — BE không có GET /me/profile.
   * MyProfileScreen giữ nguyên; chỉ tầng API thay đổi.
   */
  getPage: async (): Promise<MyProfilePage> => {
    if (isMockApiEnabled()) {
      return MOCK_MY_PROFILE_PAGE
    }
    const [dashRes, learningRes, examsRes, userRes] = await Promise.all([
      apiClient.get<unknown>('/me/dashboard'),
      apiClient.get<unknown>('/me/learning-path'),
      apiClient.get<unknown>('/me/exams'),
      apiClient.get<unknown>('/me/user'),
    ])

    const dashboard = rawToMeDashboard(dashRes.data)
    const learningPath = learningRes.data as MeLearningPath
    const exams = examsRes.data as MeExamAttempt[]
    const userSelf = userRes.data as MeUserSelf

    return mapMeAggregatedToPage(dashboard, learningPath, exams, userSelf)
  },

  /** Upload ảnh đại diện — `multipart/form-data`, field `file`. */
  uploadPortrait: async (file: File): Promise<{ portraitRef: string }> => {
    if (isMockApiEnabled()) {
      await new Promise((r) => setTimeout(r, 400))
      return { portraitRef: '/uploads/portraits/mock.jpg' }
    }
    const body = new FormData()
    body.append('file', file)
    const res = await apiClient.post<{ portraitRef: string }>('/me/user/portrait', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  /** Lấy danh sách vị trí (team_position) — dùng cho dropdown form. */
  getPositions: async (): Promise<Array<{ value: string; label: string }>> => {
    if (isMockApiEnabled()) {
      return [
        { value: 'Senior Developer', label: 'Senior Developer' },
        { value: 'Developer', label: 'Developer' },
        { value: 'Junior Developer', label: 'Junior Developer' },
      ]
    }
    const res = await apiClient.get<Array<{ value: string; label: string }>>('/me/positions')
    return res.data ?? []
  },
}
