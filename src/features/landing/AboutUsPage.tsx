import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Award,
  BarChart3,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Cpu,
  Globe2,
  GraduationCap,
  Images,
  LayoutDashboard,
  LogIn,
  Quote,
  Repeat,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { defaultEntryPathFromSession } from '@/lib/routeGuards'
import { useAuthStore } from '@/stores/auth.store'

const appName = import.meta.env.VITE_APP_NAME ?? 'VCB HRM'

/* ────────────────────────────────────────────────────────────────────────
 *  Dữ liệu theo 6 ảnh Canva (giữ nguyên câu chữ gốc)
 * ────────────────────────────────────────────────────────────────────── */

const VISION = {
  icon: Target,
  title: 'TẦM NHÌN',
  lead: 'Trở thành doanh nghiệp tiên phong ứng dụng AI, công nghệ số và hệ sinh thái truyền thông internet để phát triển thương mại điện tử cho sản phẩm thủ công cao cấp.',
  subHeading: 'Trong 5 năm tới:',
  points: [
    'Phát triển các thương hiệu sản phẩm thủ công như trang sức, đồ da thủ công và các sản phẩm handmade tinh xảo ra toàn cầu',
    'Mở rộng hệ thống bán hàng tới 20+ quốc gia',
    'Trở thành nền tảng kết nối nghệ nhân Việt Nam với thị trường thế giới',
  ],
}

const MISSION = {
  icon: Sparkles,
  title: 'SỨ MỆNH',
  points: [
    'Kết nối giá trị thủ công truyền thống với thị trường toàn cầu thông qua công nghệ và thương mại điện tử',
    'Hỗ trợ nghệ nhân và nhà sản xuất phát triển thương hiệu và kênh phân phối quốc tế',
    'Mang đến cho khách hàng những sản phẩm có giá trị thẩm mỹ, văn hoá và tinh thần, không chỉ là sản phẩm tiêu dùng mà còn là những tác phẩm thủ công mang câu chuyện và bản sắc riêng',
  ],
  closing:
    'Viễn Chí Bảo tin rằng mỗi sản phẩm thủ công đều chứa đựng tinh thần của người làm ra nó, và nhiệm vụ của doanh nghiệp là giúp những giá trị đó được lan toả rộng rãi hơn.',
}

const ECOSYSTEM = [
  { label: 'NGHỆ NHÂN', desc: 'Những bàn tay tài hoa thổi hồn vào từng sản phẩm.' },
  { label: 'NHÀ SẢN XUẤT', desc: 'Hợp tác chiến lược để đảm bảo chất lượng & sản lượng.' },
  { label: 'XƯỞNG THỦ CÔNG', desc: 'Không gian chế tác chuyên nghiệp, chuẩn quốc tế.' },
] as const

/** Hai ảnh collage trong thẻ «NGHỆ NHÂN» — `public/Image_VCB/` */
const ARTISAN_BANNER = {
  precision: '/Image_VCB/artisan_banner_precision.png',
  leather: '/Image_VCB/artisan_banner_leather.png',
} as const

/** Trụ «THỦ CÔNG TRUYỀN THỐNG» — section Định vị chiến lược */
const STRATEGY_IMAGE_TRADITIONAL = '/Image_VCB/strategic_traditional_craft.png'

const STRATEGIC_PILLARS = [
  {
    label: 'THỦ CÔNG TRUYỀN THỐNG',
    desc: 'Tinh hoa nghề thủ công Việt Nam – trang sức, đồ da, mỹ nghệ.',
  },
  {
    label: 'CÔNG NGHỆ SỐ',
    desc: 'AI, dữ liệu thị trường và hệ thống sản xuất nội dung số tốc độ cao.',
  },
  {
    label: 'THỊ TRƯỜNG TOÀN CẦU',
    desc: 'Thương mại điện tử xuyên biên giới, hiện diện trên đa nền tảng.',
  },
] as const

