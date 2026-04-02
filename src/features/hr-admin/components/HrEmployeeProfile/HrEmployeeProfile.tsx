import { useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Building2, Clock, Crown, Settings, Star } from 'lucide-react'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { levelMeta, roleShortLabel, shortId } from '@/features/hr-admin/components/HrEmployeeList/employeeListUtils'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { LEVEL_LABELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { CARD_ENTRANCE_HOVER, CARD_HOVER, PROGRESS_BAR_FILL, staggerStyle } from '@/lib/cardMotion'
import { demoGamificationFromSeed } from '@/lib/demoGamification'
import type { EmployeeLevel } from '@/types/employee'
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

function StarIcon({
  size = 22,
  variant = 'filled',
}: {
  size?: number
  variant?: 'filled' | 'amber' | 'outline'
}) {
  if (variant === 'outline') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0 text-star-gold-soft" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
        />
      </svg>
    )
  }
  const tone = variant === 'amber' ? 'text-star-gold-mid' : 'text-star-gold'
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn('shrink-0', tone)}
      style={{ opacity: 0.95 }}
      aria-hidden
    >
      <path fill="currentColor" d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
    </svg>
  )
}

function HeroStars({ filled, maxStars }: { filled: number; maxStars: number }) {
  const n = Math.min(Math.max(maxStars, 1), 6)
  const f = Math.min(Math.max(Math.floor(filled), 0), n)
  return (
    <div className="mb-2.5 flex flex-wrap gap-1">
      {Array.from({ length: n }, (_, i) => {
        const variant = i < f ? 'filled' : i === f && f < n ? 'amber' : 'outline'
        return (
          <span
            key={i}
            className="inline-flex cursor-default rounded-sm motion-safe:animate-[dash-star-pop_0.42s_ease-out_both] motion-reduce:animate-none transition-transform duration-200 ease-out will-change-transform hover:z-10 hover:scale-125 hover:rotate-12"
            style={{ animationDelay: `${i * 72}ms` }}
          >
            <StarIcon variant={variant} />
          </span>
        )
      })}
    </div>
  )
}

export interface HrEmployeeProfileProps {
  employee: EmployeeEntity
  /** Mặc định mở tab khi vào từ URL `?mode=edit`. */
  initialTab?: number
}

