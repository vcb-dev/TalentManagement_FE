import { useMemo, useState } from 'react'
import { TrendingUp, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Crown,
  FiveStarRank,
  GraduationCap,
  LayoutGrid,
  PROFILE_TAB_ICONS,
  ProfileStarTier,
  Settings,
  Star,
  Target,
  UserCircle,
} from '@/components/icons'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { demoGamificationFromSeed } from '@/lib/demoGamification'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/auth'
import { PROFILE_CONTENT_ICONS, type ProfileIconKey } from '@/features/profile/profileContentIcons'
import type { MyProfilePage } from '@/features/profile/types'

type ProfileTabId = 'overview' | 'learning' | 'exams' | 'work' | 'info'

const TAB_LABELS: Record<ProfileTabId, string> = {
  overview: 'Tổng quan',
  learning: 'Lộ trình học',
  exams: 'Kết quả thi',
  work: 'Lịch sử làm việc',
  info: 'Thông tin',
}

/** Quản lý: không hiển thị lộ trình học & kết quả thi (trọng tâm vận hành team, không phải lộ trình nhân viên). */
function profileTabIdsForRole(role: Role): ProfileTabId[] {
  if (role === 'MANAGER' || role === 'LEADER') {
    return ['overview', 'work', 'info']
  }
  return ['overview', 'learning', 'exams', 'work', 'info']
}

type HeroBadgeItem = { key: string; Icon: LucideIcon; label: string }

function heroBadges(role: Role): HeroBadgeItem[] {
  const base: HeroBadgeItem[] = [
    { key: 'tier', Icon: Award, label: 'Được việc · Gold' },
    { key: 'active', Icon: CheckCircle2, label: 'Hoạt động' },
  ]
  switch (role) {
    case 'MANAGER':
      return [
        { key: 'role', Icon: Briefcase, label: 'Quản lý' },
        ...base,
        { key: 'mentor', Icon: GraduationCap, label: 'Mentor' },
      ]
    case 'LEADER':
      return [
        { key: 'role', Icon: Target, label: 'Trưởng nhóm KPI' },
        ...base,
        { key: 'mentor', Icon: GraduationCap, label: 'Mentor' },
      ]
    case 'TEACHER':
      return [{ key: 'role', Icon: ClipboardList, label: 'Người chấm thi' }, ...base]
    case 'HR_ADMIN':
      return [{ key: 'role', Icon: Building2, label: 'HR' }, ...base]
    case 'BOD':
      return [{ key: 'role', Icon: BarChart3, label: 'BOD' }, ...base]
    default:
      return [{ key: 'role', Icon: UserCircle, label: 'Nhân viên' }, ...base]
  }
}

function starVariants(level: MyProfilePage['currentLevel']): ('filled' | 'current' | 'empty')[] {
  const out: ('filled' | 'current' | 'empty')[] = []
  for (let i = 0; i < level.totalStars; i++) {
    if (i < level.filledStars) out.push('filled')
    else if (i === level.filledStars) out.push('current')
    else out.push('empty')
  }
  return out
}

/** Tông màu theo bậc tier (Gold / Silver / Bronze) — pill trên card vs badge timeline. */
function tierBadgeTone(
  tierIconKey: ProfileIconKey | undefined,
  variant: 'pill' | 'history'
): { wrap: string; icon: string } {
  switch (tierIconKey) {
    case 'award':
      if (variant === 'pill') {
        return {
          wrap:
            'border border-amber-400/45 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/90 text-amber-950 ring-1 ring-amber-300/40 shadow-[0_2px_10px_rgba(245,158,11,0.15)]',
          icon: 'text-amber-700',
        }
      }
      return {
        wrap:
          'border border-amber-500/35 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-white shadow-sm ring-1 ring-amber-400/35',
        icon: 'text-amber-50',
      }
    case 'medal':
      if (variant === 'pill') {
        return {
          wrap:
            'border border-slate-300/60 bg-gradient-to-r from-slate-100 to-slate-200/90 text-slate-800 ring-1 ring-slate-300/50',
          icon: 'text-slate-600',
        }
      }
      return {
        wrap:
          'border border-slate-400/40 bg-gradient-to-r from-slate-500 to-slate-600 text-white ring-1 ring-slate-400/30',
        icon: 'text-slate-100',
      }
    case 'circleDot':
      if (variant === 'pill') {
        return {
          wrap:
            'border border-amber-800/25 bg-gradient-to-r from-amber-100 to-orange-50 text-amber-950 ring-1 ring-amber-300/40',
          icon: 'text-amber-800',
        }
      }
      return {
        wrap:
          'border border-amber-900/20 bg-gradient-to-r from-[#92400e] to-[#b45309] text-white ring-1 ring-amber-900/20',
        icon: 'text-amber-100',
      }
    default:
      return {
        wrap: 'border border-primary/25 bg-primary/10 text-primary',
        icon: 'text-primary',
      }
  }
}