const LEADERS = [
  {
    name: 'Bùi Đức Thiện',
    role: 'Chief Executive Officer',
    photo: '/Image_VCB/leader_01.png',
    bullets: [
      'Tốt nghiệp Thạc sĩ Tài chính – Đại học Nam Kinh.',
      'Định hướng chiến lược, phân bổ nguồn lực và điều hành tổng thể hoạt động doanh nghiệp.',
    ],
  },
  {
    name: 'Bùi Văn Huy',
    role: 'Product Director',
    photo: '/Image_VCB/leader_02.png',
    bullets: [
      'Nghệ nhân kim hoàn với hơn 10 năm kinh nghiệm.',
      'Phát triển sản phẩm, xây dựng thương hiệu và hệ thống nội dung trang sức của Viễn Chí Bảo.',
    ],
  },
  {
    name: 'Bùi Duy Cương',
    role: 'Technology Director',
    photo: '/Image_VCB/leader_03.png',
    bullets: [
      'Xây dựng hơn 300 kênh social media và ứng dụng AI trong quảng cáo và vận hành.',
      'Phụ trách công nghệ, marketing và hệ thống tự động hoá.',
    ],
  },
  {
    name: 'Phạm Ngọc Pha',
    role: 'Supply Chain Director',
    photo: '/Image_VCB/leader_04.png',
    bullets: [
      'Phát triển đội ngũ vận hành từ giai đoạn khởi đầu, phụ trách các hoạt động kinh doanh, livestream, thu mua, logistics và quản lý xưởng sản xuất.',
      'Chịu trách nhiệm vận hành kinh doanh và chuỗi cung ứng.',
    ],
  },
  {
    name: 'Nguyễn Nhật Linh',
    role: 'Integration Director',
    photo: '/Image_VCB/leader_05.png',
    bullets: [
      'Xây dựng hệ thống thương mại điện tử, traffic global và quy trình vận hành nội bộ.',
      'Phụ trách tăng trưởng tổng thể, SEO, hệ thống vận hành traffic global và văn hoá tổ chức.',
    ],
  },
] as const

/** Banner 6 màn hình kênh social — section Tổng quan công ty */
const OVERVIEW_SOCIAL_BANNER = '/Image_VCB/overview_social_collage.png'

const BRAND_PILLARS = [
  {
    icon: GraduationCap,
    text: 'Công nghệ AI và dữ liệu thị trường để phân tích xu hướng và tối ưu chiến lược phát triển sản phẩm',
  },
  {
    icon: Share2,
    text: 'Hệ sinh thái truyền thông đa nền tảng với hàng trăm kênh nội dung và tài khoản mạng xã hội',
  },
  {
    icon: Repeat,
    text: 'Mô hình xây dựng IP nhân hiệu và thương hiệu sản phẩm trên quy mô lớn',
  },
] as const

/* ────────────────────────────────────────────────────────────────────────
 *  Motion helpers
 * ────────────────────────────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────────────────────────────
 *  Image placeholder – khung trắng để user add ảnh sau
 * ────────────────────────────────────────────────────────────────────── */

function ImageFrame({
  aspect = 'aspect-[4/3]',
  label = 'Thêm ảnh',
  className,
  shape = 'rounded-2xl',
}: {
  aspect?: string
  label?: string
  className?: string
  shape?: string
}) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white shadow-sm',
        shape,
        aspect,
        className
      )}
    >
      {/* Pattern lưới nhẹ */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.25) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center text-slate-400">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
          <Images className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</p>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────
 *  Trang chính
 * ────────────────────────────────────────────────────────────────────── */

