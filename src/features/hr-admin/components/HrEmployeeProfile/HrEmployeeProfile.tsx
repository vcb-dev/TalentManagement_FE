import { useMemo, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Crown,
  FiveStarRank,
  GraduationCap,
  PROFILE_TAB_ICONS,
  ProfileStarTier,
  Settings,
  Star,
  Target,
  UserCircle,
  Users,
} from '@/components/icons'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import {
  levelMeta,
  levelPillText,
  roleShortLabel,
  shortId,
  statusLabelVi,
} from '@/features/hr-admin/components/HrEmployeeList/employeeListUtils'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { LEVEL_LABELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { CARD_ENTRANCE_HOVER, CARD_HOVER, staggerStyle } from '@/lib/cardMotion'
import { demoGamificationFromSeed } from '@/lib/demoGamification'
import type { EmployeeLevel } from '@/types/employee'
import type { Role } from '@/types/auth'
import { cn } from '@/lib/utils'

const LEVEL_ORDER: EmployeeLevel[] = [
  'tap_su',
  'biet_viec',
  'duoc_viec',
  'dong_gop_ket_qua',
  'tuong',
]

const TABS = [
  'Tổng quan',
  'Lộ trình học',
  'Kết quả thi',
  'Lịch sử làm việc',
  'Chỉnh sửa hồ sơ',
] as const

const TAB_ICONS_HR: LucideIcon[] = [
  PROFILE_TAB_ICONS.overview,
  PROFILE_TAB_ICONS.learning,
  PROFILE_TAB_ICONS.exams,
  PROFILE_TAB_ICONS.work,
  Settings,
]

function starVariants(filledStars: number, totalStars: number): ('filled' | 'current' | 'empty')[] {
  const n = Math.min(Math.max(totalStars, 1), 6)
  const f = Math.min(Math.max(Math.floor(filledStars), 0), n)
  const out: ('filled' | 'current' | 'empty')[] = []
  for (let i = 0; i < n; i++) {
    if (i < f) out.push('filled')
    else if (i === f && f < n) out.push('current')
    else out.push('empty')
  }
  return out
}

const ROLE_BADGE_ICONS: Record<Role, LucideIcon> = {
  MEMBER: UserCircle,
  LEADER: Target,
  MANAGER: Briefcase,
  HR_ADMIN: Building2,
  TEACHER: ClipboardList,
  BOD: BarChart3,
}

export interface HrEmployeeProfileProps {
  employee: EmployeeEntity
  /** Mặc định mở tab khi vào từ URL `?mode=edit`. */
  initialTab?: number
  /** Quản lý: ẩn chỉnh sửa / thao tác HR. */
  viewer?: 'hr' | 'manager'
}

export function HrEmployeeProfile({
  employee,
  initialTab = 0,
  viewer = 'hr',
}: HrEmployeeProfileProps) {
  const maxTab = viewer === 'manager' ? 3 : 4
  const [tab, setTab] = useState(() => Math.min(maxTab, Math.max(0, initialTab)))
  const { label: tierLabel, tierClass } = levelMeta(employee.currentLevel)
  const maxStars = STARS_PER_LEVEL[employee.currentLevel as LevelCode] || 6
  const xpPct =
    maxStars > 0 ? Math.min(100, Math.round((employee.currentStar / maxStars) * 100)) : 0
  const levelIdx = LEVEL_ORDER.indexOf(employee.currentLevel)

  const [editName, setEditName] = useState(employee.name)
  const [editEmail, setEditEmail] = useState(employee.email)

  const empCode = `VCB-${shortId(employee.id).toUpperCase()}`
  const { points, rank } = useMemo(
    () => demoGamificationFromSeed(employee.email ?? employee.id),
    [employee.email, employee.id]
  )

  const onDemoAction = (msg: string) => () => toast.info(msg)

  const tabLabels = viewer === 'manager' ? TABS.slice(0, 4) : TABS
  const tabIcons = viewer === 'manager' ? TAB_ICONS_HR.slice(0, 4) : TAB_ICONS_HR
  const profileScoreDisplay = (points / 1000).toFixed(1).replace('.', ',')
  const rankStarsFive = (xpPct / 100) * 5
  const levelStarVariants = starVariants(employee.currentStar, maxStars)
  const isGoldTier = employee.currentLevel === 'tuong'
  const RoleBadgeIcon = ROLE_BADGE_ICONS[employee.role]
  const deptName = `PB ${shortId(employee.departmentId)}`
  const teamName = `Team ${shortId(employee.teamIds[0] ?? employee.departmentId)}`

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-gradient-to-b from-slate-50/80 via-app-canvas to-app-canvas text-base text-foreground md:-m-6 lg:-m-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pb-6 pt-6 md:px-6 lg:flex-row lg:items-start lg:gap-8 lg:pt-8">
        <aside className="w-full shrink-0 lg:w-[280px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground lg:mb-0 lg:block">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {viewer === 'manager' ? (
                <Link
                  to="/manager/team-progress"
                  className="font-semibold text-primary hover:underline"
                >
                  ← Nhân sự trong team
                </Link>
              ) : (
                <Link
                  to="/hr-admin"
                  search={{ page: 1 }}
                  className="font-semibold text-primary hover:underline"
                >
                  ← Danh sách nhân sự
                </Link>
              )}
              <span className="text-muted-foreground/50">/</span>
              <span className="font-semibold text-foreground">{employee.name}</span>
            </div>
            {viewer === 'hr' ? (
              <div className="flex flex-wrap items-center gap-1.5 lg:hidden">
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold shadow-sm hover:bg-muted"
                  onClick={onDemoAction('Đổi phòng ban: kết nối API sau.')}
                >
                  Đổi PB
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold shadow-sm hover:bg-muted"
                  onClick={onDemoAction('Đổi role: kết nối API sau.')}
                >
                  Role
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-6 rounded-2xl border border-primary/10 bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-primary/5">
            <div className="relative mx-auto">
              <EmployeeAvatar
                name={employee.name}
                showOnlineDot={employee.status === 'ACTIVE'}
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
                    <span className="text-sm font-semibold leading-snug text-foreground">
                      {deptName}
                    </span>
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
                    <span className="text-sm font-semibold leading-snug text-foreground">
                      {teamName}
                    </span>
                    <span className="shrink-0 rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                      Phụ
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mã {empCode} · Vào {new Date(employee.createdAt).toLocaleDateString('vi-VN')}
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
                <li className="flex items-start gap-2 text-sm leading-snug text-foreground">
                  <Award
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/90"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>{levelPillText(employee.currentLevel)}</span>
                </li>
                <li className="flex items-start gap-2 text-sm leading-snug text-foreground">
                  <RoleBadgeIcon
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/90"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>{ROLE_LABEL_VI[employee.role]}</span>
                </li>
                <li className="flex items-start gap-2 text-sm leading-snug text-foreground">
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/90"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>{statusLabelVi(employee.status)}</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {viewer === 'hr' ? (
            <div className="mb-4 hidden flex-wrap items-center justify-end gap-2 lg:flex">
              <button
                type="button"
                className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                onClick={onDemoAction('Đổi phòng ban: kết nối API sau.')}
              >
                Đổi phòng ban
              </button>
              <button
                type="button"
                className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                onClick={onDemoAction('Đổi role: kết nối API sau.')}
              >
                Đổi role
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-300/80 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100"
                onClick={onDemoAction('Hủy hoạt động: cần xác nhận và API.')}
              >
                Hủy hoạt động
              </button>
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                onClick={onDemoAction('Lưu thay đổi: kết nối API sau.')}
              >
                Lưu thay đổi
              </button>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/5">
            <div className="border-b border-border/80 px-5 py-5 md:px-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                {employee.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <Building2
                  className="h-4 w-4 shrink-0 text-primary/70"
                  strokeWidth={2}
                  aria-hidden
                />
                <span>
                  {deptName} · {teamName}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-primary md:text-xl">
                {ROLE_LABEL_VI[employee.role]} · {LEVEL_LABELS[employee.currentLevel as LevelCode]}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/60 pt-4">
                <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {profileScoreDisplay}
                </span>
                <FiveStarRank filled={rankStarsFive} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary ring-1 ring-primary/15">
                    <Star className="h-3.5 w-3.5" variant="filled" />
                    {points.toLocaleString('vi-VN')} pts
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-900 ring-1 ring-amber-500/20">
                    <Crown className="h-3.5 w-3.5 text-amber-600" strokeWidth={2} />#{rank}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-xs font-medium text-foreground">
                  <RoleBadgeIcon
                    className="h-3.5 w-3.5 shrink-0 text-primary/90"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {ROLE_LABEL_VI[employee.role]}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border border-primary/15 px-2.5 py-1 text-xs font-medium',
                    tierClass
                  )}
                >
                  <Award className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                  {tierLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-xs font-medium text-foreground">
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0 text-primary/90"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {statusLabelVi(employee.status)}
                </span>
              </div>

              {viewer === 'hr' ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTab(4)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    Chỉnh sửa hồ sơ
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info('Cài đặt nhân viên (demo)')}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
                    aria-label="Cài đặt"
                  >
                    <Settings className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              ) : null}
            </div>

            <nav
              className="flex flex-wrap gap-0 border-b border-border px-2 md:px-4"
              aria-label="Mục hồ sơ nhân viên"
            >
              {tabLabels.map((label, i) => {
                const Icon = tabIcons[i]!
                const active = tab === i
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setTab(i)}
                    className={cn(
                      'relative flex items-center gap-2 px-3 py-3.5 text-sm font-semibold transition-colors md:px-4',
                      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-85" strokeWidth={2} />
                    {label}
                    {active ? (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary md:left-4 md:right-4" />
                    ) : null}
                  </button>
                )
              })}
            </nav>

            <div className="page-shell">
              {tab === 0 && (
                <OverviewTab
                  employee={employee}
                  tierLabel={tierLabel}
                  tierClass={tierClass}
                  xpPct={xpPct}
                  maxStars={maxStars}
                  levelStarVariants={levelStarVariants}
                  isGoldTier={isGoldTier}
                />
              )}
              {tab === 1 && <LearningPathTab employee={employee} levelIdx={levelIdx} />}
              {tab === 2 && <ExamResultsTab />}
              {tab === 3 && <WorkHistoryTab />}
              {tab === 4 && viewer === 'hr' && (
                <EditTab
                  employee={employee}
                  editName={editName}
                  editEmail={editEmail}
                  empCode={empCode}
                  onName={setEditName}
                  onEmail={setEditEmail}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function PfCard({
  title,
  children,
  entranceIndex,
}: {
  title: string
  children: ReactNode
  entranceIndex?: number
}) {
  return (
    <div
      className={cn(
        'mb-3.5 overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
        entranceIndex !== undefined ? CARD_ENTRANCE_HOVER : CARD_HOVER
      )}
      style={entranceIndex !== undefined ? staggerStyle(entranceIndex) : undefined}
    >
      <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
        {title}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  )
}

function OverviewTab({
  employee,
  tierLabel,
  tierClass,
  xpPct,
  maxStars,
  levelStarVariants,
  isGoldTier,
}: {
  employee: EmployeeEntity
  tierLabel: string
  tierClass: string
  xpPct: number
  maxStars: number
  levelStarVariants: ('filled' | 'current' | 'empty')[]
  isGoldTier: boolean
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
      <div className="space-y-4">
        <PfCard title="Thống kê học tập" entranceIndex={0}>
          <div className="space-y-0">
            {(
              [
                { Icon: ClipboardList, label: 'Bài đã nộp (gần nhất)', value: '18' },
                { Icon: CheckCircle2, label: 'Tỉ lệ đạt', value: '83%' },
                { Icon: GraduationCap, label: 'Kỳ thi đã qua', value: '6' },
                { Icon: Calendar, label: 'Thời gian làm việc', value: '—' },
                { Icon: Users, label: 'Mentee (nếu có)', value: '—' },
              ] as const
            ).map(({ Icon, label, value }) => (
              <div
                key={label}
                className="flex justify-between border-b border-border py-2.5 text-sm last:border-0 md:text-base"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-primary/85"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {label}
                </span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </PfCard>
        <PfCard title="Thành tích" entranceIndex={1}>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['⚡', 'Tốc độ vàng', 'Đạt lần 1'],
              ['🎓', 'Mentor', 'Kèm mentee'],
              ['🏆', 'Top Learner', 'Top 15%'],
              ['👑', 'Tướng', 'Chưa mở'],
            ].map(([icon, name, sub], i) => (
              <div
                key={name}
                className={cn(
                  'rounded-xl border p-2.5 text-center',
                  CARD_ENTRANCE_HOVER,
                  i < 3
                    ? 'border-primary/30 bg-gradient-to-br from-app-canvas to-primary/10'
                    : 'opacity-40 grayscale'
                )}
                style={staggerStyle(i + 2)}
              >
                <div className="text-[22px]">{icon}</div>
                <div className="text-xs font-bold text-foreground md:text-sm">{name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground md:text-sm">{sub}</div>
              </div>
            ))}
          </div>
        </PfCard>
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
              <div className="mt-0.5 text-[22px] font-extrabold text-slate-900 md:text-2xl">
                {LEVEL_LABELS[employee.currentLevel as LevelCode]}
              </div>
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold md:text-sm',
                tierClass
              )}
            >
              <Award className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
              {tierLabel}
            </span>
          </div>
          <p className="mb-2 text-sm text-muted-foreground md:text-base">
            Tiến độ Sao {employee.currentStar}/{maxStars} ·{' '}
            {LEVEL_LABELS[employee.currentLevel as LevelCode]}
          </p>
          <div className="mb-2.5 flex flex-wrap gap-1">
            {levelStarVariants.map((v, i) => (
              <span
                key={i}
                className="inline-flex cursor-default rounded-sm motion-safe:animate-[dash-star-pop_0.42s_ease-out_both] motion-reduce:animate-none"
                style={{ animationDelay: `${i * 72}ms` }}
              >
                <ProfileStarTier variant={v} />
              </span>
            ))}
          </div>
          <div
            className={cn(
              'group/pb relative h-2 overflow-hidden rounded-full',
              isGoldTier ? 'bg-amber-200/50' : 'bg-primary/15'
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
                width: `${xpPct}%`,
                transformOrigin: '0 50%',
                animationDelay: `${levelStarVariants.length * 72 + 80}ms`,
              }}
            />
          </div>
          <div className="mt-1.5 text-right text-xs text-muted-foreground md:text-sm">
            {xpPct}% hoàn thành cấp độ
          </div>
        </div>
        <PfCard title="Lịch sử thăng cấp" entranceIndex={3}>
          <div className="relative px-3 py-1 pl-10">
            <div
              className="absolute bottom-4 left-[23px] top-4 w-0.5 rounded-full bg-gradient-to-b from-amber-500 via-slate-500 to-orange-800 opacity-[0.92]"
              aria-hidden
            />
            <div className="relative mb-3.5">
              <div className="absolute left-0 z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white md:h-10 md:w-10 md:text-base">
                {LEVEL_ORDER.indexOf(employee.currentLevel) + 1}
              </div>
              <div className="min-w-0 pl-12">
                <div className="text-sm font-bold text-foreground md:text-base">
                  {LEVEL_LABELS[employee.currentLevel as LevelCode]}{' '}
                  <span className="text-primary">· Đang học</span>
                </div>
                <div className="text-xs text-muted-foreground md:text-sm">
                  Cập nhật {new Date(employee.updatedAt).toLocaleDateString('vi-VN')}
                </div>
                <span
                  className={cn(
                    'mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold',
                    tierClass
                  )}
                >
                  {tierLabel}
                </span>
              </div>
            </div>
            <p className="pl-12 text-xs text-muted-foreground md:text-sm">
              Các cấp trước được ẩn khi có API lịch sử đầy đủ.
            </p>
          </div>
        </PfCard>
      </div>
    </div>
  )
}

function LearningPathTab({ employee, levelIdx }: { employee: EmployeeEntity; levelIdx: number }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
      <PfCard title="Tiến độ tổng thể" entranceIndex={0}>
        <div className="space-y-0">
          <div className="flex justify-between border-b border-border py-2">
            <span className="text-xs text-muted-foreground">Cấp đang học</span>
            <span className="text-sm font-bold">
              {LEVEL_LABELS[employee.currentLevel as LevelCode]}
            </span>
          </div>
          <div className="flex justify-between border-b border-border py-2">
            <span className="text-xs text-muted-foreground">Sao hiện tại</span>
            <span className="text-sm font-bold">
              {employee.currentStar} / {STARS_PER_LEVEL[employee.currentLevel as LevelCode] || 6}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-xs text-muted-foreground">Trạng thái</span>
            <span className="text-sm font-bold text-amber-700">Đang học</span>
          </div>
        </div>
      </PfCard>
      <div>
        <div className="relative pl-7">
          <div className="absolute bottom-2 left-2.5 top-2 w-0.5 rounded-sm bg-gradient-to-b from-primary via-accent to-teal-200/55" />
          {LEVEL_ORDER.map((lv, i) => {
            const done = i < levelIdx
            const active = i === levelIdx
            const locked = i > levelIdx
            return (
              <div key={lv} className="relative mb-5">
                <div
                  className={cn(
                    'absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white',
                    done && 'bg-emerald-500',
                    active && 'bg-primary ring-2 ring-primary/40 ring-offset-2',
                    locked && 'border-border bg-primary/10'
                  )}
                />
                <div
                  className={cn(
                    'rounded-xl border p-3',
                    done && 'border-emerald-300 bg-emerald-50',
                    active && 'border-primary/30 bg-primary/10 shadow-[var(--shadow-card)]',
                    locked && 'border-border bg-[#F8FAFC] opacity-45'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">
                      {LEVEL_LABELS[lv]}{' '}
                      {active && <span className="text-primary">· Đang học</span>}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold',
                        done && 'bg-emerald-100 text-emerald-800',
                        active && 'bg-primary/10 text-primary',
                        locked && 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {done ? 'Hoàn thành' : active ? `Sao ${employee.currentStar}/6` : 'Chưa mở'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ExamResultsTab() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
      <PfCard title="Tổng kết" entranceIndex={0}>
        <div className="space-y-0">
          {[
            ['Tổng kỳ thi', '6'],
            ['Đạt', '5'],
            ['Bảo lưu', '1'],
            ['Tỉ lệ đạt', '83%'],
          ].map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-border py-2 last:border-0">
              <span className="text-xs text-muted-foreground">{a}</span>
              <span className="text-sm font-bold">{b}</span>
            </div>
          ))}
        </div>
      </PfCard>
      <div className="space-y-2.5">
        <ExamCard
          title="Sao 5 — Được việc"
          badge="Đang chấm"
          badgeClass="bg-amber-100 text-amber-900"
          variant="inprog"
          stats={[
            ['Ngày nộp', '22/03/2026'],
            ['Người chấm', 'Lê Thu Hà'],
            ['Tiến độ', '2/5 mục'],
          ]}
        />
        <ExamCard
          title="Sao 4 — Được việc"
          badge="✓ Đạt"
          badgeClass="bg-emerald-100 text-emerald-800"
          variant="pass"
          stats={[
            ['Ngày thi', '15/03/2026'],
            ['Người chấm', 'Lê Thu Hà'],
            ['Kết quả', '5/5 mục'],
          ]}
          note='"Thực hiện đúng quy trình, mini-project chất lượng tốt."'
        />
      </div>
    </div>
  )
}

function ExamCard({
  title,
  badge,
  badgeClass,
  variant,
  stats,
  note,
}: {
  title: string
  badge: string
  badgeClass: string
  variant: 'inprog' | 'pass' | 'warn'
  stats: [string, string][]
  note?: string
}) {
  const bg =
    variant === 'pass'
      ? 'border-emerald-200 bg-emerald-50'
      : variant === 'warn'
        ? 'border-amber-200 bg-amber-50'
        : 'border-primary/30 bg-primary/10'
  return (
    <div className={cn('rounded-xl border p-3.5', bg)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold">{title}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', badgeClass)}>
          {badge}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-lg bg-white/70 px-2 py-1.5">
            <div className="text-[9px] font-semibold uppercase text-muted-foreground">{l}</div>
            <div className="text-sm font-bold">{v}</div>
          </div>
        ))}
      </div>
      {note ? (
        <p className="mt-2 border-t border-black/5 pt-2 text-xs italic text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  )
}

function WorkHistoryTab() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
      <PfCard title="Tóm tắt" entranceIndex={0}>
        <div className="space-y-0">
          {[
            ['Tổng thời gian', '—'],
            ['Phòng ban hiện tại', '—'],
            ['Team hiện tại', '—'],
            ['Lần điều chuyển', '—'],
          ].map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-border py-2 last:border-0">
              <span className="text-xs text-muted-foreground">{a}</span>
              <span className="text-sm font-bold">{b}</span>
            </div>
          ))}
        </div>
      </PfCard>
      <div>
        <h3 className="mb-3.5 text-sm font-bold text-foreground">Timeline sự kiện</h3>
        <div className="relative pl-7">
          <div className="absolute bottom-2 left-2.5 top-2 w-0.5 rounded-sm bg-gradient-to-b from-primary via-accent to-teal-200/55" />
          {[
            [
              'Hoàn thành mốc học tập',
              '20/03/2026 · Người chấm: Lê Thu Hà',
              'Đạt',
              'bg-emerald-500',
            ],
            ['Thăng cấp bậc', '05/01/2026 · Manager phê duyệt', 'Thăng cấp', 'bg-primary'],
            ['Gia nhập & onboard', 'Theo dữ liệu hệ thống', 'Onboard', 'bg-slate-400'],
          ].map(([t, m, b, dot], idx) => (
            <div key={idx} className="relative mb-5">
              <div
                className={cn(
                  'absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white',
                  dot
                )}
              />
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{t}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{m}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-primary">
                    {b}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EditTab({
  employee,
  editName,
  editEmail,
  empCode,
  onName,
  onEmail,
}: {
  employee: EmployeeEntity
  editName: string
  editEmail: string
  empCode: string
  onName: (v: string) => void
  onEmail: (v: string) => void
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div>
        <PfCard title="Phân công tổ chức" entranceIndex={0}>
          <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-2 text-xs text-primary">
            <span>✏️</span>
            <span>HR Admin có thể chỉnh sửa phân công khi đã kết nối API.</span>
          </div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Role</label>
          <select
            className="mb-3 w-full rounded-[9px] border border-border bg-white px-3 py-2 text-sm"
            disabled
            defaultValue={employee.role}
          >
            <option value={employee.role}>{roleShortLabel(employee.role)}</option>
          </select>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            Phòng ban
          </label>
          <select
            className="w-full rounded-[9px] border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
            disabled
          >
            <option>PB {shortId(employee.departmentId)}</option>
          </select>
        </PfCard>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-[9px] border border-[#FCA5A5] bg-[#FEE2E2] py-2.5 text-sm font-bold text-[#991B1B]"
            onClick={() => toast.info('Hủy hoạt động: cần API.')}
          >
            Hủy hoạt động
          </button>
          <button
            type="button"
            className="flex-[2] rounded-lg border border-button bg-button py-2.5 text-sm font-bold text-button-foreground hover:opacity-90"
            onClick={() => toast.success('Đã ghi nhận (demo — chưa gọi API).')}
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
      <PfCard title="Thông tin cá nhân" entranceIndex={1}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Họ và tên
            </label>
            <input
              className="w-full rounded-[9px] border border-border px-3 py-2 text-sm"
              value={editName}
              onChange={(e) => onName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email</label>
            <input
              className="w-full rounded-[9px] border border-border px-3 py-2 text-sm"
              value={editEmail}
              onChange={(e) => onEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Mã nhân viên
            </label>
            <input
              className="w-full rounded-[9px] border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              readOnly
              value={empCode}
            />
          </div>
        </div>
      </PfCard>
    </div>
  )
}
