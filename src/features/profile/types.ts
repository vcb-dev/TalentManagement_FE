export interface ProfileAchievement {
  icon: string
  name: string
  sub: string
  earned: boolean
}

export interface ProfileStatRow {
  label: string
  value: string
  valueClass?: string
}

export interface ProfileLevelHistoryRow {
  step: number
  title: string
  meta: string
  tierLabel: string
  tierClass: string
  dimmed?: boolean
}

export interface ProfileExamCard {
  title: string
  badge: string
  badgeClass: string
  cardClass: string
  stats: { label: string; value: string; valueClass?: string }[]
  note?: string
}

export interface ProfileTimelineItem {
  title: string
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
  statsOverview: ProfileStatRow[]
  achievements: ProfileAchievement[]
  currentLevel: {
    title: string
    tierLabel: string
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
