import {
  BarChart3,
  CalendarDays,
  Check,
  Clock,
  Flag,
  Hourglass,
  Lock,
  Route,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { ProgressStar } from '@/components/shared/ProgressStar/ProgressStar'
import { CARD_ENTRANCE_HOVER, STAR_POP, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

function monthLabelVi(d: Date): string {
  return `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}`
}

const quartOut = '[transition-timing-function:cubic-bezier(0.25,1,0.5,1)]'

const LEVEL_STAR_FILLED = 4
const LEVEL_STAR_TOTAL = 6

/** Khối lộ trình học, sao, thi cử — bố cục theo mock dashboard, tông màu & cỡ chữ theo theme dự án. */
export function DashboardLearningZone() {
  const userName = useAuthStore((s) => s.user?.name)
  const greetingName = userName?.trim() || 'bạn'

  return (
    <div className="space-y-8 text-sm text-foreground">
      {/* Section: tiêu đề trang + tháng */}
      <section
        className={cn(
          'flex flex-col justify-between gap-4 md:flex-row md:items-end',
          'motion-safe:animate-[dash-fade-up_0.45s_ease-out_both] motion-reduce:animate-none'
        )}
      >
        <div>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Dashboard Nhân sự
          </h1>
          <p className="font-medium text-muted-foreground">
            Chào mừng trở lại, {greetingName}. Theo dõi tiến độ thăng tiến của bạn.
          </p>
        </div>
        <div
          className={cn(
            'inline-flex items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2 shadow-sm md:self-auto',
            CARD_ENTRANCE_HOVER
          )}
        >
          <CalendarDays className="h-5 w-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
          <span className="font-semibold text-primary">{monthLabelVi(new Date())}</span>
        </div>
      </section>

      {/* Section: hàng chỉ số */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div
          className={cn(
            'rounded-2xl border border-border border-l-4 border-l-primary bg-card p-6 shadow-sm',
            quartOut,
            'transition-all duration-300 hover:-translate-y-1',
            CARD_ENTRANCE_HOVER
          )}
          style={staggerStyle(0)}
        >
          <div className="mb-4 flex items-start justify-between">
            <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Cấp độ hiện tại
            </span>
            <span className="rounded-full bg-tier-gold-muted px-3 py-1 text-[0.65rem] font-black tracking-tighter text-tier-gold">
              GOLD
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div
              className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-tier-gold-muted/90 px-2.5 py-2 ring-1 ring-star-gold/20"
              role="img"
              aria-label={`${LEVEL_STAR_FILLED} trên ${LEVEL_STAR_TOTAL} sao đạt`}
            >
              {Array.from({ length: LEVEL_STAR_TOTAL }, (_, i) => (
                <span
                  key={i}
                  className={cn('inline-flex rounded-sm', STAR_POP)}
                  style={staggerStyle(i, 72)}
                >
                  <ProgressStar
                    filled={i < LEVEL_STAR_FILLED}
                    variant="gold"
                    className="h-6 w-6 sm:h-7 sm:w-7"
                  />
                </span>
              ))}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight text-foreground">Được việc</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Sao {LEVEL_STAR_FILLED}/{LEVEL_STAR_TOTAL} — Gold tier
              </p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'rounded-2xl border border-border border-l-4 border-l-primary-600 bg-card p-6 shadow-sm',
            quartOut,
            'transition-all duration-300 hover:-translate-y-1',
            CARD_ENTRANCE_HOVER
          )}
          style={staggerStyle(1)}
        >
          <div className="mb-4 flex items-start justify-between">
            <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Bài đã nộp T3
            </span>
            <TrendingUp className="h-5 w-5 text-primary-600" strokeWidth={2} aria-hidden />
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black tabular-nums text-foreground">18</span>
            <div className="mb-1 flex items-center text-sm font-bold text-primary-600">
              <span className="mr-0.5">+</span>
              <span>6 so với T2</span>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-3/4 rounded-full bg-primary-600" />
          </div>
        </div>

        <div
          className={cn(
            'rounded-2xl border border-border border-l-4 border-l-amber-700 bg-card p-6 shadow-sm',
            quartOut,
            'transition-all duration-300 hover:-translate-y-1',
            CARD_ENTRANCE_HOVER
          )}
          style={staggerStyle(2)}
        >
          <div className="mb-4 flex items-start justify-between">
            <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Tỉ lệ đạt
            </span>
            <BarChart3 className="h-5 w-5 text-amber-700" strokeWidth={2} aria-hidden />
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black tabular-nums text-foreground">83%</span>
            <div className="mb-1 rounded-full bg-tier-gold-muted px-2 py-0.5 text-sm font-bold text-amber-800">
              Top 15% team
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-primary" />
            ))}
            <div className="h-2 w-2 rounded-full bg-muted" />
            <span className="ml-2 text-[0.65rem] font-medium text-muted-foreground">Xuất sắc</span>
          </div>
        </div>
      </section>

      {/* Hai cột: timeline + nội dung phải */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <section
          className={cn(
            'relative overflow-hidden rounded-3xl bg-primary/5 p-6 md:p-8 lg:col-span-4',
            CARD_ENTRANCE_HOVER
          )}
          style={staggerStyle(3)}
          aria-labelledby="dash-learning-path-title"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/[0.07]"
            aria-hidden
          />
          <h3
            id="dash-learning-path-title"
            className="mb-8 flex items-center gap-2 text-xl font-bold text-foreground"
          >
            <Route className="h-6 w-6 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            Lộ trình 5 cấp độ
          </h3>
          <div className="relative space-y-0 pl-0">
            <div className="absolute bottom-4 left-[19px] top-4 w-0.5 bg-border" aria-hidden />

            {/* Bước 1–2: hoàn thành */}
            {[
              { level: '1', title: 'Tập sự', status: 'Hoàn thành' },
              { level: '2', title: 'Biết việc', status: 'Hoàn thành' },
            ].map((step) => (
              <div key={step.level} className="relative pb-10 pl-12">
                <div className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                </div>
                <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-primary">
                  Cấp độ {step.level}
                </p>
                <h4 className="text-lg font-bold leading-tight text-foreground">{step.title}</h4>
                <span className="mt-1 inline-block rounded-md bg-primary/12 px-2 py-0.5 text-sm font-semibold text-primary">
                  {step.status}
                </span>
              </div>
            ))}

            {/* Bước 3: đang học */}
            <div className="relative pb-10 pl-12">
              <div className="absolute -left-1 z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-xl shadow-primary/30">
                <Hourglass className="h-6 w-6 motion-safe:animate-pulse motion-reduce:animate-none" />
              </div>
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-primary">
                Cấp độ 3
              </p>
              <h4 className="text-xl font-black leading-tight text-foreground">Được việc</h4>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Đang học
                </span>
                <span className="text-xs font-medium text-muted-foreground">Tiến độ: 65%</span>
              </div>
            </div>

            {/* Bước 4: khóa */}
            <div className="relative pb-10 pl-12 opacity-60">
              <div className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-muted text-muted-foreground">
                <Lock className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Cấp độ 4
              </p>
              <h4 className="text-lg font-bold leading-tight text-foreground">Đóng góp kết quả</h4>
              <span className="mt-1 inline-block text-sm font-medium italic text-muted-foreground">
                Chưa mở
              </span>
            </div>

            {/* Bước 5 */}
            <div className="relative pl-12">
              <div className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-muted text-muted-foreground">
                <Flag className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Cấp độ 5
              </p>
              <h4 className="text-lg font-bold leading-tight text-foreground">Tường</h4>
              <span className="mt-1 inline-block text-sm font-medium text-muted-foreground">
                Mục tiêu cuối
              </span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6 lg:col-span-8">
          {/* Sao + tiến độ */}
          <div
            className={cn(
              'relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8',
              CARD_ENTRANCE_HOVER
            )}
            style={staggerStyle(4)}
          >
            <div className="pointer-events-none absolute right-6 top-6 opacity-[0.12]" aria-hidden>
              <Star className="h-28 w-28 rotate-12 fill-primary/30 text-primary" strokeWidth={1} />
            </div>
            <div className="relative mb-8">
              <h3 className="mb-2 text-2xl font-black text-foreground">
                Được việc — 6 sao hiện tại
              </h3>
              <p className="max-w-md text-muted-foreground">
                Bạn đã hoàn thành 4/6 tiêu chuẩn đánh giá. Hãy hoàn thành các sao còn lại để nâng hạng
                tiếp theo.
              </p>
            </div>
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl bg-tier-gold-muted/80 p-4 ring-1 ring-star-gold/15"
                role="img"
                aria-label={`${LEVEL_STAR_FILLED} trên ${LEVEL_STAR_TOTAL} sao đạt`}
              >
                {Array.from({ length: LEVEL_STAR_TOTAL }, (_, i) => (
                  <span
                    key={i}
                    className={cn('inline-flex rounded-sm', STAR_POP)}
                    style={staggerStyle(i, 72)}
                  >
                    <ProgressStar
                      filled={i < LEVEL_STAR_FILLED}
                      variant="gold"
                      className="h-9 w-9 sm:h-10 sm:w-10"
                    />
                  </span>
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black tabular-nums text-foreground">4 / 6</span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ngôi sao đạt được
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-foreground">Tiến trình nâng cấp</span>
                <span className="text-primary">66.7%</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-muted p-1">
                <div className="relative h-full w-2/3 rounded-full bg-primary">
                  <div className="absolute right-0 top-0 h-full w-2 bg-white/30 motion-safe:animate-pulse motion-reduce:animate-none" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Dự kiến hoàn thành:{' '}
                <span className="font-bold text-foreground">15/05/2026</span>
              </p>
            </div>
          </div>

          {/* Kỳ thi + kỹ năng */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div
              className={cn(
                'rounded-3xl bg-muted/60 p-6',
                CARD_ENTRANCE_HOVER
              )}
              style={staggerStyle(5)}
            >
              <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <CalendarDays className="h-5 w-5 text-primary-600" strokeWidth={2} aria-hidden />
                Kỳ thi tiếp theo
              </h4>
              <div className="mb-4 rounded-2xl border border-border bg-card p-4">
                <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-tighter text-muted-foreground">
                  Môn thi kiến thức
                </p>
                <p className="font-bold text-foreground">Kỹ năng quản lý tài chính doanh nghiệp II</p>
                <div className="mt-3 flex flex-wrap gap-4 border-t border-border/80 pt-3">
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                    24/04/2026
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                    09:00
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={cn(
                  'w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25',
                  quartOut,
                  'transition-all hover:bg-primary/90 active:scale-[0.98]'
                )}
              >
                Đăng ký tham gia ngay
              </button>
            </div>

            <div
              className={cn(
                'relative overflow-hidden rounded-3xl bg-muted p-6',
                CARD_ENTRANCE_HOVER
              )}
              style={staggerStyle(6)}
            >
              <div className="pointer-events-none absolute -bottom-8 -right-8 opacity-[0.06]" aria-hidden>
                <BarChart3 className="h-36 w-36 text-foreground" strokeWidth={1} />
              </div>
              <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <Zap className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
                Kỹ năng trọng yếu
              </h4>
              <div className="relative space-y-4">
                {[
                  { label: 'Giao tiếp khách hàng', pct: 80, score: '8/10' },
                  { label: 'Xử lý nghiệp vụ', pct: 60, score: '6/10' },
                  { label: 'Tư duy hệ thống', pct: 50, score: '5/10' },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between text-xs font-bold text-foreground">
                      <span>{row.label}</span>
                      <span>{row.score}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative mt-6 rounded-xl border border-border/80 bg-card/80 p-3 text-[0.6875rem] font-medium leading-snug text-muted-foreground backdrop-blur-sm">
                Gợi ý: Tham gia khóa &quot;Kỹ thuật đàm phán 4.0&quot; để tăng thêm 2 điểm kỹ năng giao
                tiếp.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
