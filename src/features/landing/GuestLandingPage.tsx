import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronRight,
  Layers,
  Shield,
  Target,
  Trophy,
} from 'lucide-react'
import { StarEmblem } from '@/components/icons/StarEmblem'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LEVEL_LABELS } from '@/lib/constants'

const appName = import.meta.env.VITE_APP_NAME ?? 'VCB HRM'

const featureCards = [
  {
    icon: Layers,
    title: 'Lộ trình năng lực & học tập',
    desc: 'Chuẩn hóa các bậc nghề nghiệp trong tổ chức, gắn nội dung đào tạo với mục tiêu phát triển từng cá nhân.',
    iconWrap: 'bg-primary/15 text-primary',
  },
  {
    icon: Trophy,
    title: 'Mục tiêu & hiệu suất (KPI / OKR)',
    desc: 'Theo dõi chỉ tiêu cá nhân và tập thể, phục vụ đánh giá định kỳ và điều phối nguồn lực.',
    iconWrap: 'bg-amber-500/15 text-amber-600',
  },
  {
    icon: Target,
    title: 'Kiểm tra & phân loại năng lực',
    desc: 'Tổ chức bài thi, ghi nhận kết quả và phân loại để hỗ trợ quyết định đào tạo, luân chuyển.',
    iconWrap: 'bg-cyan-500/15 text-cyan-600',
  },
] as const

const levelPills = Object.values(LEVEL_LABELS)

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

function useReveal(reduced: boolean, threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(reduced)

  useEffect(() => {
    if (reduced) {
      queueMicrotask(() => setVisible(true))
      return
    }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          queueMicrotask(() => setVisible(true))
          obs.disconnect()
        }
      },
      { rootMargin: '0px 0px -5% 0px', threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [reduced, threshold])

  return { ref, visible }
}

