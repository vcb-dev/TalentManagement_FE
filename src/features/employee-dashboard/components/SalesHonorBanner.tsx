import { useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, X, Users, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { performanceApi, type SalesHonorBoardResponse } from '@/features/kpi-okr/api'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'salesHonorBanner_dismissed'
const SLIDE_INTERVAL_MS = 3500

function currentYearMonth(): { year: number; month: number; key: string } {
  const d = new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}` }
}

function formatNumber(value: number, unit: string): string {
  const isVnd = unit.toUpperCase() === 'VND'
  const formatted = isVnd
    ? new Intl.NumberFormat('vi-VN').format(Math.round(value))
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
  return `${formatted} ${unit}`
}

type Slide = {
  kind: 'team' | 'individual'
  category: 'revenue' | 'orders' | 'traffic' | 'other'
  title: string
  name: string
  value: string
}

const SLIDE_BG: Record<number, string> = {
  0: 'from-amber-500 to-orange-400',
  1: 'from-rose-500 to-pink-400',
  2: 'from-violet-500 to-indigo-400',
  3: 'from-emerald-500 to-teal-400',
}

export function SalesHonorBanner() {
  const { year, month, key: monthKey } = useMemo(currentYearMonth, [])
  const [data, setData] = useState<SalesHonorBoardResponse | null>(null)
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(DISMISS_KEY) === monthKey
  })
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [animDir, setAnimDir] = useState<'left' | 'right'>('left')
  const [transitioning, setTransitioning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (dismissed) return
    let alive = true
    performanceApi
      .getSalesHonorBoard(year, month)
      .then((res) => {
        if (alive) setData(res)
      })
      .catch(() => {
        if (alive) setData(null)
      })
    return () => {
      alive = false
    }
  }, [year, month, dismissed])

  const slides = useMemo<Slide[]>(() => {
    if (!data) return []
    const result: Slide[] = []
    if (data.topTeamRevenue) {
      result.push({
        kind: 'team',
        category: 'revenue',
        title: 'Team · Doanh thu cao nhất',
        name: data.topTeamRevenue.team.name,
        value: formatNumber(
          data.topTeamRevenue.totalValue,
          data.topTeamRevenue.numericUnit || 'VND'
        ),
      })
    }
    if (data.topTeamOrders) {
      result.push({
        kind: 'team',
        category: 'orders',
        title: 'Team · Số đơn cao nhất',
        name: data.topTeamOrders.team.name,
        value: formatNumber(data.topTeamOrders.totalValue, data.topTeamOrders.numericUnit || 'đơn'),
      })
    }
    if (data.topIndividualRevenue) {
      result.push({
        kind: 'individual',
        category: 'revenue',
        title: 'Cá nhân · Doanh thu cao nhất',
        name: data.topIndividualRevenue.user.displayName ?? '—',
        value: formatNumber(
          data.topIndividualRevenue.numericValue,
          data.topIndividualRevenue.numericUnit || 'VND'
        ),
      })
    }
    if (data.topIndividualOrders) {
      result.push({
        kind: 'individual',
        category: 'orders',
        title: 'Cá nhân · Số đơn cao nhất',
        name: data.topIndividualOrders.user.displayName ?? '—',
        value: formatNumber(
          data.topIndividualOrders.numericValue,
          data.topIndividualOrders.numericUnit || 'đơn'
        ),
      })
    }
    return result
  }, [data])

  const goTo = (idx: number, dir: 'left' | 'right') => {
    if (transitioning || idx === active) return
    setAnimDir(dir)
    setTransitioning(true)
    setTimeout(() => {
      setActive(idx)
      setTransitioning(false)
    }, 280)
  }

  const prev = () => {
    const idx = (active - 1 + slides.length) % slides.length
    goTo(idx, 'right')
  }
  const next = () => {
    const idx = (active + 1) % slides.length
    goTo(idx, 'left')
  }

  useEffect(() => {
    if (paused || slides.length <= 1) return
    timerRef.current = setInterval(() => {
      setAnimDir('left')
      setTransitioning(true)
      setTimeout(() => {
        setActive((a) => (a + 1) % slides.length)
        setTransitioning(false)
      }, 280)
    }, SLIDE_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, slides.length, active])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, monthKey)
    }
    setDismissed(true)
  }

  if (dismissed || !data || slides.length === 0) return null

  const slide = slides[active]
  const bg = SLIDE_BG[active % Object.keys(SLIDE_BG).length]

  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl select-none', 'shadow-md')}
      role="region"
      aria-label="Vinh danh Phòng Kinh doanh tháng"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide */}
      <div
        className={cn(
          'relative bg-gradient-to-r transition-all duration-300',
          bg,
          transitioning && animDir === 'left' && '-translate-x-4 opacity-0',
          transitioning && animDir === 'right' && 'translate-x-4 opacity-0',
          !transitioning && 'translate-x-0 opacity-100'
        )}
      >
        {/* Decorative circles */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
          aria-hidden
        />

        <div className="relative flex items-center gap-4 px-5 py-4 md:px-6 md:py-5">
          {/* Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm md:h-14 md:w-14">
            {slide.kind === 'team' ? (
              <Users className="h-6 w-6 text-white md:h-7 md:w-7" aria-hidden />
            ) : (
              <Star className="h-6 w-6 text-white md:h-7 md:w-7" aria-hidden />
            )}
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-yellow-200" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                Vinh danh · Tháng {month}/{year}
              </p>
            </div>
            <p className="mt-0.5 text-xs font-medium text-white/70">{slide.title}</p>
            <p className="mt-1 truncate text-lg font-extrabold leading-tight text-white md:text-xl">
              {slide.name}
            </p>
            <p className="mt-0.5 text-sm font-bold text-yellow-200 drop-shadow">{slide.value}</p>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-3 top-3 rounded-full p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label="Đóng banner vinh danh"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Navigation arrows — only if >1 slides */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className={cn(
              'absolute left-1 top-1/2 -translate-y-1/2 rounded-full p-1',
              'bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40'
            )}
            aria-label="Slide trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className={cn(
              'absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1',
              'bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40'
            )}
            aria-label="Slide tiếp"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className={cn('absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5')}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i, i > active ? 'left' : 'right')}
              aria-label={`Chuyển sang slide ${i + 1}`}
              className={cn(
                'rounded-full transition-all duration-300',
                i === active ? 'h-2 w-5 bg-white' : 'h-2 w-2 bg-white/50 hover:bg-white/80'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
