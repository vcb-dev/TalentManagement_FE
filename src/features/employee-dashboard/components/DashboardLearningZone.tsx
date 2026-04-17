import {
  BarChart3,
  CalendarDays,
  Check,
  Clock,
  Flag,
  Hourglass,
  Lock,
  Route,
  Zap,
} from 'lucide-react'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { LEVELS, LEVEL_LABELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const quartOut = '[transition-timing-function:cubic-bezier(0.25,1,0.48,1)]'

export type DashboardLearningZoneProps = {
  /** Khi true, cột lộ trình hiển thị skeleton thay vì số liệu tạm. */
  isLoading?: boolean
  /** Cấp độ nghề nghiệp hiện tại (theo dashboard / API). */
  currentLevel: LevelCode
  /** Số sao trong cấp độ hiện tại. */
  currentStars: number
}

function RoadmapSkeleton() {
  return (
    <div className="relative space-y-0 pl-0">
      <div
        className="absolute bottom-4 left-[19px] top-4 w-1 rounded-full bg-border/80"
        aria-hidden
      />
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={cn(
            'relative pl-12 motion-safe:animate-pulse motion-reduce:animate-none',
            i < 4 ? 'pb-10' : ''
          )}
        >
          <div className="absolute left-0 h-10 w-10 rounded-full bg-muted/90" />
          <div className="mb-2 h-3 w-28 rounded-md bg-muted/70" />
          <div className="h-5 max-w-[200px] rounded-md bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

/** Khối lộ trình học, thi cử — phần tab học tập (phần đầu dashboard nằm ở EmployeeLearningDashboard). */
export function DashboardLearningZone({
  isLoading = false,
  currentLevel,
  currentStars,
}: DashboardLearningZoneProps) {
  const levelIndex = LEVELS.indexOf(currentLevel)
  const currentIndex = levelIndex >= 0 ? levelIndex : 0
  const maxStarsActive = STARS_PER_LEVEL[currentLevel]
  const progressPct =
    maxStarsActive > 0 ? Math.round(Math.min(100, (currentStars / maxStarsActive) * 100)) : null

  return (
    <div className="space-y-8 text-sm text-foreground">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <section
          className={cn(
            'relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-game-soft/50 to-accent/[0.1] p-6 shadow-[var(--shadow-game-float)] md:p-8 lg:col-span-4',
            CARD_ENTRANCE_HOVER,
            'motion-safe:transition-shadow motion-safe:duration-300 hover:shadow-[0_24px_48px_-20px_hsl(var(--primary)/0.35)] motion-reduce:transition-none'
          )}
          style={staggerStyle(0, 55)}
          aria-labelledby="dash-learning-path-title"
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/25 blur-2xl motion-safe:animate-[dash-glow-orb_7s_ease-in-out_infinite] motion-reduce:animate-none"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 left-2 h-28 w-28 rounded-full bg-accent/20 blur-2xl motion-safe:animate-[dash-glow-orb_8s_ease-in-out_infinite_1s] motion-reduce:animate-none"
            aria-hidden
          />

          <h3
            id="dash-learning-path-title"
            className="relative mb-8 flex items-center gap-2 text-xl font-black tracking-tight text-foreground"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-600 text-primary-foreground shadow-lg shadow-primary/30">
              <Route className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            </span>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Lộ trình 5 cấp độ
            </span>
          </h3>

          {isLoading ? (
            <RoadmapSkeleton />
          ) : (
            <div className="relative space-y-0 pl-0">
              <div
                className="absolute bottom-4 left-[19px] top-4 w-1 rounded-full bg-gradient-to-b from-primary via-accent to-border/80 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
                aria-hidden
              />

              {LEVELS.map((stepCode, i) => {
                const displayNum = String(i + 1)
                const title = LEVEL_LABELS[stepCode]
                const isLast = i === LEVELS.length - 1
                const baseDelay = 80 + i * 70

                if (i < currentIndex) {
                  return (
                    <div
                      key={stepCode}
                      className="relative pb-10 pl-12 motion-safe:animate-[dash-fade-up_0.5s_ease-out_both] motion-reduce:animate-none"
                      style={{ animationDelay: `${baseDelay}ms` }}
                    >
                      <div className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-600 text-primary-foreground shadow-lg shadow-primary/40 ring-2 ring-primary/30 motion-safe:transition-transform motion-safe:duration-300 hover:scale-110">
                        <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                      </div>
                      <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-primary">
                        Cấp độ {displayNum}
                      </p>
                      <h4 className="text-lg font-bold leading-tight text-foreground">{title}</h4>
                      <span className="mt-1 inline-block rounded-md border border-primary/20 bg-primary/12 px-2 py-0.5 text-sm font-semibold text-primary">
                        Hoàn thành
                      </span>
                    </div>
                  )
                }

                if (i === currentIndex) {
                  return (
                    <div
                      key={stepCode}
                      className={cn(
                        'relative pl-12 motion-safe:animate-[dash-fade-up_0.55s_ease-out_both] motion-reduce:animate-none',
                        !isLast ? 'pb-10' : ''
                      )}
                      style={{ animationDelay: `${baseDelay}ms` }}
                    >
                      <span
                        className="absolute left-2 top-3 z-0 h-10 w-10 -translate-x-1/2 rounded-full bg-primary/35 motion-safe:animate-ping motion-reduce:hidden"
                        aria-hidden
                      />
                      <div className="absolute -left-1 z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-card bg-gradient-to-br from-primary via-primary-600 to-accent text-primary-foreground shadow-xl shadow-primary/40 motion-safe:animate-[dash-float-slow_4s_ease-in-out_infinite] motion-reduce:animate-none">
                        <Hourglass
                          className="h-6 w-6 motion-safe:animate-pulse motion-reduce:animate-none"
                          aria-hidden
                        />
                      </div>
                      <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-primary">
                        Cấp độ {displayNum}
                      </p>
                      <h4 className="text-xl font-black leading-tight text-foreground">{title}</h4>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gradient-to-r from-primary to-primary-600 px-3 py-1 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25">
                          Đang học
                        </span>
                        {progressPct !== null ? (
                          <span className="text-xs font-semibold text-muted-foreground">
                            Tiến độ: {progressPct}%
                          </span>
                        ) : null}
                      </div>
                      {progressPct !== null ? (
                        <div className="mt-3 h-2 max-w-[180px] overflow-hidden rounded-full bg-background/60 p-px shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-primary motion-safe:transition-[width] motion-safe:duration-[1s] motion-safe:ease-out"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                }

                return (
                  <div
                    key={stepCode}
                    className={cn(
                      'relative pl-12 opacity-[0.72]',
                      !isLast ? 'pb-10' : 'opacity-90'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-sm',
                        isLast
                          ? 'border-2 border-border bg-background/80 text-muted-foreground'
                          : 'border-2 border-dashed border-muted-foreground/35 bg-muted text-muted-foreground'
                      )}
                    >
                      {isLast ? (
                        <Flag className="h-5 w-5" strokeWidth={2} aria-hidden />
                      ) : (
                        <Lock className="h-5 w-5" strokeWidth={2} aria-hidden />
                      )}
                    </div>
                    <p
                      className={cn(
                        'mb-1 text-[0.65rem] font-bold uppercase tracking-widest',
                        isLast ? 'text-muted-foreground' : 'text-muted-foreground'
                      )}
                    >
                      Cấp độ {displayNum}
                    </p>
                    <h4 className="text-lg font-bold leading-tight text-foreground">{title}</h4>
                    <span
                      className={cn(
                        'mt-1 inline-block text-sm font-medium',
                        isLast ? 'text-muted-foreground' : 'text-muted-foreground italic'
                      )}
                    >
                      {isLast ? 'Mục tiêu cuối' : 'Chưa mở'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-6 lg:col-span-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div
              className={cn(
                'group relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-b from-muted/70 via-card to-primary/[0.05] p-6 shadow-md',
                CARD_ENTRANCE_HOVER,
                'motion-safe:transition-all motion-safe:duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-game-float)] motion-reduce:transition-none motion-reduce:hover:translate-y-0'
              )}
              style={staggerStyle(1, 55)}
            >
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <h4 className="relative mb-4 flex items-center gap-2 text-lg font-black text-foreground">
                <CalendarDays
                  className="h-5 w-5 text-primary motion-safe:transition-transform group-hover:rotate-12"
                  strokeWidth={2}
                  aria-hidden
                />
                Kỳ thi tiếp theo
              </h4>
              <div className="relative mb-4 rounded-2xl border border-primary/10 bg-card/95 p-4 shadow-inner backdrop-blur-sm">
                <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-tighter text-primary/90">
                  Môn thi kiến thức
                </p>
                <p className="font-bold text-foreground">
                  Kỹ năng quản lý tài chính doanh nghiệp II
                </p>
                <div className="mt-3 flex flex-wrap gap-4 border-t border-border/80 pt-3">
                  <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                    <CalendarDays className="h-4 w-4 text-accent" strokeWidth={2} />
                    24/04/2026
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                    <Clock className="h-4 w-4 text-primary" strokeWidth={2} />
                    09:00
                  </div>
                </div>
              </div>
              <Button
                type="button"
                className={cn(
                  'relative h-auto w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary-600 to-accent py-3.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/30',
                  quartOut,
                  'transition-all hover:brightness-110 hover:shadow-xl active:scale-[0.98] motion-reduce:active:scale-100'
                )}
              >
                <span className="relative z-10">Đăng ký tham gia ngay</span>
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out group-hover:translate-x-full motion-reduce:hidden"
                  aria-hidden
                />
              </Button>
            </div>

            <div
              className={cn(
                'relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-muted via-card to-accent/[0.08] p-6 shadow-md',
                CARD_ENTRANCE_HOVER,
                'motion-safe:transition-all motion-safe:duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-18px_hsl(var(--accent)/0.35)] motion-reduce:transition-none'
              )}
              style={staggerStyle(2, 55)}
            >
              <div
                className="pointer-events-none absolute -bottom-8 -right-8 opacity-[0.12] motion-safe:animate-[dash-float-slow_6s_ease-in-out_infinite] motion-reduce:animate-none"
                aria-hidden
              >
                <BarChart3 className="h-36 w-36 text-accent" strokeWidth={1} />
              </div>
              <h4 className="relative mb-4 flex items-center gap-2 text-lg font-black text-foreground">
                <Zap
                  className="h-5 w-5 text-accent motion-safe:animate-pulse motion-reduce:animate-none"
                  strokeWidth={2}
                  aria-hidden
                />
                Kỹ năng trọng yếu
              </h4>
              <div className="relative space-y-4">
                {[
                  { label: 'Giao tiếp khách hàng', pct: 80, score: '8/10' },
                  { label: 'Xử lý nghiệp vụ', pct: 60, score: '6/10' },
                  { label: 'Tư duy hệ thống', pct: 50, score: '5/10' },
                ].map((row, j) => (
                  <div key={row.label} style={staggerStyle(j, 40)}>
                    <div className="mb-1 flex justify-between text-xs font-bold text-foreground">
                      <span>{row.label}</span>
                      <span className="tabular-nums text-accent">{row.score}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-border/80 p-px shadow-inner">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary-600 motion-safe:transition-[width] motion-safe:duration-[1.1s] motion-safe:ease-out"
                        style={{ width: `${row.pct}%`, transitionDelay: `${j * 100}ms` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative mt-6 rounded-xl border border-accent/25 bg-gradient-to-r from-card/95 to-accent/5 p-3 text-[0.6875rem] font-semibold leading-snug text-muted-foreground shadow-sm backdrop-blur-sm">
                Gợi ý: Tham gia khóa &quot;Kỹ thuật đàm phán 4.0&quot; để tăng thêm 2 điểm kỹ năng
                giao tiếp.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
