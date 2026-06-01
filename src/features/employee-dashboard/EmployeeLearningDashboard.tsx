import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { BarChart3, GraduationCap, Medal, Sparkles, Target, Trophy } from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { ProgressStar } from '@/components/shared/ProgressStar/ProgressStar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { useMyDashboard } from '@/features/dashboard/hooks'
import { DashboardKpiOkrZone } from '@/features/employee-dashboard/components/DashboardKpiOkrZone'
import { VinhDanhSlide } from '@/features/employee-dashboard/components/VinhDanhSlide'
import { DashboardLearningZone } from '@/features/employee-dashboard/components/DashboardLearningZone'
import { ManagerHrSnapshotCards } from '@/features/employee-dashboard/components/ManagerHrSnapshotCards'
import { ManagerLearningOpsZone } from '@/features/employee-dashboard/components/ManagerLearningOpsZone'
import {
  ManagerSharedReportPeriodFilter,
  type ManagerReportPeriod,
} from '@/features/employee-dashboard/components/ManagerSharedReportPeriodFilter'
import { CARD_ENTRANCE_HOVER, STAR_POP, staggerStyle } from '@/lib/cardMotion'
import { LEVEL_LABELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { Button } from '@/components/ui/button'
import { PromotionCelebrationModal } from '@/components/shared/PromotionCelebrationModal'
import { useAuthStore } from '@/stores/auth.store'
import type { Role, StaffLevel } from '@/types/auth'

function kpiOkrPaths(role: Role | undefined): { kpiOkr: string } {
  if (role === 'LEADER') return { kpiOkr: '/leader/kpi-okr' }
  if (role === 'MANAGER') return { kpiOkr: '/monthly-report' }
  return { kpiOkr: '/kpi-okr' }
}

type DashboardTab = 'learning' | 'kpi'

function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function monthLabelVi(d: Date): string {
  return `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}`
}

function formatDepartment(departmentId: string): string {
  return `PB · ${shortId(departmentId)}`
}

const quartOut = '[transition-timing-function:cubic-bezier(0.25,1,0.48,1)]'

const LEVEL_FRAMES: Record<LevelCode, string> = {
  tap_su: '/khung_avatar/khung_avatar_tap_su.png',
  biet_viec: '/khung_avatar/khung_avatar_biet_viec.png',
  duoc_viec: '/khung_avatar/khung_avatar_duoc_viec.png',
  dong_gop_ket_qua: '/khung_avatar/khung_avatar_ket_qua.png',
  tuong: '/khung_avatar/khung_avatar_tuong.png',
}

function parseLevelFromStaff(staffLevel: StaffLevel | undefined): LevelCode | null {
  if (staffLevel === 'PROBATION') return 'tap_su'
  if (staffLevel === 'PROFICIENT') return 'biet_viec'
  if (staffLevel === 'GENERAL') return 'tuong'
  return null
}

function formatDateVi(raw: string | null | undefined): string {
  const text = raw?.trim()
  if (!text) return '—'
  const numCheck = /^\d+$/.test(text) ? parseInt(text, 10) : text
  const asDate = new Date(numCheck)
  if (!Number.isNaN(asDate.getTime())) return asDate.toLocaleDateString('vi-VN')
  return text
}

const achievementCardStyles = [
  {
    icon: Trophy,
    panel:
      'border-amber-500/25 bg-gradient-to-br from-primary/12 via-card to-amber-50/90 shadow-[0_12px_40px_-12px_rgb(217_119_6/0.22)]',
    iconWrap:
      'bg-gradient-to-br from-amber-400 to-tier-gold text-white shadow-lg shadow-amber-500/35',
  },
  {
    icon: Target,
    panel:
      'border-primary/30 bg-gradient-to-br from-primary/[0.14] via-card to-accent/15 shadow-[var(--shadow-game-float)]',
    iconWrap:
      'bg-gradient-to-br from-primary to-primary-600 text-primary-foreground shadow-lg shadow-primary/40',
  },
  {
    icon: GraduationCap,
    panel:
      'border-accent/30 bg-gradient-to-br from-accent/12 via-card to-info-muted/50 shadow-[0_12px_36px_-14px_rgb(13_148_136/0.25)]',
    iconWrap:
      'bg-gradient-to-br from-accent to-[#0f766e] text-accent-foreground shadow-lg shadow-accent/30',
  },
  {
    icon: BarChart3,
    panel:
      'border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] via-card to-primary/[0.06] shadow-[0_12px_36px_-12px_rgb(5_150_105/0.2)]',
    iconWrap:
      'bg-gradient-to-br from-emerald-500 to-[#047857] text-white shadow-lg shadow-emerald-600/30',
  },
] as const

export function EmployeeLearningDashboard() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role
  const showKpiZone = role === 'MEMBER' || role === 'LEADER' || role === 'MANAGER'
  const isManagerLearningDash = role === 'MANAGER'
  const paths = kpiOkrPaths(role)
  const [tab, setTab] = useState<DashboardTab>('learning')
  const [isPending, startTransition] = useTransition()
  const handleTabChange = (t: DashboardTab) => {
    startTransition(() => setTab(t))
  }

  const [managerReportPeriod, setManagerReportPeriod] = useState<ManagerReportPeriod>(() => {
    const d = new Date()
    return {
      reportYear: d.getFullYear(),
      rangeStartMonth: d.getMonth() + 1,
      rangeEndMonth: d.getMonth() + 1,
    }
  })

  const managerKpiPeriodBridge = useMemo(
    () => ({
      reportYear: managerReportPeriod.reportYear,
      rangeStartMonth: managerReportPeriod.rangeStartMonth,
      rangeEndMonth: managerReportPeriod.rangeEndMonth,
      setReportYear: (y: number) =>
        setManagerReportPeriod((p) => ({
          ...p,
          reportYear: Math.min(2035, Math.max(2020, y)),
        })),
      setRangeStartMonth: (m: number) => {
        const mm = Math.min(12, Math.max(1, m))
        setManagerReportPeriod((p) => ({
          ...p,
          rangeStartMonth: mm,
          rangeEndMonth: p.rangeEndMonth < mm ? mm : p.rangeEndMonth,
        }))
      },
      setRangeEndMonth: (m: number) => {
        const mm = Math.min(12, Math.max(1, m))
        setManagerReportPeriod((p) => ({
          ...p,
          rangeStartMonth: p.rangeStartMonth > mm ? mm : p.rangeStartMonth,
          rangeEndMonth: mm,
        }))
      },
    }),
    [managerReportPeriod]
  )

  const { data: meDashboard, isLoading } = useMyDashboard({ enabled: Boolean(user) })
  const greetingName = user?.name?.trim() || 'bạn'
  const apiUser = meDashboard?.user
  const apiCareer = meDashboard?.career
  const levelFromStaff = parseLevelFromStaff(meDashboard?.staffLevel)
  const levelKey: LevelCode = levelFromStaff ?? apiCareer?.careerLevel ?? 'tap_su'
  const levelLabel = LEVEL_LABELS[levelKey]
  const maxStars = STARS_PER_LEVEL[levelKey]
  const filledStars = apiCareer?.currentStars ?? meDashboard?.levelSource?.starCount ?? 0

  const avatarName = apiUser?.fullNameLegal?.trim() || user?.name || 'User'
  const teamLine = isLoading ? 'Loading...' : apiUser?.teamGroup?.trim() || 'Khác'
  const deptLine = isLoading
    ? 'Loading...'
    : apiUser?.departmentName?.trim() || (user ? formatDepartment(user.departmentId) : '—')
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const fullName = isLoading ? 'Loading...' : apiUser?.fullNameLegal?.trim() || user?.name || '—'
  const birthDate = isLoading ? 'Loading...' : formatDateVi(apiUser?.birthDate)
  const jobTitleValue = isLoading ? 'Loading...' : apiUser?.jobTitle || '—'
  const teamPositionValue = isLoading ? 'Loading...' : apiUser?.teamPosition?.trim() || '—'
  const levelLabelValue = isLoading ? 'Loading...' : levelLabel
  const promotionHistory = meDashboard?.promotionHistory ?? []
  const highlightAchievements = meDashboard?.highlightAchievements ?? []

  const starPct = maxStars > 0 ? Math.round((filledStars / maxStars) * 100) : 0

  // ─── Promotion Celebration Detection ───
  const [celebrationPromotion, setCelebrationPromotion] = useState<{
    fromLevel: LevelCode | null
    toLevel: LevelCode
    promotedAt: string
    displayName: string
    nextStarTopics?: Array<{ topic: string; objectives: string[] }>
  } | null>(null)

  useEffect(() => {
    if (isLoading || !meDashboard) return

    const history = meDashboard.promotionHistory ?? []
    if (history.length === 0) {
      console.log('[Celebration] No promotion history found.')
      return
    }

    // Tìm thăng cấp gần nhất trong 7 ngày gần đây
    const now = Date.now()
    const detectWindowMs = 7 * 24 * 60 * 60 * 1000
    const recentPromo = history.find((p: any) => {
      // 1. Level up: toLevel khác fromLevel (hoặc fromLevel null)
      const isLevelUp = p.toLevel && (!p.fromLevel || p.fromLevel !== p.toLevel)

      // 2. Star up: toLevel giống fromLevel nhưng note có chữ "Sao"
      const isStarUp =
        p.fromLevel &&
        p.toLevel &&
        p.fromLevel === p.toLevel &&
        (p.note?.toLowerCase().includes('sao') || p.note?.includes('⭐'))

      if (!isLevelUp && !isStarUp) return false

      const promotedAt = new Date(p.promotedAt).getTime()
      const isRecent = now - promotedAt < detectWindowMs

      return isRecent
    })

    if (!recentPromo) {
      console.log('[Celebration] No recent promotion in the last 7 days.')
      return
    }

    // Kiểm tra xem user đã dismiss chưa (localStorage)
    const dismissKey = `promo_seen_${user?.id}_${new Date(recentPromo.promotedAt).getTime()}`
    if (localStorage.getItem(dismissKey)) {
      console.log('[Celebration] Promotion already seen/dismissed.')
      return
    }

    console.log('[Celebration] Triggering celebration for:', recentPromo)

    setCelebrationPromotion({
      fromLevel: recentPromo.fromLevel as LevelCode,
      toLevel: recentPromo.toLevel as LevelCode,
      promotedAt: recentPromo.promotedAt,
      displayName: recentPromo.note?.includes('Sao')
        ? `${greetingName} — ${recentPromo.note}`
        : greetingName,
      nextStarTopics: (meDashboard as any).nextStarTopics,
    })
  }, [isLoading, meDashboard, user?.id, greetingName])

  const handleDismissCelebration = useCallback(() => {
    if (celebrationPromotion && user?.id) {
      const dismissKey = `promo_seen_${user.id}_${new Date(celebrationPromotion.promotedAt).getTime()}`
      localStorage.setItem(dismissKey, '1')
    }
    setCelebrationPromotion(null)
  }, [celebrationPromotion, user?.id])

  return (
    <div className="relative -m-5 flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      {/* Promotion Celebration Modal */}
      {celebrationPromotion && (
        <PromotionCelebrationModal
          fromLevel={celebrationPromotion.fromLevel}
          toLevel={celebrationPromotion.toLevel}
          displayName={celebrationPromotion.displayName}
          promotedAt={celebrationPromotion.promotedAt}
          nextStarTopics={celebrationPromotion.nextStarTopics}
          onDismiss={handleDismissCelebration}
        />
      )}
      {/* Subtle background */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.16),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,hsl(var(--accent)/0.12),transparent_50%)]"
        aria-hidden
      />

      <div className="page-shell relative z-[1] space-y-6 pb-10">
        <VinhDanhSlide />
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-gradient-to-r from-primary/[0.12] to-accent/[0.1] px-3 py-0.5 text-xs font-bold uppercase tracking-widest text-primary shadow-sm">
              <Sparkles className="h-3 w-3" aria-hidden />
              {isManagerLearningDash ? 'Quản lý' : 'Cá nhân'}
            </div>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>
                {isManagerLearningDash ? 'Tổng quan quản lý' : 'Tổng quan cá nhân'}
              </span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>
              {isManagerLearningDash ? (
                <>Tổng quan nhân sự, học tập &amp; KPI theo kỳ báo cáo.</>
              ) : (
                <>
                  Chào <span className="font-semibold text-primary">{greetingName}</span>, thu thập
                  sao và leo hạng.
                </>
              )}
            </p>
          </div>
          {!isManagerLearningDash ? (
            <div
              className={cn(
                'inline-flex items-center gap-2 self-start rounded-2xl border border-primary/25 bg-card/90 px-4 py-2 shadow-[var(--shadow-game-float)] backdrop-blur-sm md:self-auto',
                quartOut,
                'transition-transform duration-300 hover:scale-[1.03] hover:border-primary/40'
              )}
            >
              <span className="bg-gradient-to-r from-primary to-primary-600 bg-clip-text font-bold text-transparent">
                {monthLabelVi(new Date())}
              </span>
            </div>
          ) : null}
        </section>

        {/* MEMBER: Profile section */}
        {!isManagerLearningDash ? (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-4" aria-label="Thông tin tóm tắt">
            {/* Avatar + Stars */}
            <div
              className={cn(
                'group relative overflow-hidden rounded-2xl p-[1.5px] shadow-[0_20px_50px_-24px_hsl(var(--primary)/0.45)]',
                'bg-gradient-to-br from-accent/55 via-primary/50 to-primary-600/70',
                quartOut
              )}
            >
              <div
                className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden rounded-[calc(1.75rem-1.5px)] px-5 py-7',
                  'bg-gradient-to-br from-[hsl(var(--accent)/0.11)] via-card to-[hsl(var(--primary)/0.12)]',
                  'ring-1 ring-inset ring-white/60 dark:ring-white/10'
                )}
              >
                {user && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative flex h-36 w-36 items-center justify-center">
                      <div
                        className="pointer-events-none absolute inset-4 rounded-full bg-gradient-to-tr from-primary/40 via-accent/30 to-primary-600/45 opacity-90 blur-xl"
                        aria-hidden
                      />
                      <EmployeeAvatar
                        name={avatarName}
                        photoUrl={resolvePublicAssetUrl(user?.portraitRef || apiUser?.portraitRef)}
                        className="relative z-10 h-24 w-24 text-xl shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.45)]"
                      />
                      <img
                        src={LEVEL_FRAMES[levelKey]}
                        alt=""
                        aria-hidden
                        className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain"
                      />
                    </div>
                    <span className="whitespace-nowrap rounded-full border border-white/40 bg-gradient-to-r from-primary to-accent px-3 py-0.5 text-xs font-black uppercase tracking-wide text-primary-foreground shadow-[0_6px_20px_hsl(var(--primary)/0.4)]">
                      {levelLabel}
                    </span>
                  </div>
                )}

                {maxStars > 0 && (
                  <div className="relative w-full text-center">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                      Sao
                    </p>
                    <div
                      className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-primary/20 bg-gradient-to-b from-white/80 to-primary/[0.06] px-3 py-3 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.85)] dark:from-card/90 dark:to-primary/[0.08]"
                      role="img"
                      aria-label={`${filledStars} trên ${maxStars} sao`}
                    >
                      {Array.from({ length: maxStars }, (_, i) => (
                        <span
                          key={i}
                          className={cn('inline-flex rounded-sm', STAR_POP)}
                          style={staggerStyle(i, 55)}
                        >
                          <ProgressStar
                            filled={i < filledStars}
                            variant="primary"
                            className="h-6 w-6 sm:h-7 sm:w-7"
                          />
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-base font-black tabular-nums tracking-tight text-foreground">
                      <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {filledStars}
                      </span>
                      <span className="text-muted-foreground/80">/{maxStars}</span>{' '}
                      <span className="text-xs font-bold text-muted-foreground">sao</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Info card */}
            <div
              className={cn(
                'relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.06] p-5 shadow-[var(--shadow-game-float)] lg:col-span-3',
                quartOut,
                CARD_ENTRANCE_HOVER
              )}
            >
              <div
                className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-[100%] bg-gradient-to-bl from-accent/10 to-transparent"
                aria-hidden
              />
              <div className="relative mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-primary">
                  Thông tin
                </h2>
                <span className="rounded-full border border-amber-500/30 bg-tier-gold-muted/80 px-2 py-0.5 text-xs font-black tabular-nums text-tier-gold shadow-sm">
                  XP · {starPct + 24}%
                </span>
              </div>
              <dl className="relative grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  ['Họ tên', fullName],
                  ['Ngày sinh', birthDate],
                  ['Phòng ban', deptLine],
                  ['Vị trí', teamPositionValue],
                  ['Vị trí chuyên môn', jobTitleValue],
                  ['Cấp độ', levelLabelValue],
                ].map(([label, value], idx) => (
                  <div
                    key={label}
                    className={cn(
                      'rounded-xl border border-transparent bg-gradient-to-r from-muted/40 to-transparent px-3 py-2',
                      idx % 2 === 0 ? 'sm:border-r sm:border-border/40 sm:pr-4' : ''
                    )}
                  >
                    <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-0.5 break-words text-sm font-bold text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        ) : null}

        {!isManagerLearningDash ? (
          <section
            className="rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[var(--shadow-card)]"
            aria-label="Lịch sử thăng cấp"
          >
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
              Lịch sử thăng cấp
            </div>
            {isLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : promotionHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có lịch sử.</p>
            ) : (
              <ul className="space-y-1.5">
                {promotionHistory.map((p, idx) => (
                  <li
                    key={`${p.promotedAt}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-foreground">
                      {p.fromLevel ? LEVEL_LABELS[p.fromLevel] : '—'} → {LEVEL_LABELS[p.toLevel]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateVi(p.promotedAt)}
                      {p.note ? ` · ${p.note}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {!isManagerLearningDash ? (
          <section aria-labelledby="dash-highlight-achievements">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2
                id="dash-highlight-achievements"
                className="flex items-center gap-2 text-base font-black tracking-tight text-foreground"
              >
                <Medal className="h-5 w-5 text-amber-500" />
                Thành tựu
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {highlightAchievements.length === 0 ? (
                <div className="rounded-2xl border border-border/80 bg-card px-4 py-4 text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">
                  Chưa có thành tựu.
                </div>
              ) : (
                highlightAchievements.map((achievement, idx) => {
                  const style =
                    achievementCardStyles[idx % achievementCardStyles.length] ??
                    achievementCardStyles[0]!
                  const AchievementIcon = style.icon
                  return (
                    <div
                      key={achievement.id}
                      className={cn(
                        'group relative overflow-hidden rounded-2xl border p-4',
                        style.panel,
                        quartOut,
                        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0'
                      )}
                    >
                      <div className="relative mb-2 flex items-start justify-between gap-2">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                            style.iconWrap
                          )}
                        >
                          <AchievementIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                        </div>
                        <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs font-black uppercase tracking-tight text-foreground shadow-sm backdrop-blur-sm">
                          {achievement.badge?.trim() ||
                            (achievement.score != null ? `+${achievement.score}` : 'Nổi bật')}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">
                        {achievement.title}
                      </h3>
                      <p className="mt-1 text-xs font-semibold leading-snug text-foreground">
                        {achievement.description?.trim() || 'Đã ghi nhận một thành tựu.'}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-primary">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                        {achievement.levelScope?.trim() || 'Cá nhân'}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        ) : null}

        {showKpiZone ? (
          <div className="space-y-5">
            {isManagerLearningDash && (
              <>
                <ManagerSharedReportPeriodFilter
                  value={managerReportPeriod}
                  onChange={setManagerReportPeriod}
                />
                <ManagerHrSnapshotCards
                  reportYear={managerReportPeriod.reportYear}
                  rangeStartMonth={managerReportPeriod.rangeStartMonth}
                  rangeEndMonth={managerReportPeriod.rangeEndMonth}
                />
              </>
            )}
            {/* Tab switcher */}
            <div
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              role="tablist"
              aria-label="Chuyển tab"
            >
              <div className="inline-flex rounded-full border border-primary/20 bg-gradient-to-r from-primary/[0.1] via-card/95 to-accent/[0.1] p-1 shadow-inner shadow-primary/10">
                <Button
                  type="button"
                  variant="ghost"
                  role="tab"
                  id="dash-tab-learning"
                  aria-selected={tab === 'learning'}
                  aria-controls="dash-panel-learning"
                  tabIndex={tab === 'learning' ? 0 : -1}
                  onClick={() => handleTabChange('learning')}
                  className={cn(
                    'inline-flex h-auto min-h-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-300',
                    tab === 'learning'
                      ? 'bg-gradient-to-r from-primary to-primary-600 text-primary-foreground shadow-[var(--shadow-game-float)] ring-2 ring-primary/25 ring-offset-2 ring-offset-background motion-reduce:ring-0 motion-reduce:ring-offset-0'
                      : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
                    isPending && tab === 'learning' && 'opacity-70'
                  )}
                >
                  <GraduationCap className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  Học tập
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  role="tab"
                  id="dash-tab-kpi"
                  aria-selected={tab === 'kpi'}
                  aria-controls="dash-panel-kpi"
                  tabIndex={tab === 'kpi' ? 0 : -1}
                  onClick={() => handleTabChange('kpi')}
                  className={cn(
                    'inline-flex h-auto min-h-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-300',
                    tab === 'kpi'
                      ? 'bg-gradient-to-r from-primary to-primary-600 text-primary-foreground shadow-[var(--shadow-game-float)] ring-2 ring-primary/25 ring-offset-2 ring-offset-background motion-reduce:ring-0 motion-reduce:ring-offset-0'
                      : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
                    isPending && tab === 'kpi' && 'opacity-70'
                  )}
                >
                  <Target className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  KPI · OKR
                </Button>
              </div>
            </div>

            <div
              id="dash-panel-learning"
              role="tabpanel"
              aria-labelledby="dash-tab-learning"
              hidden={tab !== 'learning'}
            >
              {tab === 'learning' &&
                (isManagerLearningDash ? (
                  <ManagerLearningOpsZone
                    reportYear={managerReportPeriod.reportYear}
                    rangeStartMonth={managerReportPeriod.rangeStartMonth}
                    rangeEndMonth={managerReportPeriod.rangeEndMonth}
                  />
                ) : (
                  <DashboardLearningZone
                    isLoading={isLoading}
                    currentLevel={levelKey}
                    currentStars={filledStars}
                  />
                ))}
            </div>
            <div
              id="dash-panel-kpi"
              role="tabpanel"
              aria-labelledby="dash-tab-kpi"
              hidden={tab !== 'kpi'}
            >
              {tab === 'kpi' && (
                <>
                  {isManagerLearningDash && <VinhDanhSlide className="mb-6" />}
                  <DashboardKpiOkrZone
                    role={role as 'LEADER' | 'MANAGER' | 'MEMBER'}
                    paths={paths}
                    managerReportPeriodFromParent={
                      isManagerLearningDash ? managerKpiPeriodBridge : null
                    }
                  />
                </>
              )}
            </div>
          </div>
        ) : (
          <section aria-labelledby="dash-section-learning-only">
            <h2 id="dash-section-learning-only" className="sr-only">
              Học tập
            </h2>
            <DashboardLearningZone
              isLoading={isLoading}
              currentLevel={levelKey}
              currentStars={filledStars}
            />
          </section>
        )}
      </div>
    </div>
  )
}
