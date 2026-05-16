import { LEVEL_LABELS, LEVELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import type { ProfileIconKey } from '@/features/profile/profileContentIcons'
import type { MyProfilePage } from '@/features/profile/types'
import type { MeUserSelf } from '@/features/profile/userSelf.types'

const LEVEL_TITLE_ICONS: Record<LevelCode, ProfileIconKey> = {
  tap_su: 'circleDot',
  biet_viec: 'medal',
  duoc_viec: 'award',
  dong_gop_ket_qua: 'gem',
  tuong: 'crown',
}

export type MePublicUser = {
  id: string
  email: string | null
  displayName: string | null
  fullNameLegal: string | null
  jobTitle: string | null
  teamGroup: string | null
  departmentName: string | null
  portraitRef: string | null
  phonePrimary: string | null
  employeeCodePrimary: string | null
  birthDate: string | null
  startDateWork: string | null
}

export type MeAppProfile = {
  userId: string
  bio: string | null
  nickname: string | null
  avatarUrl: string | null
  phoneDisplay: string | null
} | null

export type MeCareer = {
  careerLevel: LevelCode
  currentStars: number
  eligiblePromote: boolean
} | null

export type MePromotion = {
  fromLevel: LevelCode | null
  toLevel: LevelCode
  promotedAt: string
  note: string | null
}

export type MeDashboard = {
  user: MePublicUser
  appProfile: MeAppProfile
  career: MeCareer
  promotionHistory: MePromotion[]
  learningStats: {
    milestonesByStatus: Record<string, number>
    examsByOutcome: Record<string, number>
  }
  nextStarTopics?: Array<{ topic: string; objectives: string[] }>
}

export type MeLearningPathMilestone = {
  id: string
  sortOrder: number
  title: string
  description: string | null
  minCareerLevel: LevelCode
  status: 'locked' | 'in_progress' | 'done'
  completedAt: string | null
}

export type MeLearningPath = {
  careerLevel: LevelCode
  currentStars: number
  milestones: MeLearningPathMilestone[]
}

export type MeExamAttempt = {
  id: string
  examCode: string | null
  examLabel: string | null
  outcome: 'DAT' | 'BAO_LUU' | 'CHO_HOC_LAI' | 'CHIA_TAY'
  score: number | null
  periodLabel: string | null
  classifiedAt: string
  graderNote: string | null
}

const OUTCOME_LABEL: Record<MeExamAttempt['outcome'], string> = {
  DAT: 'Đạt',
  BAO_LUU: 'Bảo lưu',
  CHO_HOC_LAI: 'Chờ học lại',
  CHIA_TAY: 'Chia tay',
}

function isLevelCode(v: string): v is LevelCode {
  return (LEVELS as readonly string[]).includes(v)
}

function parseLevel(v: string | null | undefined): LevelCode {
  if (v && isLevelCode(v)) return v
  return 'tap_su'
}

function formatViDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('vi-VN')
}

function milestoneBadge(status: MeLearningPathMilestone['status']): {
  badge: string
  badgeClass: string
  cardClass: string
  dimmed?: boolean
} {
  switch (status) {
    case 'done':
      return {
        badge: 'Hoàn thành',
        badgeClass: 'bg-emerald-100 text-emerald-800',
        cardClass: 'border-emerald-300 bg-emerald-50',
      }
    case 'in_progress':
      return {
        badge: 'Đang học',
        badgeClass: 'bg-primary/10 text-primary',
        cardClass: 'border-primary/30 bg-primary/5 shadow-[var(--shadow-card)]',
      }
    default:
      return {
        badge: 'Chưa mở',
        badgeClass: 'border border-border bg-muted text-muted-foreground',
        cardClass: 'border-border bg-muted/50 opacity-80',
        dimmed: true,
      }
  }
}

function examCardStyle(outcome: MeExamAttempt['outcome']): {
  badge: string
  badgeClass: string
  cardClass: string
  badgeIconKey?: ProfileIconKey
} {
  switch (outcome) {
    case 'DAT':
      return {
        badge: OUTCOME_LABEL[outcome],
        badgeClass: 'bg-emerald-100 text-emerald-800',
        cardClass: 'border-emerald-300 bg-emerald-50',
        badgeIconKey: 'check',
      }
    case 'BAO_LUU':
      return {
        badge: OUTCOME_LABEL[outcome],
        badgeClass: 'bg-amber-100 text-amber-800',
        cardClass: 'border-amber-200/80 bg-amber-50/90',
        badgeIconKey: 'alertTriangle',
      }
    case 'CHO_HOC_LAI':
      return {
        badge: OUTCOME_LABEL[outcome],
        badgeClass: 'bg-sky-100 text-sky-900',
        cardClass: 'border-sky-200 bg-sky-50/90',
        badgeIconKey: 'calendar',
      }
    default:
      return {
        badge: OUTCOME_LABEL[outcome],
        badgeClass: 'bg-muted text-muted-foreground',
        cardClass: 'border-border bg-muted/40',
        badgeIconKey: 'flag',
      }
  }
}