/** Vòng số mốc timeline — đồng bộ Bronze / Silver / Gold với badge bên phải. */
function tierMilestoneCircleClass(tierIconKey: ProfileIconKey | undefined): string {
  switch (tierIconKey) {
    case 'award':
      return 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_2px_8px_rgba(217,119,6,0.38)]'
    case 'medal':
      return 'bg-gradient-to-br from-slate-400 to-slate-600 shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_2px_8px_rgba(71,85,105,0.32)]'
    case 'circleDot':
      return 'bg-gradient-to-br from-amber-800 via-orange-800 to-orange-950 shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_2px_8px_rgba(124,45,18,0.35)]'
    default:
      return 'bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.95)]'
  }
}

/** Chữ nhấn “Đang học” theo tier mốc hiện tại. */
function tierLearningAccentClass(tierIconKey: ProfileIconKey | undefined): string {
  switch (tierIconKey) {
    case 'award':
      return 'text-amber-700'
    case 'medal':
      return 'text-slate-600'
    case 'circleDot':
      return 'text-orange-800'
    default:
      return 'text-primary'
  }
}

export interface MyProfileScreenProps {
  page: MyProfilePage | undefined
  isLoading: boolean
}

export function MyProfileScreen({ page, isLoading }: MyProfileScreenProps) {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<ProfileTabId>('overview')
  const [phoneDraft, setPhoneDraft] = useState<string | undefined>(undefined)

  const role = user?.role ?? 'MEMBER'
  const visibleTabs = useMemo(() => profileTabIdsForRole(role), [role])
  const activeTab = visibleTabs.includes(tab) ? tab : (visibleTabs[0] ?? 'overview')

  const displayName = user?.name ?? 'Nhân viên'
  const email = user?.email ?? '—'
  const badges = heroBadges(role)
  const { points, rank } = useMemo(
    () => demoGamificationFromSeed(user?.email ?? displayName),
    [user?.email, displayName]
  )

  const pageFiltered = useMemo(() => {
    if (!page) return undefined
    let achievements = page.achievements
    let statsOverview = page.statsOverview
    let workSummary = page.workSummary
    if (role === 'MEMBER') {
      achievements = achievements.filter((a) => !a.name.includes('Mentor'))
      statsOverview = statsOverview.filter((s) => !s.label.includes('Mentee'))
      workSummary = workSummary.filter((w) => !w.label.includes('Nâng role'))
    }
    return { ...page, achievements, statsOverview, workSummary }
  }, [page, role])

  const skillsList = useMemo(() => {
    if (!pageFiltered) return [] as { key: string; label: string; iconKey?: ProfileIconKey }[]
    const px = pageFiltered
    const rows: { key: string; label: string; iconKey?: ProfileIconKey }[] = []
    if (px.currentLevel.tierLabel) {
      rows.push({
        key: 'tier',
        label: px.currentLevel.tierLabel,
        iconKey: px.currentLevel.tierIconKey,
      })
    }
    px.achievements
      .filter((a) => a.earned)
      .forEach((a) => {
        rows.push({ key: a.name, label: a.name, iconKey: a.iconKey })
      })
    return rows
  }, [pageFiltered])

  const phoneValue = pageFiltered?.personalInfo.phone ?? ''
  const phoneInput = phoneDraft !== undefined ? phoneDraft : phoneValue

  if (isLoading || !pageFiltered) {
    return (
      <div className="-m-5 flex min-h-[calc(100vh-3rem)] items-center justify-center bg-app-canvas p-8 text-base text-muted-foreground md:-m-6 lg:-m-8">
        {isLoading ? 'Đang tải hồ sơ…' : 'Không có dữ liệu'}
      </div>
    )
  }

  const p = pageFiltered
  const levelStarVariants = starVariants(p.currentLevel)
  const profileScoreDisplay = (points / 1000).toFixed(1).replace('.', ',')
  const rankStarsFive = (p.currentLevel.levelProgressPct / 100) * 5
  const CurrentTitleIcon = p.currentLevel.titleIconKey
    ? PROFILE_CONTENT_ICONS[p.currentLevel.titleIconKey]
    : null
  const CurrentTierIcon = p.currentLevel.tierIconKey
    ? PROFILE_CONTENT_ICONS[p.currentLevel.tierIconKey]
    : null
  const isGoldTier = p.currentLevel.tierIconKey === 'award'
  const tierPill = tierBadgeTone(p.currentLevel.tierIconKey, 'pill')

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-gradient-to-b from-slate-50/80 via-app-canvas to-app-canvas text-base text-foreground md:-m-6 lg:-m-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pb-6 pt-6 md:px-6 lg:flex-row lg:items-start lg:gap-8 lg:pt-8">
        {/* Cột trái — avatar, phân công, kỹ năng (layout tham chiếu gamification) */}
        <aside className="w-full shrink-0 lg:w-[280px]">
          <div className="flex flex-col gap-6 rounded-2xl border border-primary/10 bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-primary/5">
            <div className="relative mx-auto">
              <EmployeeAvatar
                name={displayName}
                showOnlineDot
                className="h-44 w-44 rounded-2xl border-[3px] border-white text-4xl shadow-[var(--shadow-game-float)] ring-4 ring-primary/15"
              />
            </div>

            <div>
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Phân công
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-snug text-foreground">{p.orgInfo.department}</span>
                    <span className="shrink-0 rounded-md bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                      Chính
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    VP · Ngân hàng TMCP Ngoại thương VCB
                  </p>
                </div>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-snug text-foreground">{p.orgInfo.team}</span>
                    <span className="shrink-0 rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                      Phụ
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mã {p.orgInfo.employeeCode} · Vào {p.orgInfo.startDate}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Kỹ năng &amp; huy hiệu
              </div>
              <ul className="space-y-2">
                {skillsList.map((s) => {
                  const Si = s.iconKey ? PROFILE_CONTENT_ICONS[s.iconKey] : null
                  return (
                    <li key={s.key} className="flex items-start gap-2 text-sm leading-snug text-foreground">
                      {Si ? (
                        <Si className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/90" strokeWidth={2} aria-hidden />
                      ) : null}
                      <span>{s.label}</span>
                    </li>
                  )
                })}
              </ul>
              {skillsList.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/5">
            <div className="border-b border-border/80 px-5 py-5 md:px-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{displayName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0 text-primary/70" strokeWidth={2} aria-hidden />
                <span>
                  {p.orgInfo.department} · {p.orgInfo.team}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-primary md:text-xl">
                {ROLE_LABEL_VI[role]} · {p.currentLevel.title}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/60 pt-4">
                <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {profileScoreDisplay}
                </span>
                <FiveStarRank filled={rankStarsFive} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary ring-1 ring-primary/15">
                    <Star className="h-3.5 w-3.5 fill-[#EAB308] text-[#EAB308]" strokeWidth={0} />
                    {points.toLocaleString('vi-VN')} pts
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-900 ring-1 ring-amber-500/20">
                    <Crown className="h-3.5 w-3.5 text-amber-600" strokeWidth={2} />#{rank}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {badges.map(({ key, Icon, label }) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary/90" strokeWidth={2} aria-hidden />
                    {label}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toast.info('Liên hệ IT để đổi mật khẩu (demo)')}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Đổi mật khẩu
                </button>
                <button
                  type="button"
                  onClick={() => toast.info('Liên hệ HR / IT (demo)')}
                  className="rounded-lg border border-primary/25 bg-card px-4 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-primary/[0.06]"
                >
                  Liên hệ hỗ trợ
                </button>
                <button
                  type="button"
                  onClick={() => toast.info('Cài đặt (demo)')}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
                  aria-label="Cài đặt"
                >
                  <Settings className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </div>

            <nav
              className="flex flex-wrap gap-0 border-b border-border px-2 md:px-4"
              aria-label="Mục hồ sơ"
            >
              {visibleTabs.map((id) => {
                const Icon = PROFILE_TAB_ICONS[id]
                const active = activeTab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      'relative flex items-center gap-2 px-3 py-3.5 text-sm font-semibold transition-colors md:px-4',
                      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-85" strokeWidth={2} />
                    {TAB_LABELS[id]}
                    {active ? (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary md:left-4 md:right-4" />
                    ) : null}
                  </button>
                )
              })}
            </nav>

            <div className="page-shell">
        {activeTab === 'overview' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
            <div className="space-y-4">
              <div
                className={cn(
                  'overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(0)}
              >
                <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
                  Thống kê học tập
                </div>
                <div className="space-y-0 px-3.5 py-3">
                  {p.statsOverview.map((row) => {
                    const Ri = row.iconKey ? PROFILE_CONTENT_ICONS[row.iconKey] : null
                    return (
                      <div
                        key={row.label}
                        className="flex justify-between border-b border-border py-2.5 text-sm last:border-0 md:text-base"
                      >
                        <span className="flex items-center gap-2 text-muted-foreground">
                          {Ri ? (
                            <Ri className="h-3.5 w-3.5 shrink-0 text-primary/85" strokeWidth={2} aria-hidden />
                          ) : null}
                          {row.label}
                        </span>
                        <span className={cn('font-semibold text-foreground', row.valueClass)}>
                          {row.value}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div
                className={cn(
                  'overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(1)}
              >
                <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
                  Thành tích
                </div>
                <div className="grid grid-cols-2 gap-2 p-3">
                  {p.achievements.map((a, achIdx) => {
                    const Ai = PROFILE_CONTENT_ICONS[a.iconKey]
                    return (
                      <div
                        key={a.name}
                        className={cn(
                          'rounded-xl border p-2.5 text-center transition-[transform,box-shadow,border-color] duration-200 ease-out',
                          'motion-safe:opacity-0 motion-safe:animate-[profile-card-in_0.45s_cubic-bezier(0.22,1,0.36,1)_forwards] motion-reduce:opacity-100 motion-reduce:animate-none',
                          'hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30',
                          a.earned
                            ? 'border-primary/30 bg-gradient-to-br from-app-canvas to-primary/10'
                            : 'border-border opacity-40 grayscale hover:translate-y-0 hover:shadow-none'
                        )}
                        style={staggerStyle(2 + achIdx, 45)}
                      >
                        <div className="flex justify-center">
                          <Ai
                            className={cn(
                              'h-8 w-8 md:h-9 md:w-9',
                              a.earned ? 'text-primary' : 'text-muted-foreground'
                            )}
                            strokeWidth={2}
                            aria-hidden
                          />
                        </div>
                        <div className="mt-1 text-xs font-bold text-foreground md:text-sm">
                          {a.name}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground md:text-sm">{a.sub}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className={cn(
                  'rounded-2xl p-5 text-foreground shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER,
                  isGoldTier
                    ? 'border border-amber-200/70 bg-gradient-to-br from-white via-amber-50/85 to-yellow-50/75 ring-1 ring-amber-200/45'
                    : 'border border-primary/20 bg-gradient-to-br from-white via-sky-50/90 to-teal-50/80 ring-1 ring-primary/15'
                )}
                style={staggerStyle(2)}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Cấp độ hiện tại
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[22px] font-extrabold text-slate-900 md:text-2xl">
                      {CurrentTitleIcon ? (
                        <CurrentTitleIcon
                          className={cn(
                            'h-7 w-7 shrink-0 md:h-8 md:w-8',
                            isGoldTier ? 'text-amber-700' : 'text-primary'
                          )}
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : null}
                      <span>{p.currentLevel.title}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold md:text-sm',
                      tierPill.wrap
                    )}
                  >
                    {CurrentTierIcon ? (
                      <CurrentTierIcon
                        className={cn('h-3.5 w-3.5 shrink-0', tierPill.icon)}
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : null}
                    {p.currentLevel.tierLabel}
                  </span>
                </div>
                <p className="mb-2 text-sm text-muted-foreground md:text-base">
                  {p.currentLevel.progressLine}
                </p>
                <div className="mb-2.5 flex flex-wrap gap-1">
                  {levelStarVariants.map((v, i) => (
                    <span
                      key={i}
                      className="inline-flex cursor-default rounded-sm motion-safe:animate-[dash-star-pop_0.42s_ease-out_both] motion-reduce:animate-none transition-transform duration-200 ease-out will-change-transform hover:z-10 hover:scale-125 hover:rotate-12"
                      style={{ animationDelay: `${i * 72}ms` }}
                    >
                      <ProfileStarTier variant={v} />
                    </span>
                  ))}
                </div>
                <div
                  className={cn(
                    'group/pb relative h-2 overflow-hidden rounded-full transition-[box-shadow] duration-200',
                    isGoldTier
                      ? 'bg-amber-200/50 hover:shadow-[inset_0_0_0_1px_rgba(245,158,11,0.35)]'
                      : 'bg-primary/15 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]'
                  )}
                >
                  <div
                    className={cn(
                      'h-full origin-left rounded-full motion-safe:animate-[profile-progress-fill_1.05s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none',
                      isGoldTier
                        ? 'bg-gradient-to-r from-star-gold via-star-gold-mid to-star-gold-deep'
                        : 'bg-gradient-to-r from-primary via-sky-600 to-accent'
                    )}
                    style={{
                      width: `${p.currentLevel.levelProgressPct}%`,
                      transformOrigin: '0 50%',
                      animationDelay: `${levelStarVariants.length * 72 + 80}ms`,
                    }}
                  />
                </div>
                <div className="mt-1.5 text-right text-xs text-muted-foreground md:text-sm">
                  {p.currentLevel.levelProgressPct}% hoàn thành cấp độ
                </div>
              </div>

              <div
                className={cn(
                  'overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(3)}
              >
                <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
                  Lịch sử thăng cấp
                </div>
                <div className="relative px-3 py-4 pl-10">
                  <div
                    className="absolute bottom-4 left-[23px] top-4 w-0.5 rounded-full bg-gradient-to-b from-amber-500 via-slate-500 to-orange-800 opacity-[0.92]"
                    aria-hidden
                  />
                  {p.levelHistory.map((h) => {
                    const Hi = h.tierIconKey ? PROFILE_CONTENT_ICONS[h.tierIconKey] : null
                    return (
                      <div
                        key={h.step}
                        className={cn(
                          'relative mb-3.5 flex items-center gap-2.5 last:mb-0',
                          h.dimmed && 'opacity-75'
                        )}
                      >
                        <div
                          className={cn(
                            'z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white md:h-10 md:w-10 md:text-base',
                            tierMilestoneCircleClass(h.tierIconKey)
                          )}
                        >
                          {h.step}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-foreground md:text-base">
                            {h.title}{' '}
                            {h.step === 3 && (
                              <span className={tierLearningAccentClass(h.tierIconKey)}>· Đang học</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground md:text-sm">{h.meta}</div>
                        </div>
                        <span
                          className={cn(
                            'ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold md:text-sm',
                            h.tierIconKey
                              ? tierBadgeTone(h.tierIconKey, 'history').wrap
                              : h.tierClass
                          )}
                        >
                          {Hi ? (
                            <Hi
                              className={cn(
                                'h-3 w-3 shrink-0 opacity-95',
                                h.tierIconKey ? tierBadgeTone(h.tierIconKey, 'history').icon : undefined
                              )}
                              strokeWidth={2}
                              aria-hidden
                            />
                          ) : null}
                          {h.tierLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'learning' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
            <div
              className={cn(
                'overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
              style={staggerStyle(0)}
            >
              <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
                Tiến độ tổng thể
              </div>
              <div className="space-y-0 px-3.5 py-3">
                {p.learningPathSummary.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between border-b border-border py-2.5 text-sm last:border-0 md:text-base"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={cn('font-semibold text-foreground', row.valueClass)}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div
                className="pointer-events-none absolute left-5 top-3 bottom-3 z-0 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#22C55E] via-primary to-primary/25 shadow-[0_0_12px_hsl(var(--primary)/0.14)]"
                aria-hidden
              />
              <div className="relative z-[1] flex flex-col gap-5">
                {p.learningTimeline.map((item, idx) => {
                  const Li = item.titleIconKey ? PROFILE_CONTENT_ICONS[item.titleIconKey] : null
                  return (
                    <div
                      key={`${item.title}-${idx}`}
                      className={cn(
                        'group flex items-start gap-2 sm:gap-3',
                        item.dimmed && 'opacity-45'
                      )}
                    >
                      <div className="flex w-10 shrink-0 flex-col items-center pt-1">
                        {idx === 2 ? (
                          <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden>
                            <span className="absolute inset-0 rounded-full border-2 border-primary/50 bg-white shadow-sm" />
                            <span className="relative h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_3px_white]" />
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'relative z-[2] h-3 w-3 rounded-full border-2 border-white shadow-sm ring-1 ring-black/[0.06]',
                              idx >= 3 ? 'border-border bg-primary/15' : 'bg-[#22C55E]'
                            )}
                            aria-hidden
                          />
                        )}
                      </div>
                      <div
                        className="mt-2.5 h-px w-2.5 shrink-0 rounded-full bg-gradient-to-r from-primary/35 via-primary/15 to-transparent sm:w-3.5 max-sm:hidden"
                        aria-hidden
                      />
                      <div
                        className={cn(
                          'min-w-0 flex-1 rounded-xl border p-3 transition-[transform,box-shadow,border-color] duration-200 ease-out',
                          'motion-safe:opacity-0 motion-safe:animate-[profile-card-in_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards] motion-reduce:opacity-100 motion-reduce:animate-none',
                          'hover:-translate-y-0.5 hover:shadow-md',
                          item.cardClass
                        )}
                        style={staggerStyle(idx + 1)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-foreground md:text-base">
                            {Li ? (
                              <Li
                                className="h-4 w-4 shrink-0 text-primary md:h-[18px] md:w-[18px]"
                                strokeWidth={2}
                                aria-hidden
                              />
                            ) : null}
                            <span>{item.title}</span>
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-bold md:text-sm',
                              item.badgeClass
                            )}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground md:text-sm">{item.meta}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(220px,280px)_1fr]">
            <div
              className={cn(
                'overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
              style={staggerStyle(0)}
            >
              <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
                Tổng kết
              </div>
              <div className="space-y-0 px-3.5 py-3">
                {p.examSummary.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between border-b border-border py-2.5 text-sm last:border-0 md:text-base"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={cn('font-semibold text-foreground', row.valueClass)}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {p.exams.map((ex, exIdx) => {
                const Bi = ex.badgeIconKey ? PROFILE_CONTENT_ICONS[ex.badgeIconKey] : null
                return (
                  <div
                    key={ex.title}
                    className={cn(
                      'rounded-xl border p-3.5 transition-[transform,box-shadow,border-color] duration-200 ease-out',
                      CARD_ENTRANCE_HOVER,
                      'hover:-translate-y-0.5 hover:shadow-lg',
                      ex.cardClass
                    )}
                    style={staggerStyle(1 + exIdx)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground md:text-base">
                        {ex.title}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold md:text-sm',
                          ex.badgeClass
                        )}
                      >
                        {Bi ? <Bi className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden /> : null}
                        {ex.badge}
                      </span>
                    </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {ex.stats.map((s) => (
                      <div
                        key={s.label}
                        className="rounded-lg bg-white/70 p-2.5 transition-[transform,box-shadow] duration-200 hover:z-[1] hover:scale-[1.03] hover:shadow-md"
                      >
                        <div className="text-xs font-semibold uppercase text-muted-foreground md:text-sm">
                          {s.label}
                        </div>
                        <div
                          className={cn(
                            'mt-0.5 text-sm font-bold text-foreground md:text-base',
                            s.valueClass
                          )}
                        >
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {ex.note ? (
                    <div className="mt-2 border-t border-black/[0.06] pt-2 text-xs italic text-muted-foreground md:text-sm">
                      {ex.note}
                    </div>
                  ) : null}
                </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'work' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
            <div
              className={cn(
                'overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
              style={staggerStyle(0)}
            >
              <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
                Tóm tắt
              </div>
              <div className="space-y-0 px-3.5 py-3">
                {p.workSummary.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between border-b border-border py-2.5 text-sm last:border-0 md:text-base"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-foreground md:text-lg">
                    Lộ trình thăng tiến tại VCB
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 md:text-xs">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Phát triển nghề nghiệp
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground md:text-sm">
                  Quỹ đạo thăng tiến:{' '}
                  <span className="font-medium text-foreground">phía trên</span> là các mốc gần nhất,{' '}
                  <span className="font-medium text-foreground">phía dưới</span> là điểm khởi đầu tại
                  VCB — mỗi bước gắn với một giai đoạn phát triển.
                </p>
              </div>
              <div className="relative">
                {/* Trục dọc — căn giữa cột mốc (w-12, tâm tại left-6) */}
                <div
                  className="pointer-events-none absolute left-6 top-3 bottom-3 z-0 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary via-accent to-teal-300/80 shadow-[0_0_16px_hsl(var(--primary)/0.2)]"
                  aria-hidden
                />
                <div className="relative z-[1] flex flex-col gap-5">
                  {p.workTimeline.map((item, idx) => {
                    const stepTotal = p.workTimeline.length
                    const stepUp = stepTotal - idx
                    const workDot =
                      idx === 1
                        ? 'bg-primary'
                        : idx === 2
                          ? 'bg-[#22C55E]'
                          : idx === 3
                            ? 'bg-[#D97706]'
                            : idx === 4
                              ? 'bg-[#22C55E]'
                              : idx === 5
                                ? 'bg-primary'
                                : idx === 6
                                  ? 'bg-[#06B6D4]'
                                  : 'bg-[#94A3B8]'
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'group flex items-start gap-2 sm:gap-3',
                          item.dimmed && 'opacity-90'
                        )}
                      >
                        <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 pt-0.5">
                          <span
                            className="inline-flex min-h-[1.375rem] min-w-[2.25rem] items-center justify-center rounded-lg bg-primary/12 px-1.5 text-[10px] font-bold tabular-nums text-primary ring-1 ring-primary/15 sm:text-[11px]"
                            title={`Bước thăng tiến ${stepUp} trên ${stepTotal}`}
                          >
                            {stepUp}/{stepTotal}
                          </span>
                          {idx === 0 ? (
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-primary">
                              Mới nhất
                            </span>
                          ) : idx === stepTotal - 1 ? (
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Khởi đầu
                            </span>
                          ) : null}
                          {idx === 0 ? (
                            <span
                              className="relative mt-0.5 flex h-4 w-4 items-center justify-center"
                              aria-hidden
                            >
                              <span className="absolute inset-0 rounded-full border-2 border-primary/50 bg-white shadow-sm" />
                              <span className="relative h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_3px_white]" />
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'relative z-[2] mt-0.5 h-3 w-3 rounded-full border-2 border-white shadow-sm ring-1 ring-black/[0.06]',
                                workDot
                              )}
                              aria-hidden
                            />
                          )}
                        </div>
                        <div
                          className="mt-6 h-px w-2.5 shrink-0 self-start rounded-full bg-gradient-to-r from-primary/35 via-primary/15 to-transparent sm:mt-7 sm:w-3.5 max-sm:hidden"
                          aria-hidden
                        />
                        <div
                          className={cn(
                            'min-w-0 flex-1 rounded-xl border p-3 transition-[transform,box-shadow,border-color] duration-200 ease-out',
                            'motion-safe:opacity-0 motion-safe:animate-[profile-card-in_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards] motion-reduce:opacity-100 motion-reduce:animate-none',
                            'hover:-translate-y-0.5 hover:shadow-md',
                            item.cardClass
                          )}
                          style={staggerStyle(idx + 1)}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-foreground md:text-base">
                                {item.title}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground md:text-sm">
                                {item.meta}
                              </div>
                            </div>
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold md:text-sm',
                                item.badgeClass
                              )}
                            >
                              {item.badge}
                            </span>
                          </div>
                          {item.extra ? (
                            <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-2 text-sm text-primary md:text-base">
                              <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                              {item.extra}
                            </div>
                          ) : null}
                          {item.footnote ? (
                            <div className="mt-1.5 text-xs text-muted-foreground md:text-sm">
                              {item.footnote}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div
              className={cn(
                'overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
              style={staggerStyle(0)}
            >
              <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
                Phân công tổ chức
              </div>
              <div className="px-3.5 py-3">
                <div className="mb-2.5 flex gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEE2E2] px-3 py-2.5 text-sm text-[#991B1B] md:text-base">
                  <span>🔒</span>
                  <span>Bạn không có quyền thay đổi. Liên hệ HR Admin nếu có sai sót.</span>
                </div>
                <div className="space-y-0">
                  <div className="flex flex-col border-b border-border py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Role
                    </span>
                    <span className="mt-1 inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary md:text-sm">
                      {ROLE_LABEL_VI[role]}
                    </span>
                  </div>
                  <div className="flex flex-col border-b border-border py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Phòng ban
                    </span>
                    <span className="mt-0.5 text-sm font-semibold md:text-base">
                      {p.orgInfo.department}
                    </span>
                  </div>
                  <div className="flex flex-col border-b border-border py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Team chính
                    </span>
                    <span className="mt-0.5 text-sm font-semibold md:text-base">
                      {p.orgInfo.team}
                    </span>
                  </div>
                  <div className="flex flex-col border-b border-border py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Mã nhân viên
                    </span>
                    <span className="mt-0.5 text-sm font-semibold md:text-base">
                      {p.orgInfo.employeeCode}
                    </span>
                  </div>
                  <div className="flex flex-col py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Ngày bắt đầu
                    </span>
                    <span className="mt-0.5 text-sm font-semibold md:text-base">
                      {p.orgInfo.startDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className={cn(
                  'overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(1)}
              >
                <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
                  Thông tin cá nhân
                </div>
                <div className="space-y-0 px-3.5 py-3">
                  <div className="flex flex-col border-b border-border py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Họ và tên
                    </span>
                    <span className="mt-0.5 text-sm font-semibold md:text-base">
                      {displayName}
                    </span>
                  </div>
                  <div className="flex flex-col border-b border-border py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Email công ty
                    </span>
                    <span className="mt-0.5 text-sm font-semibold md:text-base">{email}</span>
                  </div>
                  <div className="flex flex-col border-b border-border py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Số điện thoại{' '}
                      <span className="text-xs text-primary md:text-sm">✏️ Có thể sửa</span>
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-lg border border-primary/30 px-2.5 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 md:text-base"
                        value={phoneInput}
                        onChange={(e) => setPhoneDraft(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => toast.success('Đã lưu số điện thoại (demo)')}
                        className="shrink-0 rounded-lg border border-button bg-button px-3 py-2 text-sm font-medium text-button-foreground hover:opacity-90 md:text-base"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Ngày sinh
                    </span>
                    <span className="mt-0.5 text-sm font-semibold md:text-base">
                      {p.personalInfo.birthDate}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(2)}
              >
                <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
                  Bảo mật
                </div>
                <div className="flex items-center justify-between gap-3 px-3.5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-foreground md:text-base">
                      Mật khẩu đăng nhập
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground md:text-sm">
                      Lần đổi gần nhất: {p.security.lastPasswordChange}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info('Liên hệ IT để đổi mật khẩu (demo)')}
                    className="shrink-0 rounded-lg border border-button bg-button px-3 py-2 text-sm font-medium text-button-foreground hover:opacity-90 md:text-base"
                  >
                    Đổi mật khẩu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
