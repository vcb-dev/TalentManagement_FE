import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Building2, Users } from 'lucide-react'
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

type HonorSlide =
  | {
      kind: 'individual'
      id: string
      displayName: string
      avatarUrl: string | null
      teamName: string | null
      departmentName: string | null
      kpiLabel: string
      valueFormatted: string
      unit: string
    }
  | {
      kind: 'team'
      id: string
      teamName: string
      departmentName: string | null
      kpiLabel: string
      valueFormatted: string
      unit: string
      memberCount: number
    }

// ─── Constants ─────────────────────────────────────────────────────────────

const SLIDE_INTERVAL = 4500

// ─── Sparkle decoration ────────────────────────────────────────────────────

function Sparkles({ theme }: { theme: 'gold' | 'purple' }) {
  const color = theme === 'gold' ? 'bg-yellow-200' : 'bg-indigo-200'
  const positions = [
    'top-4 left-[38%] h-1 w-1',
    'top-8 left-[55%] h-1.5 w-1.5',
    'top-3 right-[22%] h-1 w-1',
    'top-10 right-[30%] h-2 w-2',
    'bottom-6 left-[42%] h-1 w-1',
    'bottom-8 right-[18%] h-1.5 w-1.5',
    'top-1/2 right-[12%] h-1 w-1',
    'top-6 left-[65%] h-1 w-1',
  ]
  return (
    <>
      {positions.map((p, i) => (
        <span
          key={i}
          className={cn('pointer-events-none absolute rounded-full opacity-60', color, p)}
          style={{ animationDelay: `${i * 0.4}s` }}
          aria-hidden
        />
      ))}
    </>
  )
}

// ─── Trophy decoration ─────────────────────────────────────────────────────

function TrophyDecor({ theme }: { theme: 'gold' | 'purple' }) {
  return (
    <div className="pointer-events-none relative shrink-0 select-none" aria-hidden>
      <div
        className={cn(
          'absolute inset-0 rounded-full blur-2xl opacity-40',
          theme === 'gold' ? 'bg-yellow-300' : 'bg-blue-300'
        )}
      />
      <span className="relative text-[72px] leading-none drop-shadow-2xl">🏆</span>
    </div>
  )
}

// ─── Individual slide ───────────────────────────────────────────────────────

function IndividualSlide({ slide }: { slide: Extract<HonorSlide, { kind: 'individual' }> }) {
  return (
    <div className="relative flex min-h-[180px] items-center gap-5 px-7 py-6 md:gap-8 md:px-10">
      <Sparkles theme="gold" />

      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="relative h-[110px] w-[110px] md:h-[130px] md:w-[130px]">
          {/* Glow behind avatar */}
          <div className="absolute inset-4 rounded-full bg-yellow-300/50 blur-xl" aria-hidden />
          <EmployeeAvatar
            name={slide.displayName}
            photoUrl={slide.avatarUrl ? resolvePublicAssetUrl(slide.avatarUrl) : undefined}
            className="relative z-10 h-[90px] w-[90px] translate-x-[10px] translate-y-[10px] text-2xl shadow-xl md:h-[108px] md:w-[108px]"
          />
          {/* Decorative frame */}
          <img
            src="/khung_avatar/khung_avatar_tuong.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain"
          />
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        {/* Name + badge */}
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-extrabold text-white drop-shadow-md md:text-2xl">
            {slide.displayName}
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-300/60 bg-yellow-400/20 px-2.5 py-0.5 text-xs font-bold text-yellow-200 backdrop-blur-sm">
            👑 VINH DANH
          </span>
        </div>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {slide.departmentName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm">
              <Building2 className="h-3 w-3" />
              {slide.departmentName}
            </span>
          )}
          {slide.teamName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70 backdrop-blur-sm">
              <Users className="h-3 w-3" />
              {slide.teamName}
            </span>
          )}
        </div>

        {/* KPI label */}
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-base">🎯</span>
          <span className="text-xs font-medium text-white/70">KPI: {slide.kpiLabel}</span>
        </div>

        {/* Value */}
        <p className="mt-0.5 text-2xl font-black text-yellow-200 drop-shadow md:text-3xl">
          {slide.valueFormatted}{' '}
          <span className="text-lg font-bold text-yellow-300/80">{slide.unit}</span>
        </p>
      </div>

      {/* Trophy */}
      <TrophyDecor theme="gold" />
    </div>
  )
}

// ─── Team slide ─────────────────────────────────────────────────────────────

