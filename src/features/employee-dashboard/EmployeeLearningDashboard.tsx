import { useMemo, useState, useTransition } from 'react'
import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  Medal,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
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
import { Button } from '@/components/ui/button'
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

  const teamLine = apiUser?.teamGroup?.trim() || 'Khác'
  const deptLine =
    apiUser?.departmentName?.trim() || (user ? formatDepartment(user.departmentId) : '—')
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const fullName = apiUser?.fullNameLegal?.trim() || user?.name || '—'
  const birthDate = formatDateVi(apiUser?.birthDate)
  const promotionHistory = meDashboard?.promotionHistory ?? []
  const highlightAchievements = meDashboard?.highlightAchievements ?? []

  const starPct = maxStars > 0 ? Math.round((filledStars / maxStars) * 100) : 0

  return (
    <div className="relative -m-5 flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      {/* Nền gamification — blob & lưới nhẹ, trong palette Lumina */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.16),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,hsl(var(--accent)/0.12),transparent_50%),radial-gradient(ellipse_60%_40%_at_0%_80%,hsl(var(--primary)/0.08),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-primary/20 blur-3xl motion-safe:animate-[dash-glow-orb_8s_ease-in-out_infinite] motion-reduce:animate-none"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-40 h-80 w-80 rounded-full bg-accent/25 blur-3xl motion-safe:animate-[dash-glow-orb_10s_ease-in-out_infinite_1s] motion-reduce:animate-none"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(hsl(var(--primary)/0.06)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.06)_1px,transparent_1px)] [background-size:48px_48px] motion-reduce:opacity-20"
        aria-hidden
      />

      <div className="page-shell relative z-[1] space-y-8 pb-10">
        <section
          className={cn(
            'flex flex-col justify-between gap-4 md:flex-row md:items-end',
            'motion-safe:animate-[dash-fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'
          )}
        >
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/[0.12] to-accent/[0.1] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-primary shadow-sm">
              <Sparkles
                className="h-3.5 w-3.5 motion-safe:animate-pulse motion-reduce:animate-none"
                aria-hidden
              />
              Không gian tiến bộ
            </div>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>
                {isManagerLearningDash ? 'Dashboard quản lý' : 'Dashboard Cá nhân'}
              </span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>
              {isManagerLearningDash ? (
                <>
                  Tổng quan{' '}
                  <span className="font-semibold text-primary">học tập, thi &amp; nhân sự</span>{' '}
                  theo kỳ báo cáo.
                </>
              ) : (
                <>
                  Chào mừng trở lại,{' '}
                  <span className="font-semibold text-primary">{greetingName}</span>. Thu thập sao,
                  hoàn thành nhiệm vụ và leo bảng xếp hạng nội bộ.
                </>
              )}
            </p>
          </div>
          {!isManagerLearningDash ? (
            <div
              className={cn(
                'inline-flex items-center gap-2 self-start rounded-2xl border border-primary/25 bg-card/90 px-4 py-2.5 shadow-[var(--shadow-game-float)] backdrop-blur-sm md:self-auto',
                quartOut,
                'motion-safe:animate-[dash-fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none',
                CARD_ENTRANCE_HOVER,
                'transition-transform duration-300 hover:scale-[1.03] hover:border-primary/40'
              )}
              style={{ animationDelay: '80ms' }}
            >
              <CalendarDays
                className="h-5 w-5 shrink-0 text-primary motion-safe:animate-[dash-float-slow_5s_ease-in-out_infinite] motion-reduce:animate-none"
                strokeWidth={2}
                aria-hidden
              />
              <span className="bg-gradient-to-r from-primary to-primary-600 bg-clip-text font-bold text-transparent">
                {monthLabelVi(new Date())}
              </span>
            </div>
          ) : null}
        </section>

        {/* Khung trên: cá nhân (avatar) — quản lý: tổng quan vận hành nằm trong tab Học tập & thi cử */}
        {!isManagerLearningDash ? (
          <section
            className={cn(
              'grid grid-cols-1 gap-6 lg:grid-cols-4',
              'motion-safe:animate-[dash-fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'
            )}
            style={{ animationDelay: '100ms' }}
            aria-label="Thông tin tóm tắt"
          >
            <div
              className={cn(
                'group relative overflow-hidden rounded-[1.75rem] p-[1.5px] shadow-[0_20px_50px_-24px_hsl(var(--primary)/0.45)]',
                'bg-gradient-to-br from-accent/55 via-primary/50 to-primary-600/70',
                quartOut,
                'transition-all duration-500 hover:shadow-[0_24px_56px_-20px_hsl(var(--accent)/0.35),0_16px_40px_-20px_hsl(var(--primary)/0.3)] motion-reduce:transition-none'
              )}
            >
              <div
                className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-7 overflow-hidden rounded-[1.6875rem] px-6 py-9',
                  'bg-gradient-to-br from-[hsl(var(--accent)/0.11)] via-card to-[hsl(var(--primary)/0.12)]',
                  'ring-1 ring-inset ring-white/60 dark:ring-white/10'
                )}
              >
                <div
                  className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/20 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-12 -left-14 h-40 w-40 rounded-full bg-accent/25 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute left-1/2 top-8 h-px w-3/4 max-w-[200px] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
                  aria-hidden
                />

                {user ? (
                  <div className="relative">
                    <div
                      className="pointer-events-none absolute inset-0 scale-110 rounded-full bg-gradient-to-tr from-primary/40 via-accent/30 to-primary-600/45 opacity-90 blur-xl"
                      aria-hidden
                    />
                    <EmployeeAvatar
                      name={fullName}
                      className="relative z-10 h-28 w-28 text-2xl ring-[3px] ring-white/90 shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.45)] ring-offset-[3px] ring-offset-[hsl(var(--accent)/0.08)] transition-all duration-300 group-hover:ring-primary/35"
                    />
                    <span className="absolute -bottom-1 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/40 bg-gradient-to-r from-primary to-accent px-3.5 py-1 text-[0.58rem] font-black uppercase tracking-wide text-primary-foreground shadow-[0_6px_20px_hsl(var(--primary)/0.4)]">
                      {levelLabel}
                    </span>
                  </div>
                ) : null}

                <div className="relative w-full text-center">
                  <p className="mb-1 inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
                    <span
                      className="h-px w-6 bg-gradient-to-r from-transparent to-primary/50"
                      aria-hidden
                    />
                    Huy hiệu sao
                    <span
                      className="h-px w-6 bg-gradient-to-l from-transparent to-accent/50"
                      aria-hidden
                    />
                  </p>
                  {maxStars > 0 ? (
                    <>
                      <div
                        className={cn(
                          'mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-gradient-to-b from-white/80 to-primary/[0.06] px-4 py-3.5',
                          'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.85),0_12px_32px_-16px_hsl(var(--primary)/0.35)]',
                          'dark:from-card/90 dark:to-primary/[0.08]',
                          'motion-safe:transition-[box-shadow,transform] motion-safe:duration-300 group-hover:shadow-[0_16px_40px_-14px_hsl(var(--accent)/0.3)] motion-reduce:transition-none'
                        )}
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
                              className="h-8 w-8 motion-safe:transition-transform motion-safe:duration-300 sm:h-9 sm:w-9 group-hover:scale-105"
                            />
                          </span>
                        ))}
                      </div>
                      <p className="mt-5 text-lg font-black tabular-nums tracking-tight text-foreground">
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {filledStars}
                        </span>
                        <span className="text-muted-foreground/80">/{maxStars}</span>{' '}
                        <span className="text-sm font-bold text-muted-foreground">sao</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">
                      Giai đoạn {levelLabel} — chưa áp dụng hệ thống sao.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div
              className={cn(
                'relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.06] p-6 shadow-[var(--shadow-game-float)] sm:p-8 lg:col-span-3',
                quartOut,
                'transition-all duration-300 hover:border-primary/25 hover:shadow-[0_20px_44px_-18px_rgb(79_70_229/0.28)] motion-reduce:transition-none',
                CARD_ENTRANCE_HOVER
              )}
            >
              <div
                className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-bl-[100%] bg-gradient-to-bl from-accent/10 to-transparent"
                aria-hidden
              />
              <div className="relative mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[0.65rem] font-bold uppercase tracking-widest text-primary">
                  Thông tin nhân vật
                </h2>
                <span className="rounded-full border border-amber-500/30 bg-tier-gold-muted/80 px-2.5 py-1 text-[0.6rem] font-black tabular-nums text-tier-gold shadow-sm">
                  XP · {starPct + 24}%
                </span>
              </div>
              <dl className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['Họ và tên', fullName],
                  ['Ngày sinh', birthDate],
                  ['Phòng ban', teamLine],
                  ['Vị trí chuyên môn', deptLine],
                  ['Chức vụ', apiUser?.jobTitle || roleLabel],
                  ['Cấp độ học tập', levelLabel],
                ].map(([label, value], idx) => (
                  <div
                    key={label}
                    className={cn(
                      'group/item rounded-xl border border-transparent bg-gradient-to-r from-muted/40 to-transparent px-3 py-3 transition-all duration-300',
                      'hover:border-primary/20 hover:from-primary/[0.07] hover:shadow-sm motion-reduce:transition-none',
                      idx % 2 === 0 ? 'sm:border-r sm:border-border/40 sm:pr-4' : ''
                    )}
                    style={staggerStyle(idx, 45)}
                  >
                    <dt className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover/item:text-primary">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words text-base font-bold text-foreground">
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
            className="rounded-2xl border border-border/80 bg-card/95 p-5 shadow-[var(--shadow-card)]"
            aria-label="Lịch sử thăng cấp"
          >
            <div className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">
              Lịch sử thăng cấp
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : promotionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có lịch sử thăng cấp.</p>
            ) : (
              <ul className="space-y-2">
                {promotionHistory.map((p, idx) => (
                  <li
                    key={`${p.promotedAt}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {p.fromLevel ? LEVEL_LABELS[p.fromLevel] : '—'} -&gt;{' '}
                      {LEVEL_LABELS[p.toLevel]}
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
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2
                  id="dash-highlight-achievements"
                  className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground"
                >
                  <Medal className="h-6 w-6 text-amber-500 motion-safe:animate-[dash-float-slow_4s_ease-in-out_infinite] motion-reduce:animate-none" />
                  Thành tựu nổi bật
                </h2>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Phần thưởng KPI/OKR và mốc học tập — săn thêm điểm mỗi tháng.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {highlightAchievements.length === 0 ? (
                <div className="rounded-2xl border border-border/80 bg-card px-4 py-5 text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">
                  Chưa có thành tựu nổi bật.
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
                        'group relative overflow-hidden rounded-2xl border p-5',
                        style.panel,
                        quartOut,
                        'motion-safe:animate-[profile-card-in_0.65s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none',
                        'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0'
                      )}
                      style={staggerStyle(idx, 70)}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:hidden"
                        aria-hidden
                      >
                        <div className="absolute inset-y-0 -left-1/3 w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent motion-safe:animate-[dash-card-shimmer_1.4s_ease-in-out_infinite] motion-reduce:animate-none" />
                      </div>
                      <div className="relative mb-3 flex items-start justify-between gap-2">
                        <div
                          className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                            style.iconWrap,
                            'motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-110 group-hover:rotate-3'
                          )}
                        >
                          <AchievementIcon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                        </div>
                        <span className="rounded-full bg-background/70 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-tight text-foreground shadow-sm backdrop-blur-sm">
                          {achievement.badge?.trim() ||
                            (achievement.score != null ? `+${achievement.score}` : 'Nổi bật')}
                        </span>
                      </div>
                      <h3 className="relative text-[0.65rem] font-bold uppercase tracking-widest text-foreground/80">
                        {achievement.title}
                      </h3>
                      <p className="relative mt-2 text-sm font-semibold leading-snug text-foreground">
                        {achievement.description?.trim() || 'Đã ghi nhận một thành tựu nổi bật.'}
                      </p>
                      <div className="relative mt-4 flex items-center gap-1.5 text-xs font-bold text-primary">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse motion-reduce:animate-none" />
                        {achievement.levelScope?.trim() || 'Thành tựu cá nhân'}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        ) : null}

        {showKpiZone ? (
          <div className="space-y-6">
            {isManagerLearningDash ? (
              <ManagerSharedReportPeriodFilter
                value={managerReportPeriod}
                onChange={setManagerReportPeriod}
              />
            ) : null}
            {isManagerLearningDash ? (
              <ManagerHrSnapshotCards
                reportYear={managerReportPeriod.reportYear}
                rangeStartMonth={managerReportPeriod.rangeStartMonth}
                rangeEndMonth={managerReportPeriod.rangeEndMonth}
              />
            ) : null}
            <div
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              role="tablist"
              aria-label="Chuyển giữa học tập & thi cử và KPI/OKR"
            >
              <div
                className={cn(
                  'inline-flex rounded-full border border-primary/20 bg-gradient-to-r from-primary/[0.1] via-card/95 to-accent/[0.1] p-1 shadow-inner shadow-primary/10',
                  'motion-safe:animate-[dash-fade-up_0.5s_ease-out_both] motion-reduce:animate-none'
                )}
                style={{ animationDelay: '80ms' }}
              >
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
                    'inline-flex h-auto min-h-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-300',
                    tab === 'learning'
                      ? 'scale-[1.02] bg-gradient-to-r from-primary to-primary-600 text-primary-foreground shadow-[var(--shadow-game-float)] ring-2 ring-primary/25 ring-offset-2 ring-offset-background motion-reduce:scale-100 motion-reduce:ring-0 motion-reduce:ring-offset-0 hover:bg-primary hover:text-primary-foreground'
                      : 'text-muted-foreground hover:bg-background/80 hover:text-foreground hover:shadow-sm',
                    isPending && tab === 'learning' && 'opacity-70'
                  )}
                >
                  <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Học tập &amp; thi cử
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
                    'inline-flex h-auto min-h-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-300',
                    tab === 'kpi'
                      ? 'scale-[1.02] bg-gradient-to-r from-primary to-primary-600 text-primary-foreground shadow-[var(--shadow-game-float)] ring-2 ring-primary/25 ring-offset-2 ring-offset-background motion-reduce:scale-100 motion-reduce:ring-0 motion-reduce:ring-offset-0 hover:bg-primary hover:text-primary-foreground'
                      : 'text-muted-foreground hover:bg-background/80 hover:text-foreground hover:shadow-sm',
                    isPending && tab === 'kpi' && 'opacity-70'
                  )}
                >
                  <Target className="h-4 w-4 shrink-0" strokeWidth={2} />
                  KPI · OKR · Báo cáo
                </Button>
              </div>
            </div>

            <div
              id="dash-panel-learning"
              role="tabpanel"
              aria-labelledby="dash-tab-learning"
              hidden={tab !== 'learning'}
              className="motion-safe:animate-[dash-fade-up_0.4s_ease-out_both] motion-reduce:animate-none"
            >
              {isManagerLearningDash ? (
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
              )}
            </div>
            <div
              id="dash-panel-kpi"
              role="tabpanel"
              aria-labelledby="dash-tab-kpi"
              hidden={tab !== 'kpi'}
              className="motion-safe:animate-[dash-fade-up_0.4s_ease-out_both] motion-reduce:animate-none"
            >
              <DashboardKpiOkrZone
                role={role as 'LEADER' | 'MANAGER' | 'MEMBER'}
                paths={paths}
                managerReportPeriodFromParent={
                  isManagerLearningDash ? managerKpiPeriodBridge : null
                }
              />
            </div>
          </div>
        ) : (
          <section aria-labelledby="dash-section-learning-only">
            <h2 id="dash-section-learning-only" className="sr-only">
              Học tập &amp; thi cử
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
