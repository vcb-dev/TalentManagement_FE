import type { LevelCode } from '@/lib/constants'
import type { ProfileIconKey } from './profileContentIcons'

export interface ProfileAchievement {
  iconKey: ProfileIconKey
  name: string
  sub: string
  earned: boolean
}

export interface ProfileStatRow {
  label: string
  value: string
  valueClass?: string
  iconKey?: ProfileIconKey
}

export interface ProfileLevelHistoryRow {
  step: number
  title: string
  meta: string
  tierLabel: string
  tierIconKey?: ProfileIconKey
  tierClass: string
  dimmed?: boolean
}

export interface ProfileExamCard {
  title: string
  badge: string
  badgeIconKey?: ProfileIconKey
  badgeClass: string
  cardClass: string
  stats: { label: string; value: string; valueClass?: string }[]
  note?: string
}

export interface ProfileTimelineItem {
  title: string
  titleIconKey?: ProfileIconKey
  meta: string
  badge: string
  badgeClass: string
  cardClass: string
  extra?: string
  footnote?: string
  dimmed?: boolean
}

export interface ProfileWorkSummaryRow {
  label: string
  value: string
}

export interface MyProfilePage {
  /**
   * Mã cấp & sao do quản lý gán — dùng để điều hướng checklist lộ trình.
   * Khi không có (API cũ), client suy ra từ `currentLevel.title` và `currentStarIndex`.
   */
  placement?: { levelId: LevelCode; starId: number }
  statsOverview: ProfileStatRow[]
  achievements: ProfileAchievement[]
  currentLevel: {
    title: string
    titleIconKey?: ProfileIconKey
    tierLabel: string
    tierIconKey?: ProfileIconKey
    progressLine: string
    filledStars: number
    totalStars: number
    currentStarIndex: number
    levelProgressPct: number
  }
  levelHistory: ProfileLevelHistoryRow[]
  learningPathSummary: ProfileStatRow[]
  learningTimeline: ProfileTimelineItem[]
  examSummary: ProfileStatRow[]
  exams: ProfileExamCard[]
  workSummary: ProfileWorkSummaryRow[]
  workTimeline: ProfileTimelineItem[]
  orgInfo: { roleBadge: string; department: string; team: string; employeeCode: string; startDate: string }
  personalInfo: { phone: string; birthDate: string }
  security: { lastPasswordChange: string }
}