function TeamSlide({ slide }: { slide: Extract<HonorSlide, { kind: 'team' }> }) {
  const nameParts = slide.teamName.replace(/^team\s*/i, '').trim()

  return (
    <div className="relative flex min-h-[180px] items-center gap-5 px-7 py-6 md:gap-8 md:px-10">
      <Sparkles theme="purple" />

      {/* Avatar frame — team group icon */}
      <div className="relative shrink-0">
        <div className="relative h-[110px] w-[110px] md:h-[130px] md:w-[130px]">
          <div className="absolute inset-4 rounded-full bg-indigo-300/40 blur-xl" aria-hidden />
          <div className="relative z-10 flex h-[90px] w-[90px] translate-x-[10px] translate-y-[10px] items-center justify-center rounded-full bg-white/20 shadow-xl backdrop-blur-sm md:h-[108px] md:w-[108px]">
            <Users className="h-10 w-10 text-white/90 md:h-12 md:w-12" />
          </div>
          <img
            src="/khung_avatar/khung_avatar_tuong.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain"
          />
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        {/* Team name */}
        <h2 className="text-xl font-extrabold text-white drop-shadow-md md:text-2xl">
          Team <span className="text-yellow-300">{nameParts || slide.teamName}</span>
        </h2>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {slide.departmentName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm">
              <Building2 className="h-3 w-3" />
              {slide.departmentName}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70 backdrop-blur-sm">
            <Users className="h-3 w-3" />
            Nhóm {slide.teamName}
          </span>
        </div>

        {/* KPI label */}
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-base">📊</span>
          <span className="text-xs font-medium text-white/70">KPI: {slide.kpiLabel}</span>
        </div>

        {/* Value + member count */}
        <div className="mt-0.5 flex flex-wrap items-end gap-3">
          <p className="text-2xl font-black text-white drop-shadow md:text-3xl">
            {slide.valueFormatted}{' '}
            <span className="text-lg font-bold text-indigo-200">{slide.unit}</span>
          </p>
          <span className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm">
            <Users className="h-3 w-3" />({slide.memberCount} thành viên)
          </span>
        </div>
      </div>

      {/* Trophy */}
      <TrophyDecor theme="purple" />
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

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

  const slides = useMemo<HonorSlide[]>(() => {
    if (!data?.entries.length) return []
    const result: HonorSlide[] = []

    for (const entry of data.entries) {
      if (entry.topIndividual) {
        const ind = entry.topIndividual
        result.push({
          kind: 'individual',
          id: ind.user.id,
          displayName: ind.user.displayName ?? '—',
          avatarUrl: ind.user.avatarUrl,
          teamName: ind.teamName,
          departmentName: guessDepartment(ind.teamName),
          kpiLabel: entry.content,
          valueFormatted: ind.numericValue.toLocaleString('vi-VN'),
          unit: ind.numericUnit,
        })
      }
      if (entry.topTeam) {
        const team = entry.topTeam
        result.push({
          kind: 'team',
          id: `team-${team.team.id}-${entry.content}`,
          teamName: team.team.name,
          departmentName: guessDepartment(team.team.name),
          kpiLabel: entry.content,
          valueFormatted: team.totalValue.toLocaleString('vi-VN'),
          unit: team.numericUnit,
          memberCount: team.memberCount,
        })
      }
    }

    return result
  }, [data])

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

  const slide = slides[active % slides.length]
  if (!slide) return null
  const isTeam = slide.kind === 'team'

  return (
    <section
      className={cn('relative overflow-hidden rounded-2xl shadow-xl', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Vinh danh nhân sự xuất sắc"
    >
      {/* Gradient background */}
      <div
        className={cn(
          'absolute inset-0 transition-colors duration-700',
          isTeam
            ? 'bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-800'
            : 'bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-400'
        )}
      />
      {/* Radial glow overlay */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          isTeam
            ? 'bg-[radial-gradient(ellipse_at_60%_40%,rgba(99,102,241,0.4)_0%,transparent_70%)]'
            : 'bg-[radial-gradient(ellipse_at_60%_40%,rgba(251,191,36,0.35)_0%,transparent_70%)]'
        )}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10">
        {slide.kind === 'individual' ? (
          <IndividualSlide slide={slide as Extract<HonorSlide, { kind: 'individual' }>} />
        ) : (
          <TeamSlide slide={slide as Extract<HonorSlide, { kind: 'team' }>} />
        )}
      </div>

      {/* Nav arrow right */}
      {slides.length > 1 && (
        <button
          type="button"
          onClick={() => setActive((a) => (a + 1) % slides.length)}
          className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white shadow-md transition hover:bg-white/30 backdrop-blur-sm"
          aria-label="Slide tiếp theo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'rounded-full transition-all',
                i === active ? 'h-2 w-6 bg-white' : 'h-2 w-2 bg-white/40'
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