export function HrEmployeeProfile({ employee, initialTab = 0 }: HrEmployeeProfileProps) {
  const [tab, setTab] = useState(() => Math.min(4, Math.max(0, initialTab)))
  const { label: tierLabel, tierClass } = levelMeta(employee.currentLevel)
  const maxStars = STARS_PER_LEVEL[employee.currentLevel as LevelCode] || 6
  const xpPct = maxStars > 0 ? Math.min(100, Math.round((employee.currentStar / maxStars) * 100)) : 0
  const levelIdx = LEVEL_ORDER.indexOf(employee.currentLevel)

  const [editName, setEditName] = useState(employee.name)
  const [editEmail, setEditEmail] = useState(employee.email)

  const deptLine = `PB ${shortId(employee.departmentId)} · Team ${shortId(employee.teamIds[0] ?? employee.departmentId)}`
  const empCode = `VCB-${shortId(employee.id).toUpperCase()}`
  const { points, rank } = useMemo(
    () => demoGamificationFromSeed(employee.email ?? employee.id),
    [employee.email, employee.id]
  )

  const onDemoAction = (msg: string) => () => toast.info(msg)

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
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

        <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 px-6 pb-2 pt-5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-game-muted">
            <Link
              to="/hr-admin"
              search={{ page: 1 }}
              className="font-semibold text-primary hover:underline"
            >
              ← Danh sách nhân sự
            </Link>
            <span className="text-game-muted/50">/</span>
            <span className="font-semibold text-game-soft-foreground">{employee.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-game-accent/25 bg-white/95 px-3.5 py-2 text-xs font-semibold text-game-soft-foreground shadow-sm transition-colors hover:bg-game-soft"
              onClick={onDemoAction('Đổi phòng ban: kết nối API sau.')}
            >
              Đổi phòng ban
            </button>
            <button
              type="button"
              className="rounded-full border border-game-accent/25 bg-white/95 px-3.5 py-2 text-xs font-semibold text-game-soft-foreground shadow-sm transition-colors hover:bg-game-soft"
              onClick={onDemoAction('Đổi role: kết nối API sau.')}
            >
              Đổi role
            </button>
            <button
              type="button"
              className="rounded-full border border-red-300/80 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100"
              onClick={onDemoAction('Hủy hoạt động: cần xác nhận và API.')}
            >
              Hủy hoạt động
            </button>
            <button
              type="button"
              className="rounded-full bg-button px-4 py-2 text-xs font-bold text-button-foreground shadow-[0_2px_10px_rgb(106_90_224/0.35)] transition-colors hover:bg-button-hover"
              onClick={onDemoAction('Lưu thay đổi: kết nối API sau.')}
            >
              Lưu thay đổi
            </button>
          </div>
        </div>

        <div className="relative z-[1] flex flex-wrap items-start justify-between gap-4 px-6 pb-0 pt-2 motion-safe:animate-[profile-hero-in_0.65s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-5">
            <EmployeeAvatar
              name={employee.name}
              showOnlineDot={employee.status === 'ACTIVE'}
              className="h-[88px] w-[88px] border-[3px] border-white text-[26px] shadow-[var(--shadow-game-float)] ring-4 ring-game-accent/20 sm:h-[92px] sm:w-[92px] sm:text-[28px]"
            />
            <div className="min-w-0 pb-4">
              <div className="flex flex-wrap items-center gap-3 gap-y-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-game-soft-foreground md:text-3xl">
                  {employee.name}
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
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-game-muted md:text-sm">
                <Building2 className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} />
                {deptLine}
                <span className="text-game-muted/40">·</span>
                <Clock className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} />
                {empCode} · Vào {new Date(employee.createdAt).toLocaleDateString('vi-VN')}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-game-accent/20 bg-white/90 px-3 py-1 text-xs font-semibold text-game-soft-foreground shadow-sm">
                  👑 {roleShortLabel(employee.role)}
                </span>
                <span
                  className={cn(
                    'rounded-full border border-game-accent/15 bg-white/90 px-3 py-1 text-xs font-semibold shadow-sm',
                    tierClass
                  )}
                >
                  {tierLabel}
                </span>
                <span className="rounded-full border border-game-accent/20 bg-white/90 px-3 py-1 text-xs font-semibold text-game-soft-foreground shadow-sm">
                  {employee.status === 'ACTIVE' ? '✅ Hoạt động' : `⏸ ${employee.status}`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-4">
            <button
              type="button"
              onClick={() => setTab(4)}
              className="rounded-full bg-button px-5 py-2.5 text-sm font-semibold text-button-foreground shadow-[0_2px_10px_rgb(106_90_224/0.35)] transition-colors hover:bg-button-hover"
            >
              Chỉnh sửa hồ sơ
            </button>
            <button
              type="button"
              onClick={() => toast.info('Cài đặt nhân viên (demo)')}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-game-accent/25 bg-white text-game-soft-foreground shadow-sm transition-colors hover:bg-game-soft"
              aria-label="Cài đặt"
            >
              <Settings className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="relative z-[1] mt-2 px-6 pb-3 motion-safe:animate-[profile-hero-in_0.55s_cubic-bezier(0.22,1,0.36,1)_0.08s_both] motion-reduce:animate-none">
          <div className="inline-flex max-w-full flex-wrap rounded-full bg-game-soft/90 p-1 shadow-[inset_0_1px_3px_rgb(106_90_224/0.08)]">
            {TABS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(i)}
                className={cn(
                  'rounded-full px-3 py-2 text-xs font-semibold transition-[color,transform,box-shadow] duration-200 sm:px-4 md:text-sm',
                  tab === i
                    ? 'bg-game-accent text-game-accent-foreground shadow-[0_2px_10px_rgb(106_90_224/0.35)]'
                    : 'text-game-muted hover:scale-[1.02] hover:text-game-soft-foreground active:scale-[0.98]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-app-canvas">
        {tab === 0 && (
          <OverviewTab
            employee={employee}
            tierLabel={tierLabel}
            tierClass={tierClass}
            xpPct={xpPct}
            maxStars={maxStars}
          />
        )}
        {tab === 1 && <LearningPathTab employee={employee} levelIdx={levelIdx} />}
        {tab === 2 && <ExamResultsTab />}
        {tab === 3 && <WorkHistoryTab />}
        {tab === 4 && (
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
        'mb-3.5 overflow-hidden rounded-xl border border-border/90 bg-card shadow-[var(--shadow-card)]',
        entranceIndex !== undefined ? CARD_ENTRANCE_HOVER : CARD_HOVER
      )}
      style={entranceIndex !== undefined ? staggerStyle(entranceIndex) : undefined}
    >
      <div className="border-b border-border bg-primary/10 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-primary">
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
}: {
  employee: EmployeeEntity
  tierLabel: string
  tierClass: string
  xpPct: number
  maxStars: number
}) {
  return (
    <div className="grid gap-5 px-6 py-5 lg:grid-cols-[260px_1fr]">
      <div>
        <PfCard title="Thống kê học tập" entranceIndex={0}>
          <div className="space-y-0">
            {[
              ['📋 Bài đã nộp (gần nhất)', '18'],
              ['✅ Tỉ lệ đạt', '83%'],
              ['🎓 Kỳ thi đã qua', '6'],
              ['📅 Thời gian làm việc', '—'],
              ['👥 Mentee (nếu có)', '—'],
            ].map(([a, b]) => (
              <div key={a} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <span className="text-xs text-muted-foreground">{a}</span>
                <span className="text-sm font-bold text-foreground">{b}</span>
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
                  i < 3 ? 'border-primary/30 bg-gradient-to-br from-app-canvas to-primary/10' : 'opacity-40 grayscale'
                )}
                style={staggerStyle(i + 2)}
              >
                <div className="text-[22px]">{icon}</div>
                <div className="text-xs font-bold text-foreground">{name}</div>
                <div className="mt-0.5 text-[9px] text-muted-foreground">{sub}</div>
              </div>
            ))}
          </div>
        </PfCard>
      </div>
      <div>
        <div
          className={cn(
            'mb-3.5 rounded-2xl border border-game-accent/20 bg-gradient-to-br from-white via-game-soft/45 to-primary/[0.08] px-5 py-4 text-foreground shadow-[var(--shadow-card)] ring-1 ring-game-accent/10',
            CARD_ENTRANCE_HOVER
          )}
          style={staggerStyle(2)}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-game-muted">Cấp độ hiện tại</div>
              <div className="mt-0.5 text-xl font-extrabold text-game-soft-foreground">
                ⚔️ {LEVEL_LABELS[employee.currentLevel as LevelCode]}
              </div>
            </div>
            <span className={cn('rounded-full border border-game-accent/15 bg-white/80 px-3 py-1 text-xs font-bold shadow-sm', tierClass)}>
              {tierLabel}
            </span>
          </div>
          <p className="mb-2 text-xs text-game-muted">
            Tiến độ Sao {employee.currentStar}/{maxStars} · {LEVEL_LABELS[employee.currentLevel as LevelCode]}
          </p>
          <HeroStars filled={employee.currentStar} maxStars={maxStars} />
          <div className="group/pb mt-2 h-1.5 overflow-hidden rounded-md bg-primary/15 transition-[box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]">
            <div
              className={cn('h-full rounded-md bg-gradient-to-r from-primary via-game-accent to-accent', PROGRESS_BAR_FILL)}
              style={{
                width: `${xpPct}%`,
                transformOrigin: '0 50%',
                animationDelay: `${Math.min(maxStars, 6) * 72 + 80}ms`,
              }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-muted-foreground">{xpPct}% hoàn thành cấp độ</p>
        </div>
        <PfCard title="Lịch sử thăng cấp" entranceIndex={3}>
          <div className="relative pl-8">
            <div className="absolute bottom-4 left-[15px] top-4 w-0.5 bg-gradient-to-b from-emerald-500 via-primary to-primary/20" />
            <div className="relative mb-3.5">
              <div className="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-button-foreground">
                {LEVEL_ORDER.indexOf(employee.currentLevel) + 1}
              </div>
              <div className="pl-8">
                <div className="text-xs font-bold">
                  {LEVEL_LABELS[employee.currentLevel as LevelCode]}{' '}
                  <span className="text-primary">· Đang học</span>
                </div>
                <div className="text-xs text-muted-foreground">Cập nhật {new Date(employee.updatedAt).toLocaleDateString('vi-VN')}</div>
                <span className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold', tierClass)}>{tierLabel}</span>
              </div>
            </div>
            <p className="pl-8 text-xs text-muted-foreground">Các cấp trước được ẩn khi có API lịch sử đầy đủ.</p>
          </div>
        </PfCard>
      </div>
    </div>
  )
}

