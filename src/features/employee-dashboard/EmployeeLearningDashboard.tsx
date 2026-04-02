import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'

function monthLabelVi(d: Date): string {
  return `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}`
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
    </svg>
  )
}

export function EmployeeLearningDashboard() {
  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div
        className={cn(
          'page-toolbar-gradient items-center',
          'motion-safe:animate-[profile-card-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40 motion-safe:animate-[dash-shimmer_8s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            background:
              'linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.12) 45%, transparent 90%)',
            backgroundSize: '200% 100%',
          }}
        />
        <div className="relative text-base font-semibold tracking-tight text-foreground">
          <span className="bg-gradient-to-r from-primary via-violet-600 to-accent bg-clip-text text-transparent">
            Dashboard học tập
          </span>
        </div>
        <div className="relative rounded-full border border-primary/20 bg-card/90 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur-sm">
          {monthLabelVi(new Date())}
        </div>
      </div>

      <div className="page-shell">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            className={cn(
              'group rounded-[9px] border border-violet-300/50 bg-gradient-to-br from-white via-sky-50/95 to-violet-100/80 p-4 text-foreground shadow-[var(--shadow-card)] ring-1 ring-violet-200/40 transition-all duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg',
              CARD_ENTRANCE_HOVER
            )}
            style={staggerStyle(0)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-violet-700/90">Cấp độ hiện tại</div>
                <div className="mt-1 text-sm font-bold text-slate-900">⚔️ Được việc</div>
                <div className="mt-0.5 text-xs text-muted-foreground">Sao 4 / 6 · Gold tier</div>
              </div>
              <span className="rounded-md bg-gradient-to-br from-amber-400 to-orange-500 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white shadow-sm">
                Gold
              </span>
            </div>
          </div>

          <div
            className={cn(
              'group rounded-[9px] border border-emerald-200/80 bg-gradient-to-br from-emerald-50/95 via-white to-teal-50/90 p-4 shadow-[var(--shadow-card)] ring-1 ring-emerald-200/35 transition-all duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg',
              CARD_ENTRANCE_HOVER
            )}
            style={staggerStyle(1)}
          >
            <div className="mb-1 text-xs font-semibold text-emerald-800/90">📋 Bài đã nộp T3</div>
            <div className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-[28px] font-extrabold leading-tight text-transparent">
              18
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-emerald-600 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5">
                ↑ 6 so với T2
              </span>
            </div>
          </div>

          <div
            className={cn(
              'group rounded-[9px] border border-violet-200/70 bg-gradient-to-br from-violet-50/95 via-fuchsia-50/50 to-white p-4 shadow-[var(--shadow-card)] ring-1 ring-fuchsia-200/40 transition-all duration-300 sm:col-span-2 lg:col-span-1 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg',
              CARD_ENTRANCE_HOVER
            )}
            style={staggerStyle(2)}
          >
            <div className="mb-1 text-xs font-semibold text-violet-800/85">🏅 Tỉ lệ đạt</div>
            <div className="bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-[28px] font-extrabold leading-tight text-transparent">
              83%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-fuchsia-600 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5">
                ↑ Top 15% team
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <div
            className={cn(
              'overflow-hidden rounded-[13px] border border-indigo-200/60 bg-white shadow-[var(--shadow-card)] ring-1 ring-indigo-100/50 transition-shadow duration-300 motion-safe:hover:shadow-lg',
              CARD_ENTRANCE_HOVER
            )}
            style={staggerStyle(3)}
          >
            <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-500/12 via-violet-500/8 to-transparent px-4 py-3 text-sm font-bold text-indigo-950">
              Lộ trình 5 cấp độ
            </div>
            <div className="flex flex-col gap-3 p-4">
              <LevelRow tone="done" dot="✓" title="Tập sự" subtitle="Đã hoàn thành" />
              <LevelRow tone="done" dot="✓" title="Biết việc" subtitle="Hoàn thành · 6/6 sao" />
              <LevelRow tone="current" dot="→" title="Được việc" subtitle="Đang học · Sao 4/6" highlight />
              <LevelRow tone="locked" dot="🔒" title="Đóng góp kết quả" subtitle="Chưa mở" />
              <LevelRow tone="locked" dot="🔒" title="Tướng" subtitle="Mục tiêu cuối" />
            </div>
          </div>

          <div
            className={cn(
              'overflow-hidden rounded-[13px] border border-teal-200/60 bg-white shadow-[var(--shadow-card)] ring-1 ring-teal-100/50 transition-shadow duration-300 motion-safe:hover:shadow-lg',
              CARD_ENTRANCE_HOVER
            )}
            style={staggerStyle(4)}
          >
            <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-cyan-500/8 to-transparent px-4 py-3 text-sm font-bold text-teal-950">
              Được việc — 6 sao hiện tại
            </div>
            <div className="p-4">
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gradient-to-br from-star-gold to-star-gold-deep text-white shadow-[0_2px_12px_rgba(212,160,23,0.42)] motion-safe:animate-[dash-star-pop_0.55s_ease-out_forwards] motion-safe:transition-transform motion-safe:hover:scale-110 motion-safe:hover:shadow-md motion-reduce:animate-none',
                      'motion-safe:active:scale-95'
                    )}
                    style={{ animationDelay: `${(i - 1) * 85}ms` }}
                    title={`Sao ${i} - Đạt`}
                  >
                    <StarIcon className="h-[70%] w-[70%] p-0.5 text-white" />
                  </div>
                ))}
                <div
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-star-gold-soft bg-gradient-to-br from-star-gold-mid to-star-gold text-white shadow-[0_0_12px_rgba(212,160,23,0.4)] motion-safe:animate-[dash-star-pop_0.55s_ease-out_forwards] motion-safe:transition-transform motion-safe:hover:scale-110 motion-reduce:animate-none"
                  style={{ animationDelay: '340ms' }}
                  title="Sao 5 - Đang học"
                >
                  <StarIcon className="h-[70%] w-[70%] p-0.5 text-white" />
                </div>
                <div
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-star-gold-soft/80 bg-slate-100/90 text-star-gold-soft motion-safe:animate-[dash-star-pop_0.55s_ease-out_forwards] motion-reduce:animate-none"
                  style={{ animationDelay: '425ms' }}
                  title="Sao 6 - Chưa mở"
                >
                  <StarIcon className="h-[70%] w-[70%] p-0.5 text-star-gold-soft" />
                </div>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Sao 5 đang học · Sao 6 chưa mở</p>
              <div className="my-2.5 h-px bg-border" />
              <p className="mb-1 text-xs font-medium text-teal-800/90">KPI/OKR tháng 3</p>
              <div className="group/pb mb-1 h-1.5 overflow-hidden rounded-full bg-primary/15 transition-[box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]">
                <div
                  className="h-full w-[75%] origin-left rounded bg-gradient-to-r from-primary via-sky-600 to-accent motion-safe:animate-[profile-progress-fill_1.1s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none"
                  style={{ transformOrigin: 'left', animationDelay: '420ms' }}
                />
              </div>
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Hoàn thành 3/4 mục tiêu</span>
                <span className="font-semibold text-primary motion-safe:tabular-nums motion-safe:transition-all motion-safe:duration-500">
                  75%
                </span>
              </div>
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-[9px] border border-border bg-muted/50 py-2 text-xs font-medium text-muted-foreground opacity-55"
              >
                Đăng ký thi — Chưa đủ điều kiện
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">Cần hoàn thành sao 5 và 6</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LevelRow({
  tone,
  dot,
  title,
  subtitle,
  highlight,
}: {
  tone: 'done' | 'current' | 'locked'
  dot: string
  title: string
  subtitle: string
  highlight?: boolean
}) {
  const base =
    tone === 'locked'
      ? 'border border-slate-200/60 bg-slate-50/80 opacity-50'
      : tone === 'current' || highlight
        ? 'border border-primary/35 bg-gradient-to-r from-primary/12 via-sky-500/10 to-violet-500/8 shadow-[0_2px_12px_hsl(var(--primary)/0.12)] motion-safe:transition-all motion-safe:hover:border-primary/50 motion-safe:hover:shadow-md'
        : 'border border-emerald-200/50 bg-emerald-50/70 opacity-90 motion-safe:transition-transform motion-safe:hover:translate-x-0.5'

  const dotClass =
    tone === 'done'
      ? 'bg-emerald-200 text-emerald-800 ring-1 ring-emerald-300/60'
      : tone === 'current'
        ? 'bg-button text-button-foreground shadow-sm ring-2 ring-primary/25'
        : 'bg-slate-200 text-slate-500'

  return (
    <div className={cn('flex items-center gap-2.5 rounded-[9px] px-2 py-2', base)}>
      <div
        className={cn(
          'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold',
          dotClass
        )}
      >
        {dot}
      </div>
      <div>
        <div
          className={cn(
            'text-xs font-medium',
            tone === 'current' ? 'text-primary' : tone === 'done' ? 'text-emerald-900' : 'text-foreground'
          )}
        >
          {title}
        </div>
        <div
          className={cn(
            'text-xs',
            tone === 'current' ? 'text-primary/90' : tone === 'done' ? 'text-emerald-800/90' : 'text-muted-foreground'
          )}
        >
          {subtitle}
        </div>
      </div>
    </div>
  )
}
