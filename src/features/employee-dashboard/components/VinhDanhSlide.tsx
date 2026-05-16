import { useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, ChevronLeft, ChevronRight, Star, Users } from 'lucide-react'
import { performanceApi, type VinhDanhHonorBoardResponse } from '@/features/kpi-okr/api'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { cn } from '@/lib/utils'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'

// ─── Helpers ────────────────────────────────────────────────────────────────

function currentYearMonth() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function guessDepartment(teamName: string | null): string | null {
  if (!teamName) return null
  const t = teamName.toLowerCase()
  if (t.includes('kinh doanh') || t.includes('kd') || t.includes('sales')) return 'Phòng Kinh doanh'
  if (t.includes('traffic') || t.includes('huyk') || t.includes('global') || t.includes('đvkd'))
    return 'Marketing Traffic'
  if (t.includes('vận đơn') || t.includes('van don')) return 'Phòng Vận đơn'
  if (t.includes('livestream') || t.includes('live')) return 'Phòng Livestream'
  return null
}

// ─── Types ─────────────────────────────────────────────────────────────────

type HonorSlide = {
  id: string
  displayName: string
  avatarUrl: string | null
  teamName: string | null
  departmentName: string | null
  metricLabel: string
  valueLabel: string
  roleLabel: string
  stars: number
}

// ─── Constants ─────────────────────────────────────────────────────────────

const SLIDE_INTERVAL = 4000

const GRADIENT_BG = [
  'from-amber-500/90 via-orange-400/80 to-yellow-500/90',
  'from-rose-500/90 via-pink-400/80 to-red-400/90',
  'from-violet-500/90 via-purple-400/80 to-indigo-500/90',
  'from-emerald-500/90 via-teal-400/80 to-cyan-500/90',
  'from-sky-500/90 via-blue-400/80 to-indigo-500/90',
]

// ─── Component ──────────────────────────────────────────────────────────────

export function VinhDanhSlide({ className }: { className?: string }) {
  const { year, month } = useMemo(currentYearMonth, [])
  const [data, setData] = useState<VinhDanhHonorBoardResponse | null>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    performanceApi
      .getVinhDanhHonorBoard(year, month)
      .then(setData)
      .catch(() => setData(null))
  }, [year, month])

  // Chuyển entries → danh sách slides: mỗi entry tạo slide cá nhân + slide team (nếu có)
  const slides = useMemo<HonorSlide[]>(() => {
    if (!data?.entries.length) return []
    const result: HonorSlide[] = []

    for (const entry of data.entries) {
      // Slide cá nhân
      if (entry.topIndividual) {
        const ind = entry.topIndividual
        result.push({
          id: ind.user.id,
          displayName: ind.user.displayName ?? '—',
          avatarUrl: ind.user.avatarUrl,
          teamName: ind.teamName,
          departmentName: guessDepartment(ind.teamName),
          metricLabel: entry.content,
          valueLabel: `${ind.numericValue.toLocaleString('vi-VN')} ${ind.numericUnit}`,
          roleLabel: 'Biết việc',
          stars: 4,
        })
      }
      // Slide team
      if (entry.topTeam) {
        const team = entry.topTeam
        result.push({
          id: `team-${team.team.id}-${entry.content}`,
          displayName: `Team ${team.team.name}`,
          avatarUrl: null,
          teamName: team.team.name,
          departmentName: guessDepartment(team.team.name),
          metricLabel: `Team · ${entry.content}`,
          valueLabel: `${team.totalValue.toLocaleString('vi-VN')} ${team.numericUnit} (${team.memberCount} thành viên)`,
          roleLabel: 'Team',
          stars: 5,
        })
      }
    }

    return result
  }, [data])

  // Auto-slide
  useEffect(() => {
    if (paused || slides.length <= 1) return
    timerRef.current = setInterval(() => {
      setActive((a) => (a + 1) % slides.length)
    }, SLIDE_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, slides.length])

  if (!slides.length) return null

  const slide = slides[active]
  const bg = GRADIENT_BG[active % GRADIENT_BG.length]

  return (
    <section
      className={cn('relative overflow-hidden rounded-2xl shadow-lg', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Vinh danh nhân sự xuất sắc"
    >
      <div className={cn('bg-gradient-to-br p-6 transition-colors duration-500', bg)}>
        {/* Nút điều hướng */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActive((a) => (a - 1 + slides.length) % slides.length)}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
              aria-label="Người trước"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setActive((a) => (a + 1) % slides.length)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
              aria-label="Người sau"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Nội dung slide */}
        <div className="flex items-center gap-5">
          {/* Avatar / icon team */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            {slide.roleLabel === 'Team' ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
                <Users className="h-10 w-10 text-white" aria-hidden />
              </div>
            ) : (
              <div className="relative flex h-28 w-28 items-center justify-center">
                <div
                  className="pointer-events-none absolute inset-3 rounded-full bg-white/30 blur-md"
                  aria-hidden
                />
                <EmployeeAvatar
                  name={slide.displayName}
                  photoUrl={slide.avatarUrl ? resolvePublicAssetUrl(slide.avatarUrl) : undefined}
                  className="relative z-10 h-20 w-20 text-xl shadow-lg"
                />
                <img
                  src="/khung_avatar/khung_avatar_tuong.png"
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain"
                />
              </div>
            )}

            {slide.roleLabel !== 'Team' && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: slide.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-300 text-yellow-300 drop-shadow" />
                ))}
              </div>
            )}

            <span className="whitespace-nowrap rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
              {slide.roleLabel}
            </span>
          </div>

          {/* Info bên phải */}
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-lg font-extrabold text-white drop-shadow-md">
              {slide.displayName}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {slide.departmentName && (
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.65rem] font-medium text-white/80 backdrop-blur-sm">
                  {slide.departmentName}
                </span>
              )}
              {slide.teamName && (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.65rem] text-white/60 backdrop-blur-sm">
                  {slide.teamName}
                </span>
              )}
            </div>

            <div className="mt-2.5 flex items-center gap-1.5">
              {slide.roleLabel === 'Team' ? (
                <Users className="h-3.5 w-3.5 text-yellow-200/70" aria-hidden />
              ) : (
                <Trophy className="h-3.5 w-3.5 text-yellow-200/70" aria-hidden />
              )}
              <span className="text-xs font-medium text-white/70">{slide.metricLabel}</span>
            </div>

            <p className="mt-1 text-xl font-extrabold text-yellow-200 drop-shadow">
              {slide.valueLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                i === active ? 'w-6 bg-white' : 'w-2 bg-white/40'
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
