import type { MeDashboard } from '@/features/profile/meProfileMapper'
import { MOCK_USER_SELF } from '@/features/profile/mock/mockUserSelf'

export const MOCK_MY_DASHBOARD: MeDashboard = {
  user: {
    id: MOCK_USER_SELF.id,
    email: MOCK_USER_SELF.email,
    displayName: MOCK_USER_SELF.displayName,
    fullNameLegal: MOCK_USER_SELF.fullNameLegal,
    jobTitle: MOCK_USER_SELF.jobTitle,
    teamGroup: MOCK_USER_SELF.teamGroup,
    departmentName: MOCK_USER_SELF.departmentName,
    portraitRef: MOCK_USER_SELF.portraitRef,
    phonePrimary: MOCK_USER_SELF.phonePrimary,
    employeeCodePrimary: MOCK_USER_SELF.employeeCodePrimary,
    birthDate: MOCK_USER_SELF.birthDate,
    startDateWork: MOCK_USER_SELF.startDateWork,
  },
  appProfile: null,
  career: { careerLevel: 'duoc_viec', currentStars: 4, eligiblePromote: false },
  promotionHistory: [
    {
      fromLevel: 'biet_viec',
      toLevel: 'duoc_viec',
      promotedAt: '2026-01-05T00:00:00.000Z',
      note: 'Đạt ngay lần 1',
    },
    {
      fromLevel: 'tap_su',
      toLevel: 'biet_viec',
      promotedAt: '2023-12-20T00:00:00.000Z',
      note: null,
    },
  ],
  learningStats: { milestonesByStatus: { done: 12, in_progress: 3, locked: 6 }, examsByOutcome: { DAT: 5 } },
}