export function AboutUsPage() {
  const reduced = usePrefersReducedMotion()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthed = Boolean(user || accessToken)
  const dashboardPath = defaultEntryPathFromSession(user ?? undefined)

  const scrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    window.scrollTo(0, 0)
  }, [])

  return (
    <div
      ref={scrollRef}
      // html/body trong dự án đặt overflow:hidden (AppShell HRM quản lý scroll nội bộ),
      // nên landing page phải tự làm scroll container với h-screen + overflow-y-auto.
      className="relative h-screen overflow-x-hidden overflow-y-auto bg-white text-slate-900 scroll-smooth"
    >
      {/* Trang trí nền */}
      <div
        className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-indigo-200/35 blur-3xl motion-reduce:animate-none animate-[guest-landing-float-soft_14s_ease-in-out_infinite]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-48 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl motion-reduce:animate-none animate-[guest-landing-float-soft_18s_ease-in-out_infinite_2s]"
        aria-hidden
      />

      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-md',
          reduced
            ? 'opacity-100'
            : 'motion-reduce:animate-none animate-[guest-landing-fade-in_0.45s_ease-out_both]'
        )}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Award className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg sm:text-[1.125rem]">Viễn Chí Bảo</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
            <a href="#vision-mission" className="transition-colors hover:text-primary">
              Tầm nhìn &amp; Sứ mệnh
            </a>
            <a href="#ecosystem" className="transition-colors hover:text-primary">
              Hệ sinh thái
            </a>
            <a href="#introduction" className="transition-colors hover:text-primary">
              Giới thiệu
            </a>
            <a href="#strategy" className="transition-colors hover:text-primary">
              Định vị
            </a>
            <a href="#leadership" className="transition-colors hover:text-primary">
              Ban điều hành
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            {isAuthed ? (
              <Button size="sm" className="shadow-sm" asChild>
                <Link
                  to={dashboardPath}
                  {...(dashboardPath === '/hr-admin' ? { search: { page: 1, pageSize: 15 } } : {})}
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  Vào hệ thống
                </Link>
              </Button>
            ) : (
              <Button size="sm" className="shadow-sm" asChild>
                <Link to="/login">
                  <LogIn className="h-4 w-4" aria-hidden />
                  Đăng nhập {appName}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ─────────── HERO: full viewport, tagline + ảnh tập thể ─────────── */}
        <section
          id="hero"
          className="relative z-10 flex min-h-[calc(100vh-64px)] flex-col justify-center overflow-hidden"
        >
          <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
            <div
              className={cn(
                'flex flex-col items-center text-center',
                reduced
                  ? 'opacity-100'
                  : 'motion-reduce:animate-none animate-[guest-landing-hero-in_0.8s_ease-out_both]'
              )}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-800 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Hồ sơ công ty Viễn Chí Bảo
              </span>
              <h1 className="mt-5 flex flex-col items-center gap-2 text-balance text-center text-4xl font-extrabold tracking-tight text-slate-900 sm:gap-3 sm:text-6xl lg:text-7xl">
                <span className="block max-w-[22ch] leading-[1.22] sm:leading-[1.18]">
                  Kết nối tinh hoa <span className="text-primary">thủ công Việt</span>
                </span>
                <span className="block max-w-[20ch] leading-[1.22] sm:leading-[1.18]">
                  với thị trường{' '}
                  <span className="inline-block rounded-md bg-amber-200/75 px-2 py-0.5 text-orange-600 shadow-none">
                    toàn cầu
                  </span>
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg lg:text-xl">
                10+ năm phát triển thương hiệu thủ công trên thị trường toàn cầu – kết hợp công nghệ
                tiên tiến nhất với những ngành nghề thủ công truyền thống nhất.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="shadow-md" asChild>
                  <a href="#vision-mission">
                    Khám phá câu chuyện
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </a>
                </Button>
                {isAuthed ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/80 backdrop-blur-sm"
                    asChild
                  >
                    <Link
                      to={dashboardPath}
                      {...(dashboardPath === '/hr-admin'
                        ? { search: { page: 1, pageSize: 15 } }
                        : {})}
                    >
                      <LayoutDashboard className="h-4 w-4" aria-hidden />
                      Vào hệ thống
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/80 backdrop-blur-sm"
                    asChild
                  >
                    <Link to="/login">
                      <LogIn className="h-4 w-4" aria-hidden />
                      Đăng nhập {appName}
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Team photo — hiển thị nguyên khung ảnh (không crop) */}
            <Reveal reduced={reduced} className="mt-12 sm:mt-16">
              <div className="relative">
                <div
                  className="pointer-events-none absolute -inset-2 -z-10 rounded-[28px] bg-gradient-to-br from-primary/20 via-amber-200/30 to-indigo-200/20 blur-xl"
                  aria-hidden
                />
                <img
                  src="/Image_VCB/team_building.png"
                  alt="Đội ngũ Viễn Chí Bảo — Sơ kết và team building"
                  className="relative z-0 mx-auto block h-auto w-full max-w-full rounded-3xl shadow-xl ring-1 ring-slate-200"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </Reveal>
          </div>

          {/* Mũi tên cuộn xuống */}
          <a
            href="#vision-mission"
            className={cn(
              'absolute bottom-5 left-1/2 -translate-x-1/2 text-slate-400 transition-colors hover:text-primary',
              reduced
                ? 'opacity-100'
                : 'motion-reduce:animate-none animate-[about-scroll-bounce_1.8s_ease-in-out_infinite]'
            )}
            aria-label="Cuộn xuống"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm">
              <ChevronDown className="h-5 w-5" aria-hidden />
            </span>
          </a>
        </section>

        {/* ─────────── SECTION 1: TẦM NHÌN & SỨ MỆNH (ảnh 1) ─────────── */}
        <section
          id="vision-mission"
          className="relative z-10 scroll-mt-20 border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-white py-20 sm:py-28 lg:py-32"
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
            <Reveal reduced={reduced}>
              <div className="mx-auto max-w-2xl text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                  <Target className="h-3.5 w-3.5" aria-hidden />
                  Định hướng phát triển
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                  Tầm nhìn &amp; Sứ mệnh
                </h2>
                <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
                  Hai trụ cột định hình mọi quyết định và sản phẩm của Viễn Chí Bảo trên hành trình
                  vươn ra thế giới.
                </p>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-8">
              <Reveal reduced={reduced}>
                <article className="relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-10">
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/20" />
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/20">
                    <VISION.icon className="h-8 w-8" aria-hidden />
                  </div>
                  <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    {VISION.title}
                  </h3>
                  <p className="mt-5 text-base leading-relaxed text-slate-700 sm:text-lg">
                    {VISION.lead}
                  </p>
                  <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary">
                    {VISION.subHeading}
                  </p>
                  <ul className="mt-3 space-y-3">
                    {VISION.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-start gap-3 text-[15px] leading-relaxed text-slate-700"
                      >
                        <span
                          className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>

              <Reveal reduced={reduced} delayMs={150}>
                <article className="relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-10">
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300/40" />
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-600 ring-1 ring-amber-500/20">
                    <MISSION.icon className="h-8 w-8" aria-hidden />
                  </div>
                  <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    {MISSION.title}
                  </h3>
                  <ul className="mt-5 space-y-3">
                    {MISSION.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-start gap-3 text-[15px] leading-relaxed text-slate-700"
                      >
                        <span
                          className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500"
                          aria-hidden
                        />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 rounded-2xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4">
                    <p className="text-[15px] italic leading-relaxed text-slate-700">
                      {MISSION.closing}
                    </p>
                  </div>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ─────────── SECTION 2: HỆ SINH THÁI NGHỆ NHÂN (ảnh 2) ─────────── */}
        <section id="ecosystem" className="relative z-10 scroll-mt-20 bg-white">
          {/* Không dùng margin âm kéo ảnh lên — tránh đè tiêu đề; navy chỉ phủ nửa dưới */}
          <div className="relative isolate overflow-hidden pb-20 sm:pb-28">
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 top-[46%] min-h-[260px] bg-[#1b3568] sm:min-h-[300px]"
              aria-hidden
            />

            <div className="relative z-10 mx-auto max-w-[1400px] px-4 pt-24 sm:px-6 sm:pt-28">
              <Reveal reduced={reduced}>
                <div className="text-center">
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    HỆ SINH THÁI NGHỆ NHÂN
                  </h2>
                  <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-primary" />
                </div>
              </Reveal>

              <ul className="mt-14 grid items-start gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
                {ECOSYSTEM.map((item, i) => (
                  <Reveal key={item.label} reduced={reduced} delayMs={i * 120}>
                    <li className="group mx-auto flex w-full max-w-[320px] flex-col items-center">
                      {item.label === 'NGHỆ NHÂN' ? (
                        <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-lg ring-4 ring-white transition-transform duration-500 group-hover:-translate-y-1">
                          <div className="grid h-full w-full grid-rows-2 gap-px bg-white/90">
                            <img
                              src={ARTISAN_BANNER.precision}
                              alt="Nghệ nhân Viễn Chí Bảo — kim hoàn và độ chính xác"
                              className="h-full w-full object-cover object-center"
                              loading="lazy"
                              decoding="async"
                            />
                            <img
                              src={ARTISAN_BANNER.leather}
                              alt="Nghệ nhân Viễn Chí Bảo — đồ da và thủ công"
                              className="h-full w-full object-cover object-center"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        </div>
                      ) : (
                        <ImageFrame
                          aspect="aspect-[3/4]"
                          label={item.label}
                          shape="rounded-2xl"
                          className="w-full shadow-lg ring-4 ring-white transition-transform duration-500 group-hover:-translate-y-1"
                        />
                      )}
                      {/* Đường nối đứng */}
                      <div className="relative flex h-10 w-10 flex-col items-center">
                        <span className="block h-full w-px bg-white/60" aria-hidden />
                        <span
                          className="absolute bottom-0 block h-3 w-3 rounded-full bg-white ring-4 ring-white/30"
                          aria-hidden
                        />
                      </div>
                      <h3 className="mt-3 text-center text-base font-extrabold tracking-[0.12em] text-white sm:text-lg">
                        {item.label}
                      </h3>
                      <p className="mt-1.5 max-w-[280px] text-center text-sm text-white/80">
                        {item.desc}
                      </p>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─────────── SECTION 3: GIỚI THIỆU VIỄN CHÍ BẢO (ảnh 3) ─────────── */}
        <section
          id="introduction"
          className="relative z-10 scroll-mt-20 bg-gradient-to-b from-white to-slate-50/60 py-20 sm:py-28 lg:py-32"
        >
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
            <Reveal reduced={reduced}>
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
                <div
                  className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -right-16 -bottom-16 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl"
                  aria-hidden
                />

                <div className="relative">
                  <div className="text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                      GIỚI THIỆU VIỄN CHÍ BẢO
                    </h2>
                    <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-primary" />
                  </div>

                  <div className="mx-auto mt-8 max-w-[900px] space-y-5 text-[15px] leading-[1.85] text-slate-700 sm:text-[16px]">
                    <p>
                      Viễn Chí Bảo là{' '}
                      <strong className="text-slate-900">
                        “Công ty công nghệ và truyền thông số”
                      </strong>
                      : tập trung xây dựng các thương hiệu toàn cầu dựa trên{' '}
                      <strong className="text-slate-900">AI, dữ liệu thị trường</strong> và{' '}
                      <strong className="text-slate-900">
                        hệ sinh thái truyền thông đa nền tảng
                      </strong>
                      .
                    </p>
                    <p>
                      Chúng tôi lựa chọn một hướng đi khác biệt:{' '}
                      <strong className="text-slate-900">
                        kết hợp công nghệ tiên tiến nhất với những ngành nghề thủ công truyền thống
                        nhất
                      </strong>
                      . Thay vì mở rộng sang nhiều lĩnh vực, Viễn Chí Bảo tập trung vào các ngành
                      hàng mà Việt Nam có lợi thế cạnh tranh tự nhiên và văn hoá, bao gồm{' '}
                      <strong className="text-slate-900">
                        trang sức, đồ da thủ công và các sản phẩm thủ công mỹ nghệ
                      </strong>
                      . Đây là những sản phẩm không chỉ có giá trị vật chất mà còn chứa đựng{' '}
                      <strong className="text-slate-900">
                        bản sắc văn hoá, tay nghề thủ công và câu chuyện con người
                      </strong>{' '}
                      phía sau mỗi sản phẩm.
                    </p>
                    <p>
                      Điểm khác biệt của Viễn Chí Bảo nằm ở việc{' '}
                      <strong className="text-slate-900">ứng dụng công nghệ và AI</strong> để tái
                      cấu trúc cách các sản phẩm thủ công được xây dựng thương hiệu và phân phối ra
                      toàn cầu. Chúng tôi tin rằng việc{' '}
                      <strong className="text-slate-900">
                        kết hợp công nghệ tiên tiến nhất với các ngành nghề thủ công truyền thống
                      </strong>{' '}
                      không chỉ mở ra một hướng đi độc đáo trên thị trường, mà còn tạo ra lợi thế
                      cạnh tranh khác biệt so với cả các công ty công nghệ thuần tuý lẫn các doanh
                      nghiệp thủ công truyền thống. Công nghệ giúp nâng cao khả năng tiếp cận thị
                      trường, trong khi giá trị văn hoá và tay nghề thủ công tạo nên chiều sâu và sự
                      khác biệt cho sản phẩm.
                    </p>
                    <p>
                      Chúng tôi sở hữu một đội ngũ nhân sự trẻ trung, sáng tạo, nhanh nhẹn về{' '}
                      <strong className="text-slate-900">truyền thông hình ảnh</strong>. Đội ngũ này
                      kết hợp với{' '}
                      <strong className="text-slate-900">
                        AI và các công cụ công nghệ truyền thông số
                      </strong>{' '}
                      để xây dựng hệ thống phát triển IP nhân hiệu và thương hiệu sản phẩm trên quy
                      mô lớn.
                    </p>
                    <p>
                      Thông qua việc{' '}
                      <strong className="text-slate-900">
                        phân tích dữ liệu thị trường và các xu hướng nội dung theo thời gian thực
                      </strong>
                      , Viễn Chí Bảo có khả năng nhanh chóng nắm bắt các xu hướng mới và chuyển hoá
                      chúng thành các chiến dịch nội dung hiệu quả. Nhờ các quy trình sản xuất nội
                      dung được tối ưu bằng công nghệ và AI, chúng tôi có thể vận hành{' '}
                      <strong className="text-slate-900">
                        hệ thống sản xuất nội dung với tốc độ cao
                      </strong>
                      , giúp các IP và thương hiệu phát triển nhanh chóng trên các nền tảng mạng xã
                      hội. Các IP được xây dựng như những{' '}
                      <strong className="text-slate-900">thực thể truyền thông độc lập</strong>,
                      xuất hiện đồng thời trên nhiều nền tảng và thị trường khác nhau. Hệ sinh thái
                      truyền thông của chúng tôi bao gồm{' '}
                      <strong className="text-slate-900">
                        hàng trăm kênh và tài khoản mạng xã hội tại Việt Nam và đang lan ra các quốc
                        gia
                      </strong>
                      , tạo thành một mạng lưới phân phối nội dung và thương hiệu có khả năng mở
                      rộng mạnh mẽ.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─────────── SECTION 4: ĐỊNH VỊ CHIẾN LƯỢC (ảnh 4) ─────────── */}
        <section id="strategy" className="relative z-10 scroll-mt-20 bg-white">
          <div className="relative isolate overflow-hidden pb-20 sm:pb-28">
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 top-[46%] min-h-[260px] bg-[#1b3568] sm:min-h-[300px]"
              aria-hidden
            />

            <div className="relative z-10 mx-auto max-w-[1400px] px-4 pt-24 sm:px-6 sm:pt-28">
              <Reveal reduced={reduced}>
                <div className="text-center">
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    ĐỊNH VỊ CHIẾN LƯỢC
                  </h2>
                  <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-primary" />
                </div>
              </Reveal>

              <Reveal reduced={reduced} delayMs={100}>
                <div className="relative z-20 mx-auto mt-10 max-w-3xl">
                  <div className="relative rounded-xl border-2 border-primary/60 bg-white px-6 py-6 pt-12 text-center text-[15px] leading-relaxed text-slate-700 shadow-sm sm:px-8 sm:py-7 sm:pt-10 sm:text-base">
                    <Quote
                      className="absolute left-4 top-4 h-6 w-6 text-primary sm:left-5 sm:top-5"
                      aria-hidden
                    />
                    Là một{' '}
                    <strong className="text-slate-900">
                      nền tảng thương mại điện tử và truyền thông
                    </strong>{' '}
                    cho sản phẩm thủ công cao cấp, hoạt động tại{' '}
                    <strong className="text-slate-900">giao điểm của ba lĩnh vực</strong>.
                  </div>
                </div>
              </Reveal>

              <ul className="relative z-10 mt-14 grid items-start gap-8 sm:grid-cols-3 lg:gap-10">
                {STRATEGIC_PILLARS.map((p, i) => (
                  <Reveal key={p.label} reduced={reduced} delayMs={i * 120}>
                    <li className="group mx-auto flex w-full max-w-[320px] flex-col items-center">
                      {p.label === 'THỦ CÔNG TRUYỀN THỐNG' ? (
                        <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-lg ring-4 ring-white transition-transform duration-500 group-hover:-translate-y-1">
                          <img
                            src={STRATEGY_IMAGE_TRADITIONAL}
                            alt="Nghệ nhân thủ công truyền thống Viễn Chí Bảo tại xưởng"
                            className="h-full w-full object-cover object-center"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ) : (
                        <ImageFrame
                          aspect="aspect-[3/4]"
                          label={p.label}
                          shape="rounded-2xl"
                          className="w-full shadow-lg ring-4 ring-white transition-transform duration-500 group-hover:-translate-y-1"
                        />
                      )}
                      <div className="relative flex h-10 w-10 flex-col items-center">
                        <span className="block h-full w-px bg-white/60" aria-hidden />
                        <span
                          className="absolute bottom-0 block h-3 w-3 rounded-full bg-white ring-4 ring-white/30"
                          aria-hidden
                        />
                      </div>
                      <h3 className="mt-3 text-center text-base font-extrabold tracking-[0.12em] text-white sm:text-lg">
                        {p.label}
                      </h3>
                      <p className="mt-1.5 max-w-[280px] text-center text-sm text-white/80">
                        {p.desc}
                      </p>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─────────── SECTION 5: BAN ĐIỀU HÀNH CÔNG TY (ảnh 5) ─────────── */}
        <section
          id="leadership"
          className="relative z-10 scroll-mt-20 bg-[#1b3568] py-20 sm:py-28 lg:py-32"
        >
          {/* Pattern trang trí */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.6) 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6">
            <Reveal reduced={reduced}>
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
                  <Briefcase className="h-3.5 w-3.5" aria-hidden />
                  Đội ngũ dẫn dắt
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  BAN ĐIỀU HÀNH CÔNG TY
                </h2>
                <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-white/70" />
              </div>
            </Reveal>

            <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
              {LEADERS.map((person, i) => (
                <Reveal key={person.name} reduced={reduced} delayMs={i * 90}>
                  <li className="flex h-full flex-col items-center">
                    {/* Avatar tròn */}
                    <div className="relative shrink-0">
                      <div
                        className="absolute inset-0 rounded-full bg-white/10 blur-xl"
                        aria-hidden
                      />
                      <div className="relative h-40 w-40 overflow-hidden rounded-full ring-4 ring-white/30 sm:h-44 sm:w-44">
                        <img
                          src={person.photo}
                          alt={`Chân dung ${person.name} — ${person.role}`}
                          className="h-full w-full object-cover object-top"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-lg font-extrabold text-white">{person.name}</h3>
                      <p className="mt-0.5 text-sm italic text-white/70">{person.role}</p>
                    </div>
                    <ul className="mt-4 w-full space-y-2">
                      {person.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-start gap-2 text-left text-[13px] leading-relaxed text-white/85"
                        >
                          <span
                            className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300"
                            aria-hidden
                          />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ─────────── SECTION 6: TỔNG QUAN CÔNG TY (ảnh 6) ─────────── */}
        <section id="overview" className="relative z-10 scroll-mt-20 py-20 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
            <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
              {/* Cột trái: ảnh grid + stat */}
              <div className="space-y-6">
                <Reveal reduced={reduced}>
                  <div className="relative">
                    {/* Khung đỏ decor ôm khối ảnh – gợi lại style Canva */}
                    <div
                      className="absolute -inset-3 rounded-2xl border-[3px] border-red-500/80"
                      aria-hidden
                    />
                    <div className="relative overflow-hidden rounded-xl bg-white p-2 shadow-md ring-1 ring-slate-200/90">
                      <img
                        src={OVERVIEW_SOCIAL_BANNER}
                        alt="Hệ sinh thái kênh TikTok và YouTube Viễn Chí Bảo — đa dạng gương mặt và nội dung kim hoàn"
                        className="block h-auto w-full rounded-lg"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </div>
                </Reveal>

                <Reveal reduced={reduced} delayMs={120}>
                  <div className="flex flex-wrap items-end gap-3">
                    <span className="text-6xl font-black leading-none text-red-600 sm:text-7xl">
                      &gt;10.000
                    </span>
                    <div className="mb-1 flex flex-col text-sm font-extrabold uppercase tracking-[0.15em] text-slate-700">
                      <span className="text-red-600">VIDEO PUBLISHED</span>
                      <span>/MONTH</span>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Hồ sơ công ty
                    </p>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                      TỔNG QUAN CÔNG TY
                    </h2>
                    <div className="h-1 w-16 rounded-full bg-red-500" />
                  </div>
                  <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-600">
                    Viễn Chí Bảo là doanh nghiệp với{' '}
                    <strong className="text-slate-900">10+ năm hoạt động</strong>, chuyển mình từ
                    công ty thương mại điện tử truyền thống thành{' '}
                    <strong className="text-slate-900">công ty công nghệ và truyền thông số</strong>
                    .
                  </p>
                </Reveal>
              </div>

              {/* Cột phải: 3 nguyên tắc thương hiệu */}
              <div className="space-y-5">
                <Reveal reduced={reduced}>
                  <p className="text-[15px] leading-relaxed text-slate-600">
                    Công ty tập trung xây dựng thương hiệu toàn cầu dựa trên{' '}
                    <strong className="text-slate-900">ba nền tảng chính</strong>:
                  </p>
                </Reveal>

                <ul className="space-y-4">
                  {BRAND_PILLARS.map((p, i) => (
                    <Reveal key={p.text} reduced={reduced} delayMs={i * 110}>
                      <li
                        className={cn(
                          'group flex items-start gap-4 rounded-2xl border border-slate-200 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
                          i === 0 && 'bg-[#1b3568] text-white',
                          i === 1 && 'bg-slate-100',
                          i === 2 && 'bg-[#1b3568] text-white'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                            i === 1
                              ? 'bg-white text-slate-700 ring-1 ring-slate-200'
                              : 'bg-white/15 text-white ring-1 ring-white/30'
                          )}
                        >
                          <p.icon className="h-5 w-5" aria-hidden />
                        </span>
                        <p
                          className={cn(
                            'text-[14.5px] font-semibold leading-relaxed',
                            i === 1 ? 'text-slate-800' : 'text-white'
                          )}
                        >
                          {p.text}
                        </p>
                      </li>
                    </Reveal>
                  ))}
                </ul>

                <Reveal reduced={reduced} delayMs={400}>
                  <p className="text-[15px] leading-relaxed text-slate-600">
                    Viễn Chí Bảo lựa chọn hướng đi khác biệt khi kết hợp{' '}
                    <strong className="text-slate-900">
                      công nghệ hiện đại với các ngành nghề thủ công truyền thống
                    </strong>
                    , tập trung vào các lĩnh vực mà Việt Nam có lợi thế như{' '}
                    <strong className="text-slate-900">
                      trang sức, đồ da thủ công và sản phẩm thủ công mỹ nghệ
                    </strong>
                    .
                  </p>
                </Reveal>
              </div>
            </div>

            {/* Stats row */}
            <Reveal reduced={reduced} delayMs={200}>
              <div className="mt-14 grid gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 sm:grid-cols-4 sm:p-8">
                {[
                  { icon: TrendingUp, label: '10+', desc: 'Năm phát triển' },
                  { icon: Globe2, label: '20+', desc: 'Quốc gia mục tiêu' },
                  { icon: Video, label: '300+', desc: 'Kênh social media' },
                  { icon: Cpu, label: 'AI-first', desc: 'Vận hành công nghệ' },
                ].map((s, i) => (
                  <div
                    key={s.desc}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors',
                      i !== 3 && 'sm:border-r sm:border-slate-200/80'
                    )}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <s.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xl font-extrabold tracking-tight text-slate-900">
                        {s.label}
                      </p>
                      <p className="text-xs font-medium text-slate-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA cuối */}
        <section className="relative z-10 pb-16 sm:pb-20">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
            <Reveal reduced={reduced}>
              <div className="overflow-hidden rounded-3xl vcb-banner-gradient px-6 py-10 text-white shadow-lg sm:px-10 sm:py-12">
                <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                  <div className="max-w-2xl space-y-3">
                    <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                      Đồng hành cùng Viễn Chí Bảo
                    </h2>
                    <p className="text-[15px] leading-relaxed text-white/90 sm:text-base">
                      Kết nối thủ công Việt Nam với thế giới – bằng công nghệ, dữ liệu và một hệ
                      sinh thái truyền thông rộng lớn.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {isAuthed ? (
                      <Button
                        size="lg"
                        className="border-0 bg-white font-semibold text-primary shadow-md hover:bg-slate-50"
                        asChild
                      >
                        <Link
                          to={dashboardPath}
                          {...(dashboardPath === '/hr-admin'
                            ? { search: { page: 1, pageSize: 15 } }
                            : {})}
                        >
                          <LayoutDashboard className="h-4 w-4" aria-hidden />
                          Vào hệ thống {appName}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="border-0 bg-white font-semibold text-primary shadow-md hover:bg-slate-50"
                        asChild
                      >
                        <Link to="/login">
                          Truy cập {appName}
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/40 bg-white/10 font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                      asChild
                    >
                      <a href="#vision-mission">
                        <BarChart3 className="h-4 w-4" aria-hidden />
                        Xem hồ sơ công ty
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-4 text-center text-xs leading-relaxed text-slate-500 sm:flex-row sm:px-6 sm:text-left">
          <p>© {new Date().getFullYear()} Công ty Viễn Chí Bảo. Mọi quyền được bảo lưu.</p>
          <div className="flex items-center gap-5">
            <a href="#introduction" className="font-medium text-primary hover:underline">
              Giới thiệu
            </a>
            <a href="#leadership" className="font-medium text-primary hover:underline">
              Ban điều hành
            </a>
            <Link to="/" className="font-medium text-primary hover:underline">
              ← Trang chủ {appName}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
