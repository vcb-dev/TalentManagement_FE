import { useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  Medal,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import { useEmployee } from '@/features/hr-admin/hooks'
import { MOCK_TEAM_NS01, MOCK_TEAM_NS02 } from '@/features/hr-admin/mock/mockEmployeesData'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { ProgressStar } from '@/components/shared/ProgressStar/ProgressStar'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { DashboardKpiOkrZone } from '@/features/employee-dashboard/components/DashboardKpiOkrZone'
import { DashboardLearningZone } from '@/features/employee-dashboard/components/DashboardLearningZone'
import { CARD_ENTRANCE_HOVER, STAR_POP, staggerStyle } from '@/lib/cardMotion'
import { LEVEL_LABELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/auth'

function kpiOkrPaths(role: Role | undefined): { kpiOkr: string } {
  if (role === 'LEADER') return { kpiOkr: '/leader/kpi-okr' }
  return { kpiOkr: '/kpi-okr' }
}

type DashboardTab = 'learning' | 'kpi'

const MOCK_DEPT_ID = '11111111-1111-4111-8111-111111111111'

const DEPARTMENT_LABEL: Record<string, string> = {
  [MOCK_DEPT_ID]: 'Vận hành & Nhân sự',
}

const TEAM_LABEL: Record<string, string> = {
  [MOCK_TEAM_NS01]: 'NS-01',
  [MOCK_TEAM_NS02]: 'NS-02',
}

function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function monthLabelVi(d: Date): string {
  return `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}`
}

function formatTeams(teamIds: string[]): string {
  if (teamIds.length === 0) return 'Chưa gán team'
  return teamIds.map((id) => TEAM_LABEL[id] ?? `Team · ${shortId(id)}`).join(', ')
}

function formatDepartment(departmentId: string): string {
  return DEPARTMENT_LABEL[departmentId] ?? `PB · ${shortId(departmentId)}`
}

const quartOut = '[transition-timing-function:cubic-bezier(0.25,1,0.48,1)]'

const achievementPresets = [
  {
    title: 'KPI nổi bật',
    desc: 'Đạt 112% chỉ tiêu doanh số quý — top 10% khối.',
    icon: Trophy,
    chip: '+320 điểm',
    panel:
      'border-amber-500/25 bg-gradient-to-br from-primary/12 via-card to-amber-50/90 shadow-[0_12px_40px_-12px_rgb(217_119_6/0.22)]',
    iconWrap:
      'bg-gradient-to-br from-amber-400 to-tier-gold text-white shadow-lg shadow-amber-500/35',
    delay: 0,
  },
  {
    title: 'OKR then chốt',
    desc: 'Hoàn thành 3/4 KR tháng; KR “Tối ưu quy trình” đạt 95%.',
    icon: Target,
    chip: 'Boss fight',
    panel:
      'border-primary/30 bg-gradient-to-br from-primary/[0.14] via-card to-accent/15 shadow-[var(--shadow-game-float)]',
    iconWrap:
      'bg-gradient-to-br from-primary to-primary-600 text-primary-foreground shadow-lg shadow-primary/40',
    delay: 1,
  },
  {
    title: 'Học tập & chứng chỉ',
    desc: 'Hoàn thành 2 khóa bắt buộc cấp độ hiện tại trong hạn.',
    icon: GraduationCap,
    chip: '×2 huy hiệu',
    panel:
      'border-accent/30 bg-gradient-to-br from-accent/12 via-card to-info-muted/50 shadow-[0_12px_36px_-14px_rgb(13_148_136/0.25)]',
    iconWrap:
      'bg-gradient-to-br from-accent to-[#0f766e] text-accent-foreground shadow-lg shadow-accent/30',
    delay: 2,
  },
  {
    title: 'Mốc lộ trình',
    desc: 'Xếp hạng học tập cao trong team; duy trì tỉ lệ đạt 83%.',
    icon: BarChart3,
    chip: 'Top 15%',
    panel:
      'border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] via-card to-primary/[0.06] shadow-[0_12px_36px_-12px_rgb(5_150_105/0.2)]',
    iconWrap:
      'bg-gradient-to-br from-emerald-500 to-[#047857] text-white shadow-lg shadow-emerald-600/30',
    delay: 3,
  },
] as const

export function EmployeeLearningDashboard() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role
  const showKpiZone = role === 'MEMBER' || role === 'LEADER'
  const paths = kpiOkrPaths(role)
  const [tab, setTab] = useState<DashboardTab>('learning')

  const { data: employee } = useEmployee(user?.id ?? '')
  const greetingName = user?.name?.trim() || 'bạn'

  const levelKey: LevelCode = employee?.currentLevel ?? 'duoc_viec'
  const levelLabel = LEVEL_LABELS[levelKey]
  const maxStars = STARS_PER_LEVEL[levelKey]
  const filledStars = employee?.currentStar ?? 0

  const deptLine = user ? formatDepartment(user.departmentId) : '—'
  const teamLine = user ? formatTeams(user.teamIds) : '—'
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'

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
              <span className={PAGE_HEADER_GRADIENT}>Dashboard Cá nhân</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>
              Chào mừng trở lại, <span className="font-semibold text-primary">{greetingName}</span>.
              Thu thập sao, hoàn thành nhiệm vụ và leo bảng xếp hạng nội bộ.
            </p>
          </div>
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
        </section>

        {/* Khung trên: 1/3 avatar + sao | 2/3 thông tin */}
        <section
          className={cn(
            'grid grid-cols-1 gap-6 lg:grid-cols-3',
            'motion-safe:animate-[dash-fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'
          )}
          style={{ animationDelay: '100ms' }}
          aria-label="Thông tin tóm tắt"
        >
          <div
            className={cn(
              'group relative overflow-hidden rounded-[1.75rem] p-[1.5px] shadow-[var(--shadow-game-float)]',
              'bg-gradient-to-br from-primary/70 via-accent/50 to-primary-600/60',
              quartOut,
              'transition-all duration-500 hover:shadow-[0_20px_50px_-15px_rgb(79_70_229/0.35)] motion-reduce:transition-none'
            )}
          >
            <div className="relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden rounded-[1.6875rem] bg-gradient-to-b from-card via-card to-game-soft/40 px-6 py-8">
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-2xl motion-safe:animate-[dash-glow-orb_6s_ease-in-out_infinite] motion-reduce:animate-none"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-accent/20 blur-2xl motion-safe:animate-[dash-glow-orb_7s_ease-in-out_infinite_0.5s] motion-reduce:animate-none"
                aria-hidden
              />

              {user ? (
                <div className="relative">
                  <div
                    className="absolute inset-0 scale-110 rounded-full bg-gradient-to-tr from-primary/45 via-accent/35 to-primary-600/50 opacity-80 blur-xl motion-safe:animate-[dash-glow-orb_4.5s_ease-in-out_infinite] motion-reduce:hidden"
                    aria-hidden
                  />
                  <div className="relative motion-safe:animate-[dash-float-slow_5.5s_ease-in-out_infinite] motion-reduce:animate-none">
                    <EmployeeAvatar
                      name={user.name}
                      className="h-28 w-28 text-2xl ring-4 ring-primary/25 ring-offset-4 ring-offset-card transition-all duration-300 group-hover:ring-primary/45"
                    />
                  </div>
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-primary/20 bg-gradient-to-r from-primary to-accent px-3 py-0.5 text-[0.6rem] font-black uppercase tracking-tighter text-primary-foreground shadow-md"
                    style={{ boxShadow: '0 4px 14px hsl(var(--primary) / 0.35)' }}
                  >
                    {levelLabel}
                  </span>
                </div>
              ) : null}

              <div className="relative w-full text-center">
                <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-widest text-primary/80">
                  Huy hiệu sao
                </p>
                {maxStars > 0 ? (
                  <>
                    <div
                      className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.09] to-transparent px-3 py-3 shadow-inner shadow-primary/5"
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
                    <div className="mt-4 space-y-1.5">
                      <p className="text-lg font-black tabular-nums text-foreground">
                        {filledStars}/{maxStars}{' '}
                        <span className="text-sm font-bold text-muted-foreground">sao</span>
                      </p>
                      <div className="mx-auto h-2.5 max-w-[200px] overflow-hidden rounded-full bg-muted p-0.5 shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary via-amber-500 to-accent motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-out"
                          style={{ width: `${starPct}%` }}
                        />
                      </div>
                    </div>
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
              'relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.06] p-6 shadow-[var(--shadow-game-float)] sm:p-8 lg:col-span-2',
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
                ['Họ và tên', user?.name ?? '—'],
                ['Ngày sinh', 'Chưa cập nhật'],
                ['Phòng ban', deptLine],
                ['Team', teamLine],
                ['Chức vụ', roleLabel],
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
                  <dd className="mt-1 break-words text-base font-bold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Thành tựu — thẻ quest */}
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
            {achievementPresets.map((card) => (
              <div
                key={card.title}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border p-5',
                  card.panel,
                  quartOut,
                  'motion-safe:animate-[profile-card-in_0.65s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none',
                  'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0'
                )}
                style={staggerStyle(card.delay, 70)}
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
                      card.iconWrap,
                      'motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-110 group-hover:rotate-3'
                    )}
                  >
                    <card.icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                  </div>
                  <span className="rounded-full bg-background/70 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-tight text-foreground shadow-sm backdrop-blur-sm">
                    {card.chip}
                  </span>
                </div>
                <h3 className="relative text-[0.65rem] font-bold uppercase tracking-widest text-foreground/80">
                  {card.title}
                </h3>
                <p className="relative mt-2 text-sm font-semibold leading-snug text-foreground">
                  {card.desc}
                </p>
                <div className="relative mt-4 flex items-center gap-1.5 text-xs font-bold text-primary">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse motion-reduce:animate-none" />
                  Nhiệm vụ đã mở khóa
                </div>
              </div>
            ))}
          </div>
        </section>

        {showKpiZone ? (
          <>
            <div
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              role="tablist"
              aria-label="Chế độ xem dashboard"
            >
              <div
                className={cn(
                  'inline-flex rounded-full border border-primary/20 bg-gradient-to-r from-primary/[0.1] via-card/95 to-accent/[0.1] p-1 shadow-inner shadow-primary/10',
                  'motion-safe:animate-[dash-fade-up_0.5s_ease-out_both] motion-reduce:animate-none'
                )}
                style={{ animationDelay: '120ms' }}
              >
                <button
                  type="button"
                  role="tab"
                  id="dash-tab-learning"
                  aria-selected={tab === 'learning'}
                  aria-controls="dash-panel-learning"
                  tabIndex={tab === 'learning' ? 0 : -1}
                  onClick={() => setTab('learning')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-300',
                    tab === 'learning'
                      ? 'scale-[1.02] bg-gradient-to-r from-primary to-primary-600 text-primary-foreground shadow-[var(--shadow-game-float)] ring-2 ring-primary/25 ring-offset-2 ring-offset-background motion-reduce:scale-100 motion-reduce:ring-0 motion-reduce:ring-offset-0'
                      : 'text-muted-foreground hover:bg-background/80 hover:text-foreground hover:shadow-sm'
                  )}
                >
                  <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Học tập & thi cử
                </button>
                <button
                  type="button"
                  role="tab"
                  id="dash-tab-kpi"
                  aria-selected={tab === 'kpi'}
                  aria-controls="dash-panel-kpi"
                  tabIndex={tab === 'kpi' ? 0 : -1}
                  onClick={() => setTab('kpi')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-300',
                    tab === 'kpi'
                      ? 'scale-[1.02] bg-gradient-to-r from-primary to-primary-600 text-primary-foreground shadow-[var(--shadow-game-float)] ring-2 ring-primary/25 ring-offset-2 ring-offset-background motion-reduce:scale-100 motion-reduce:ring-0 motion-reduce:ring-offset-0'
                      : 'text-muted-foreground hover:bg-background/80 hover:text-foreground hover:shadow-sm'
                  )}
                >
                  <Target className="h-4 w-4 shrink-0" strokeWidth={2} />
                  KPI · OKR · Báo cáo
                </button>
              </div>
            </div>

            <div
              id="dash-panel-learning"
              role="tabpanel"
              aria-labelledby="dash-tab-learning"
              hidden={tab !== 'learning'}
              className="motion-safe:animate-[dash-fade-up_0.4s_ease-out_both] motion-reduce:animate-none"
            >
              <DashboardLearningZone />
            </div>
            <div
              id="dash-panel-kpi"
              role="tabpanel"
              aria-labelledby="dash-tab-kpi"
              hidden={tab !== 'kpi'}
              className="motion-safe:animate-[dash-fade-up_0.4s_ease-out_both] motion-reduce:animate-none"
            >
              <DashboardKpiOkrZone role={role as 'MEMBER' | 'LEADER'} paths={paths} />
            </div>
          </>
        ) : (
          <DashboardLearningZone />
        )}
      </div>
    </div>
  )
}
