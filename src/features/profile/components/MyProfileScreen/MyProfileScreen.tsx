import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Building2, Clock, Crown, LayoutGrid, Settings, Star } from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { demoGamificationFromSeed } from '@/lib/demoGamification'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/auth'
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
  if (role === 'MANAGER') {
    return ['overview', 'work', 'info']
  }
  return ['overview', 'learning', 'exams', 'work', 'info']
}

function heroBadges(role: Role): string[] {
  const base = ['🥇 Được việc · Gold', '✅ Hoạt động']
  switch (role) {
    case 'MANAGER':
      return ['👔 Quản lý', ...base, '🎓 Mentor']
    case 'TEACHER':
      return ['📝 Người chấm thi', ...base]
    case 'HR_ADMIN':
      return ['🏢 HR', ...base]
    case 'BOD':
      return ['📊 BOD', ...base]
    default:
      return ['👤 Nhân viên', ...base]
  }
}

function StarIcon({ variant }: { variant: 'filled' | 'current' | 'empty' }) {
  const path =
    'M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z'
  if (variant === 'empty') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={24}
        height={24}
        className="shrink-0 text-star-gold-soft"
        aria-hidden
      >
        <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} />
      </svg>
    )
  }
  if (variant === 'current') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={24}
        height={24}
        className="shrink-0 text-star-gold-mid drop-shadow-[0_0_6px_rgba(212,160,23,0.45)]"
        aria-hidden
      >
        <path d={path} fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      className="shrink-0 text-star-gold drop-shadow-[0_1px_3px_rgba(180,120,0,0.35)]"
      aria-hidden
    >
      <path d={path} fill="currentColor" />
    </svg>
  )
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

  useEffect(() => {
    if (!visibleTabs.includes(tab)) {
      setTab(visibleTabs[0] ?? 'overview')
    }
  }, [visibleTabs, tab])
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

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-app-canvas text-base text-foreground md:-m-6 lg:-m-8">
      <div className="relative min-h-[min(280px,42vh)] overflow-hidden border-b border-primary/15 bg-gradient-to-r from-primary/[0.08] via-teal-500/[0.06] to-violet-500/[0.07] pb-0 pt-0 text-foreground shadow-[var(--shadow-card)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-25 motion-safe:animate-[dash-shimmer_10s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            background:
              'linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 90%)',
            backgroundSize: '200% 100%',
          }}
        />
        <div
          className="absolute -right-[40px] -top-[40px] h-[180px] w-[180px] rounded-full bg-primary/[0.07] blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -left-6 bottom-0 h-[120px] w-[120px] rounded-full bg-accent/20 blur-2xl"
          aria-hidden
        />
        <div className="relative z-[1] flex flex-wrap items-start justify-between gap-4 px-6 pb-0 pt-7 motion-safe:animate-[profile-hero-in_0.65s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-5">
            <EmployeeAvatar
              name={displayName}
              showOnlineDot
              className="h-[92px] w-[92px] border-[3px] border-white text-[26px] shadow-[var(--shadow-game-float)] ring-4 ring-game-accent/20 sm:h-[96px] sm:w-[96px] sm:text-[28px]"
            />
            <div className="min-w-0 pb-4">
              <div className="flex flex-wrap items-center gap-3 gap-y-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-game-soft-foreground md:text-3xl">
                  {displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-sm font-bold text-game-soft-foreground shadow-sm ring-1 ring-game-accent/15">
                    <Star className="h-4 w-4 fill-[#EAB308] text-[#EAB308]" strokeWidth={0} />
                    {points.toLocaleString('vi-VN')} pts
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-sm font-bold text-game-soft-foreground shadow-sm ring-1 ring-amber-500/20">
                    <Crown className="h-4 w-4 text-amber-600" strokeWidth={2} />#{rank}
                  </span>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-game-muted md:text-base">
                <Building2 className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} />
                Kinh doanh · Team KD-02
                <span className="text-game-muted/40">·</span>
                <Clock className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} />
                Vào 12/06/2023 · {p.orgInfo.employeeCode}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-game-accent/20 bg-white/90 px-3 py-1 text-xs font-semibold text-game-soft-foreground shadow-sm md:text-sm"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-4">
            <button
              type="button"
              onClick={() => toast.info('Liên hệ IT để đổi mật khẩu (demo)')}
              className="rounded-full bg-button px-5 py-2.5 text-sm font-semibold text-button-foreground shadow-[0_2px_10px_rgb(106_90_224/0.35)] transition-colors hover:bg-button-hover md:text-base"
            >
              Đổi mật khẩu
            </button>
            <button
              type="button"
              onClick={() => toast.info('Cài đặt (demo)')}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-game-accent/25 bg-white text-game-soft-foreground shadow-sm transition-colors hover:bg-game-soft"
              aria-label="Cài đặt"
            >
              <Settings className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="relative z-[1] mt-2 px-6 pb-3 motion-safe:animate-[profile-hero-in_0.55s_cubic-bezier(0.22,1,0.36,1)_0.08s_both] motion-reduce:animate-none">
          <div className="inline-flex max-w-full flex-wrap rounded-full bg-game-soft/90 p-1 shadow-[inset_0_1px_3px_rgb(106_90_224/0.08)]">
            {visibleTabs.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'rounded-full px-3 py-2 text-xs font-semibold transition-[color,transform,box-shadow] duration-200 sm:px-4 md:text-sm',
                  tab === id
                    ? 'bg-game-accent text-game-accent-foreground shadow-[0_2px_10px_rgb(106_90_224/0.35)]'
                    : 'text-game-muted hover:scale-[1.02] hover:text-game-soft-foreground active:scale-[0.98]'
                )}
              >
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-shell">
        {tab === 'overview' && (
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
                  {p.statsOverview.map((row) => (
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
                  {p.achievements.map((a, achIdx) => (
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
                      <div className="text-[26px] leading-none md:text-[28px]">{a.icon}</div>
                      <div className="mt-1 text-xs font-bold text-foreground md:text-sm">
                        {a.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground md:text-sm">{a.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className={cn(
                  'rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-sky-50/90 to-teal-50/80 p-5 text-foreground shadow-[var(--shadow-card)] ring-1 ring-primary/15',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(2)}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                      Cấp độ hiện tại
                    </div>
                    <div className="mt-0.5 text-[22px] font-extrabold text-slate-900 md:text-2xl">
                      {p.currentLevel.title}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary md:text-sm">
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
                      <StarIcon variant={v} />
                    </span>
                  ))}
                </div>
                <div className="group/pb relative h-2 overflow-hidden rounded-full bg-primary/15 transition-[box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]">
                  <div
                    className="h-full origin-left rounded-full bg-gradient-to-r from-primary via-sky-600 to-accent motion-safe:animate-[profile-progress-fill_1.05s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none"
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
                  <div className="absolute bottom-4 left-[23px] top-4 w-0.5 bg-gradient-to-b from-[#22C55E] via-primary to-primary/20" />
                  {p.levelHistory.map((h) => (
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
                          h.step === 3 ? 'bg-primary' : 'bg-[#22C55E]'
                        )}
                      >
                        {h.step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-foreground md:text-base">
                          {h.title}{' '}
                          {h.step === 3 && <span className="text-primary">· Đang học</span>}
                        </div>
                        <div className="text-xs text-muted-foreground md:text-sm">{h.meta}</div>
                      </div>
                      <span
                        className={cn(
                          'ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold md:text-sm',
                          h.tierClass
                        )}
                      >
                        {h.tierLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'learning' && (
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
            <div className="relative pl-8">
              <div className="absolute bottom-8 left-[15px] top-8 w-0.5 bg-gradient-to-b from-[#22C55E] via-primary to-primary/20" />
              {p.learningTimeline.map((item, idx) => (
                <div
                  key={idx}
                  className={cn('relative mb-5 last:mb-0', item.dimmed && 'opacity-45')}
                >
                  <div
                    className={cn(
                      'absolute left-[-22px] top-1.5 z-[1] h-3 w-3 rounded-full border-2 border-white',
                      idx === 2
                        ? 'bg-primary ring-2 ring-primary/40 ring-offset-2'
                        : idx >= 3
                          ? 'border-border bg-primary/10'
                          : 'bg-[#22C55E]'
                    )}
                  />
                  <div
                    className={cn(
                      'rounded-xl border p-3 transition-[transform,box-shadow,border-color] duration-200 ease-out',
                      'motion-safe:opacity-0 motion-safe:animate-[profile-card-in_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards] motion-reduce:opacity-100 motion-reduce:animate-none',
                      'hover:-translate-y-0.5 hover:shadow-md',
                      item.cardClass
                    )}
                    style={staggerStyle(idx + 1)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground md:text-base">
                        {item.title}
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
              ))}
            </div>
          </div>
        )}

        {tab === 'exams' && (
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
              {p.exams.map((ex, exIdx) => (
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
                        'rounded-full px-2.5 py-0.5 text-xs font-bold md:text-sm',
                        ex.badgeClass
                      )}
                    >
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
              ))}
            </div>
          </div>
        )}

        {tab === 'work' && (
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
              <div className="mb-3.5 text-base font-bold text-foreground md:text-lg">
                Timeline toàn bộ sự kiện tại VCB
              </div>
              <div className="relative pl-8">
                <div className="absolute bottom-8 left-[15px] top-8 w-0.5 bg-gradient-to-b from-primary via-accent to-teal-200/60" />
                {p.workTimeline.map((item, idx) => {
                  const workDot =
                    idx === 0
                      ? 'bg-primary ring-2 ring-primary/40 ring-offset-2'
                      : idx === 1
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
                      className={cn('relative mb-5 last:mb-0', item.dimmed && 'opacity-90')}
                    >
                      <div
                        className={cn(
                          'absolute left-[-22px] top-2 z-[1] h-3 w-3 rounded-full border-2 border-white',
                          workDot
                        )}
                      />
                      <div
                        className={cn(
                          'rounded-xl border p-3 transition-[transform,box-shadow,border-color] duration-200 ease-out',
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
        )}

        {tab === 'info' && (
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
  )
}