function LearningPathTab({ employee, levelIdx }: { employee: EmployeeEntity; levelIdx: number }) {
  return (
    <div className="grid gap-5 px-6 py-5 lg:grid-cols-[260px_1fr]">
      <PfCard title="Tiến độ tổng thể" entranceIndex={0}>
        <div className="space-y-0">
          <div className="flex justify-between border-b border-border py-2">
            <span className="text-xs text-muted-foreground">Cấp đang học</span>
            <span className="text-sm font-bold">{LEVEL_LABELS[employee.currentLevel as LevelCode]}</span>
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
                      {LEVEL_LABELS[lv]} {active && <span className="text-primary">· Đang học</span>}
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
    <div className="grid gap-5 px-6 py-5 lg:grid-cols-[260px_1fr]">
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
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', badgeClass)}>{badge}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-lg bg-white/70 px-2 py-1.5">
            <div className="text-[9px] font-semibold uppercase text-muted-foreground">{l}</div>
            <div className="text-sm font-bold">{v}</div>
          </div>
        ))}
      </div>
      {note ? <p className="mt-2 border-t border-black/5 pt-2 text-xs italic text-muted-foreground">{note}</p> : null}
    </div>
  )
}

function WorkHistoryTab() {
  return (
    <div className="grid gap-5 px-6 py-5 lg:grid-cols-[260px_1fr]">
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
            ['Hoàn thành mốc học tập', '20/03/2026 · Người chấm: Lê Thu Hà', 'Đạt', 'bg-emerald-500'],
            ['Thăng cấp bậc', '05/01/2026 · Manager phê duyệt', 'Thăng cấp', 'bg-primary'],
            ['Gia nhập & onboard', 'Theo dữ liệu hệ thống', 'Onboard', 'bg-slate-400'],
          ].map(([t, m, b, dot], idx) => (
            <div key={idx} className="relative mb-5">
              <div className={cn('absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white', dot)} />
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{t}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{m}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-primary">{b}</span>
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
    <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1fr_1fr]">
      <div>
        <PfCard title="Phân công tổ chức" entranceIndex={0}>
          <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-2 text-xs text-primary">
            <span>✏️</span>
            <span>HR Admin có thể chỉnh sửa phân công khi đã kết nối API.</span>
          </div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Role</label>
          <select className="mb-3 w-full rounded-[9px] border border-border bg-white px-3 py-2 text-sm" disabled defaultValue={employee.role}>
            <option value={employee.role}>{roleShortLabel(employee.role)}</option>
          </select>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Phòng ban</label>
          <select className="w-full rounded-[9px] border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground" disabled>
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
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Họ và tên</label>
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
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Mã nhân viên</label>
            <input className="w-full rounded-[9px] border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground" readOnly value={empCode} />
          </div>
        </div>
      </PfCard>
    </div>
  )
}