export function mapMeAggregatedToPage(
  dashboard: MeDashboard,
  learningPath: MeLearningPath,
  exams: MeExamAttempt[],
  userSelf: MeUserSelf
): MyProfilePage {
  const hr = userSelf
  const career = dashboard.career
  const level = parseLevel(career?.careerLevel)
  const stars = career?.currentStars ?? 0
  const maxStars = STARS_PER_LEVEL[level] || 6
  const levelProgressPct = maxStars <= 0 ? 100 : Math.min(100, Math.round((stars / maxStars) * 100))

  const ms = dashboard.learningStats.milestonesByStatus
  const doneM = ms.done ?? 0
  const progM = ms.in_progress ?? 0
  const lockedM = ms.locked ?? 0
  const totalMilestones = doneM + progM + lockedM

  const ex = dashboard.learningStats.examsByOutcome
  const examTotal = Object.values(ex).reduce((a, n) => a + (typeof n === 'number' ? n : 0), 0)

  const promotions = [...dashboard.promotionHistory].sort(
    (a, b) => new Date(b.promotedAt).getTime() - new Date(a.promotedAt).getTime()
  )

  const levelHistory =
    promotions.length > 0
      ? promotions.map((p, i) => ({
          step: promotions.length - i,
          title: LEVEL_LABELS[parseLevel(p.toLevel)],
          meta: [
            formatViDate(p.promotedAt),
            p.fromLevel ? `từ ${LEVEL_LABELS[parseLevel(p.fromLevel)]}` : null,
            p.note?.trim() || null,
          ]
            .filter(Boolean)
            .join(' · '),
          tierLabel: '',
          tierIconKey: undefined as ProfileIconKey | undefined,
          tierClass: 'border border-primary/20 bg-primary/10 text-primary',
          dimmed: i > 0,
        }))
      : [
          {
            step: 1,
            title: LEVEL_LABELS[level],
            meta: 'Chưa có lịch sử thăng cấp ghi nhận · đang ở cấp hiện tại trên hệ thống',
            tierLabel: '',
            tierIconKey: undefined as ProfileIconKey | undefined,
            tierClass: 'border border-primary/20 bg-primary/10 text-primary',
            dimmed: false,
          },
        ]

  const learningTimeline: MyProfilePage['learningTimeline'] = learningPath.milestones.map((m) => {
    const b = milestoneBadge(m.status)
    const minL = LEVEL_LABELS[parseLevel(m.minCareerLevel)]
    const metaParts = [
      m.description?.trim() || `Yêu cầu tối thiểu: ${minL}`,
      m.completedAt ? `Hoàn thành: ${formatViDate(m.completedAt)}` : null,
    ].filter(Boolean)
    return {
      title: m.title,
      titleIconKey: LEVEL_TITLE_ICONS[parseLevel(m.minCareerLevel)],
      meta: metaParts.join(' · '),
      badge: b.badge,
      badgeClass: b.badgeClass,
      cardClass: b.cardClass,
      dimmed: b.dimmed,
    }
  })

  const examSummaryRows: MyProfilePage['examSummary'] = [
    { label: 'Tổng kỳ thi', value: String(examTotal) },
    {
      label: 'Đạt',
      value: String(ex.DAT ?? 0),
      valueClass: 'text-emerald-800',
    },
    {
      label: 'Bảo lưu',
      value: String(ex.BAO_LUU ?? 0),
      valueClass: 'text-amber-800',
    },
    {
      label: 'Chờ học lại',
      value: String(ex.CHO_HOC_LAI ?? 0),
    },
  ]

  const examCards: MyProfilePage['exams'] = exams.map((e) => {
    const st = examCardStyle(e.outcome)
    const title = e.examLabel?.trim() || e.examCode?.trim() || 'Kỳ thi'
    return {
      title,
      badge: st.badge,
      badgeIconKey: st.badgeIconKey,
      badgeClass: st.badgeClass,
      cardClass: st.cardClass,
      stats: [
        { label: 'Điểm', value: e.score != null ? String(e.score) : '—' },
        { label: 'Kỳ', value: e.periodLabel?.trim() || '—' },
        { label: 'Ngày', value: formatViDate(e.classifiedAt) },
      ],
      note: e.graderNote?.trim() || undefined,
    }
  })

  const workTimeline: MyProfilePage['workTimeline'] = [...LEVELS].reverse().map((code, revIdx) => {
    const idx = LEVELS.indexOf(level)
    const stepIx = LEVELS.indexOf(code)
    const isCurrent = code === level
    const isPast = stepIx < idx
    const isFuture = stepIx > idx
    return {
      title: LEVEL_LABELS[code],
      titleIconKey: LEVEL_TITLE_ICONS[code],
      meta: isCurrent
        ? `Sao ${stars}/${maxStars || '—'} trong cấp`
        : isPast
          ? 'Đã hoàn thành giai đoạn'
          : 'Chưa tới mốc này',
      badge: isCurrent ? 'Hiện tại' : isPast ? 'Đã qua' : 'Chưa mở',
      badgeClass: isCurrent
        ? 'bg-primary/15 text-primary'
        : isPast
          ? 'bg-emerald-100 text-emerald-800'
          : 'border border-border bg-muted text-muted-foreground',
      cardClass: isCurrent
        ? 'border-primary/30 bg-primary/5'
        : isPast
          ? 'border-border bg-white'
          : 'border-border bg-muted/40 opacity-85',
      dimmed: isFuture,
      extra:
        revIdx === LEVELS.length - 1 && hr.startDateWork?.trim()
          ? `Vào làm: ${hr.startDateWork}`
          : undefined,
    }
  })

  const phoneDisplay = hr.phonePrimary?.trim() || ''

  const birth = hr.birthDate?.trim() || '—'

  const achievements: MyProfilePage['achievements'] = []
  if (doneM > 0) {
    achievements.push({
      iconKey: 'check',
      name: 'Mốc lộ trình',
      sub: `Đã hoàn thành ${doneM} mốc`,
      earned: true,
    })
  }
  if (progM > 0) {
    achievements.push({
      iconKey: 'zap',
      name: 'Đang học tập',
      sub: `${progM} mốc đang thực hiện`,
      earned: true,
    })
  }
  if ((ex.DAT ?? 0) > 0) {
    achievements.push({
      iconKey: 'trophy',
      name: 'Kỳ thi đạt',
      sub: `${ex.DAT} lần đạt`,
      earned: true,
    })
  }

  return {
    hrSnapshot: {
      displayName: hr.displayName,
      fullNameLegal: hr.fullNameLegal,
      email: hr.email,
      phonePrimary: hr.phonePrimary,
    },
    placement: { levelId: level, starId: stars },
    statsOverview: [
      {
        iconKey: 'check',
        label: 'Mốc hoàn thành',
        value: totalMilestones ? `${doneM}/${totalMilestones}` : '—',
        valueClass: 'text-emerald-800',
      },
      {
        iconKey: 'circleDot',
        label: 'Mốc đang học',
        value: String(progM),
      },
      {
        iconKey: 'clipboard',
        label: 'Mốc chưa mở',
        value: String(lockedM),
      },
      {
        iconKey: 'graduation',
        label: 'Kỳ thi đã ghi nhận',
        value: String(examTotal),
      },
      {
        iconKey: 'calendar',
        label: 'Ngày vào làm (HR)',
        value: hr.startDateWork?.trim() || '—',
      },
    ],
    achievements,
    currentLevel: {
      title: LEVEL_LABELS[level],
      titleIconKey: LEVEL_TITLE_ICONS[level],
      tierLabel: career?.eligiblePromote ? 'Đủ ĐK thăng cấp' : '',
      tierIconKey: career?.eligiblePromote ? 'sparkles' : undefined,
      progressLine: `Tiến độ sao ${stars}/${maxStars || '—'} trong cấp ${LEVEL_LABELS[level]}`,
      filledStars: stars,
      totalStars: maxStars || 6,
      currentStarIndex: stars,
      levelProgressPct,
    },
    levelHistory,
    learningPathSummary: [
      {
        label: 'Cấp hiện tại',
        value: LEVEL_LABELS[parseLevel(learningPath.careerLevel)],
      },
      {
        label: 'Mốc hoàn thành',
        value: totalMilestones ? `${Math.round((doneM / totalMilestones) * 100)}%` : '—',
        valueClass: 'text-emerald-800',
      },
      {
        label: 'Sao trong cấp',
        value: maxStars ? `${learningPath.currentStars} / ${maxStars}` : '—',
      },
      {
        label: 'Số mốc lộ trình',
        value: String(learningPath.milestones.length),
      },
    ],
    learningTimeline,
    examSummary: examSummaryRows,
    exams: examCards.length > 0 ? examCards : [],
    workSummary: [
      { label: 'Cấp hiện tại', value: LEVEL_LABELS[level] },
      {
        label: 'Sao',
        value: maxStars ? `${stars} / ${maxStars}` : '—',
      },
      {
        label: 'Đủ điều kiện thăng cấp',
        value: career?.eligiblePromote ? 'Có' : 'Chưa',
      },
      { label: 'Đợt thi đạt', value: String(ex.DAT ?? 0) },
    ],
    workTimeline,
    orgInfo: {
      roleBadge: '',
      department: hr.departmentName?.trim() || '—',
      team: hr.teamGroup?.trim() || '—',
      employeeCode: hr.employeeCodePrimary?.trim() || '—',
      startDate: hr.startDateWork?.trim() || '—',
    },
    personalInfo: {
      phone: phoneDisplay,
      birthDate: birth,
    },
    security: {
      lastPasswordChange: '—',
    },
    userRecord: userSelf,
    nextStarTopics: dashboard.nextStarTopics,
  }
}