function Reveal({
  reduced,
  children,
  className,
  delayMs = 0,
}: {
  reduced: boolean
  children: ReactNode
  className?: string
  /** Trễ khi hiện (stagger các thẻ lưới). */
  delayMs?: number
}) {
  const { ref, visible } = useReveal(reduced)
  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className
      )}
      style={{ transitionDelay: visible && !reduced ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}

/** Khối hero — tránh dùng cubic-bezier trong class Tailwind tùy ý (dễ hỏng parse → kẹt opacity-0). */
function HeroBlock({
  delayMs,
  reduced,
  children,
  className,
}: {
  delayMs: number
  reduced: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        reduced
          ? 'opacity-100'
          : 'opacity-0 [animation-fill-mode:both] motion-reduce:opacity-100 motion-reduce:animate-none animate-[guest-landing-hero-in_0.75s_ease-out_both]',
        className
      )}
      style={!reduced ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}

export function GuestLandingPage() {
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-foreground">
      {/* Góc — gradient nhạt + chuyển động rất nhẹ */}
      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-violet-200/35 blur-3xl motion-reduce:animate-none animate-[guest-landing-float-soft_14s_ease-in-out_infinite]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-32 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl motion-reduce:animate-none animate-[guest-landing-float-soft_18s_ease-in-out_infinite_2s]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-40 left-1/4 h-56 w-56 rounded-full bg-indigo-100/40 blur-3xl motion-reduce:animate-none animate-[guest-landing-float-soft_16s_ease-in-out_infinite_1s]"
        aria-hidden
      />

      <header
        className={cn(
          'relative z-10 border-b border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-sm',
          reduced
            ? 'opacity-100'
            : 'motion-reduce:animate-none animate-[guest-landing-fade-in_0.45s_ease-out_both]'
        )}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Award className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg sm:text-[1.125rem]">{appName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <a
              href="#features"
              className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-primary sm:inline"
            >
              Phạm vi dự án
            </a>
            <Link
              to="/about-us"
              className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-primary sm:inline"
            >
              Giới thiệu
            </Link>
            <Button size="sm" className="shadow-sm" asChild>
              <Link to="/login">Đăng nhập</Link>
            </Button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'relative z-10 flex justify-center gap-10 border-b border-gray-100/80 bg-white/60 py-2.5 text-xs text-muted-foreground',
          reduced
            ? 'opacity-100'
            : 'motion-reduce:animate-none animate-[guest-landing-fade-in_0.5s_ease-out_0.08s_both]'
        )}
      >
        <span className="flex items-center gap-1.5 transition-colors hover:text-amber-700">
          <StarEmblem className="h-3.5 w-3.5" variant="filled" aria-hidden />
          Học tập & năng lực
        </span>
        <span className="flex items-center gap-1.5 transition-colors hover:text-emerald-700">
          <Shield className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          Phân quyền & bảo mật
        </span>
      </div>

      <main>
        {/* Hero */}
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="relative z-10 min-w-0 space-y-6">
              <HeroBlock delayMs={0} reduced={reduced}>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Trophy className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  Quản trị nhân sự &amp; phát triển năng lực
                </div>
              </HeroBlock>
              <HeroBlock delayMs={80} reduced={reduced}>
                <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.18]">
                  Một điểm đến cho <span className="text-primary">đào tạo</span>,{' '}
                  <span className="text-amber-600">đánh giá</span> và{' '}
                  <span className="text-primary">KPI</span>
                </h1>
              </HeroBlock>
              <HeroBlock delayMs={160} reduced={reduced}>
                <p className="max-w-xl text-pretty text-base leading-relaxed text-gray-600 sm:text-lg">
                  {appName} thống nhất dữ liệu lộ trình, học tập và chỉ tiêu hiệu suất — một nguồn
                  sự thật cho nhân viên, quản lý và HR trong toàn tổ chức.
                </p>
              </HeroBlock>
              <HeroBlock
                delayMs={240}
                reduced={reduced}
                className="flex flex-wrap items-center gap-3"
              >
                <Button size="lg" className="shadow-md" asChild>
                  <Link to="/login">
                    Bắt đầu
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-200 bg-white shadow-sm"
                  asChild
                >
                  <a href="#features">
                    <BookOpen className="h-4 w-4" aria-hidden />
                    Xem phạm vi
                  </a>
                </Button>
              </HeroBlock>
              <HeroBlock
                delayMs={320}
                reduced={reduced}
                className="flex flex-col gap-3 pt-1 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:gap-x-8"
              >
                <span className="inline-flex items-center gap-2">
                  <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Cấp bậc &amp; mục tiêu nghề nghiệp
                </span>
                <span className="inline-flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Báo cáo &amp; phê duyệt theo vai trò
                </span>
              </HeroBlock>
            </div>

            {/* Thẻ minh họa tiến độ */}
            <div
              className={cn(
                'relative z-10 mx-auto w-full max-w-md lg:mx-0 lg:max-w-none',
                reduced
                  ? 'opacity-100'
                  : 'motion-reduce:animate-none animate-[guest-landing-scale-in_0.85s_ease-out_0.2s_both]'
              )}
            >
              <div
                className="absolute -right-1 -top-2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-amber-100 bg-amber-50 text-amber-600 shadow-md motion-reduce:animate-none animate-[guest-landing-float-soft_3.5s_ease-in-out_infinite]"
                aria-hidden
              >
                <Trophy className="h-5 w-5" />
              </div>
              <div className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0_0_0/_0.08)] sm:rounded-3xl sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Theo dõi nhanh
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">Mục tiêu tuần</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div className="min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn(
                        'h-2.5 w-[82%] origin-left rounded-full bg-primary',
                        reduced
                          ? 'scale-x-100'
                          : 'scale-x-0 motion-reduce:scale-x-100 motion-reduce:animate-none animate-[guest-landing-bar-fill_1.15s_ease-out_0.6s_forwards]'
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-2xl font-extrabold tabular-nums text-primary',
                      reduced
                        ? 'opacity-100'
                        : 'opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none animate-[guest-landing-fade-in_0.4s_ease-out_1.1s_both]'
                    )}
                  >
                    82%
                  </span>
                </div>
                <div className="mt-4 flex gap-0.5" aria-label="Đánh giá sao">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <StarEmblem
                      key={i}
                      variant={i <= 4 ? 'filled' : 'empty'}
                      className={cn(
                        'h-5 w-5',
                        reduced
                          ? 'opacity-100'
                          : 'opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none animate-[guest-landing-star-pop_0.45s_ease-out_forwards]'
                      )}
                      style={reduced ? undefined : { animationDelay: `${1 + i * 0.07}s` }}
                      aria-hidden
                    />
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
                  {['Khởi đầu', 'Thành thạo', 'Chuyên sâu'].map((tag, i) => (
                    <span
                      key={tag}
                      className={cn(
                        'rounded-full border border-gray-200/90 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700',
                        reduced
                          ? 'opacity-100'
                          : 'opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none animate-[guest-landing-fade-up_0.4s_ease-out_forwards]'
                      )}
                      style={reduced ? undefined : { animationDelay: `${1.35 + i * 0.08}s` }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trọng tâm */}
        <section
          id="features"
          className="relative z-10 border-t border-gray-100 bg-gradient-to-b from-white to-gray-50/50 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
            <div
              className={cn(
                'rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-white to-sky-50/50',
                'p-6 shadow-[0_4px_28px_-6px_rgb(79_70_229/0.14)] sm:p-8 lg:p-10'
              )}
            >
              <Reveal reduced={reduced}>
                <div className="mx-auto max-w-2xl text-center">
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    Trọng tâm của dự án
                  </h2>
                  <p className="mt-3 text-pretty text-gray-600 sm:text-lg">
                    Đào tạo, đo lường kết quả và phối hợp giữa các cấp quản lý — không chỉ ghi nhận
                    thông tin tĩnh.
                  </p>
                </div>
              </Reveal>
              <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featureCards.map((card, i) => (
                  <Reveal key={card.title} reduced={reduced} delayMs={i * 90}>
                    <li
                      className={cn(
                        'group flex h-full flex-col rounded-2xl border border-gray-100/90 bg-white/95 p-6 shadow-sm backdrop-blur-[2px] sm:rounded-3xl sm:p-7'
                      )}
                    >
                      <div
                        className={cn(
                          'mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full',
                          card.iconWrap
                        )}
                      >
                        <card.icon className="h-6 w-6" aria-hidden />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{card.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                        {card.desc}
                      </p>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative z-10 py-14 sm:py-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
            <Reveal reduced={reduced}>
              <div className="overflow-hidden rounded-3xl vcb-banner-gradient px-6 py-10 text-white shadow-lg sm:px-10 sm:py-12">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
                  <div className="max-w-xl space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      Truy cập theo tài khoản nội bộ
                    </h2>
                    <p className="text-[15px] leading-relaxed text-white/90 sm:text-base">
                      Hệ thống bảo mật đa tầng, phân quyền theo đơn vị và chức danh — chỉ hiển thị
                      đúng dữ liệu và báo cáo thuộc phạm vi của bạn.
                    </p>
                    <div className="pt-1">
                      <Button
                        size="lg"
                        className="border-0 bg-white font-semibold text-primary shadow-md hover:bg-gray-50"
                        asChild
                      >
                        <Link to="/login">
                          Đăng nhập ngay
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-8 border-t border-white/25 pt-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/80">
                    Cấp bậc năng lực
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {levelPills.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-gray-200 bg-white py-8">
        <Reveal reduced={reduced}>
          <p className="mx-auto max-w-3xl px-4 text-center text-xs leading-relaxed text-gray-500 sm:px-6">
            © {new Date().getFullYear()} {appName}. Dự án hệ thống hóa quản trị nhân sự, đào tạo và
            hiệu suất nội bộ.
          </p>
        </Reveal>
      </footer>
    </div>
  )
}
