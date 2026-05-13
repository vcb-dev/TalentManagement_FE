import { useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, ChevronLeft, ChevronRight, Star, Users, BadgeCheck } from 'lucide-react'
import {
  performanceApi,
  type SalesHonorBoardResponse,
  type TrafficHonorBoardResponse,
  type SalesHonorWinnerIndividual,
  type TrafficHonorIndividualWinner,
} from '@/features/kpi-okr/api'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { LEVEL_LABELS, type LevelCode } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'

// ─── Helpers ────────────────────────────────────────────────────────────────

function currentYearMonth() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

// ─── Types ─────────────────────────────────────────────────────────────────

type HonorPerson = {
  id: string
  displayName: string
  avatarUrl: string | null
  teamName: string | null
  /** Tên phòng ban (vd: "Phòng Kinh doanh", "Marketing Traffic") — suy từ team */
  departmentName: string | null
  metricLabel: string
  valueLabel: string
  /** Vai trò: Tập sự, Biết việc, Được việc, ... */
  roleLabel: string
  /** Số sao hiển thị (demo, sau hook API) */
  stars: number
}

/** Phòng ban theo team — map thủ công (sau API trả sẵn) */
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
  const [salesData, setSalesData] = useState<SalesHonorBoardResponse | null>(null)
  const [trafficData, setTrafficData] = useState<TrafficHonorBoardResponse | null>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch data từ API có sẵn
  useEffect(() => {
    performanceApi
      .getSalesHonorBoard(year, month)
      .then(setSalesData)
      .catch(() => setSalesData(null))
    performanceApi
      .getTrafficHonorBoard(year, month)
      .then(setTrafficData)
      .catch(() => setTrafficData(null))
  }, [year, month])

  // Gộp + sắp xếp: Cá nhân trước, Team sau; Sales trước Traffic
  const persons = useMemo<HonorPerson[]>(() => {
    const result: HonorPerson[] = []

    // ── 1. Sales: cá nhân (doanh thu trước, số đơn sau) ──
    const salesIndivs = [
      { item: salesData?.topIndividualRevenue, tag: 'Sales' as const },
      { item: salesData?.topIndividualOrders, tag: 'Sales' as const },
    ]
    salesIndivs.forEach(({ item, tag }) => {
      if (!item) return
      result.push({
        id: item.user.id,
        displayName: item.user.displayName ?? '—',
        avatarUrl: item.user.avatarUrl,
        teamName: item.teamName,
        departmentName: guessDepartment(item.teamName),
        metricLabel: item.content,
        valueLabel: `${item.numericValue.toLocaleString('vi-VN')} ${item.numericUnit}`,
        roleLabel: 'Biết việc',
        stars: 4,
      })
    })

    // ── 2. Sales: team (doanh thu trước, số đơn sau) ──
    const salesTeams = [
      { item: salesData?.topTeamRevenue, tag: 'Sales Team' as const },
      { item: salesData?.topTeamOrders, tag: 'Sales Team' as const },
    ]
    salesTeams.forEach(({ item, tag }) => {
      if (!item) return
      result.push({
        id: `team-${item.team.id}`,
        displayName: `Team ${item.team.name}`,
        avatarUrl: null,
        teamName: item.team.name,
        departmentName: 'Phòng Kinh doanh',
        metricLabel:
          item.metric === 'REVENUE' ? 'Team · Doanh thu cao nhất' : 'Team · Số đơn cao nhất',
        valueLabel: `${item.totalValue.toLocaleString('vi-VN')} ${item.numericUnit} (${item.memberCount} thành viên)`,
        roleLabel: 'Team',
        stars: 5,
      })
    })

    // ── 3. Traffic: cá nhân ──
    trafficData?.individualWinners?.forEach((item) => {
      result.push({
        id: item.userId,
        displayName: item.displayName,
        avatarUrl: null,
        teamName: item.teamName,
        departmentName: guessDepartment(item.teamName),
        metricLabel: item.metricLabel,
        valueLabel: `${item.numericValue.toLocaleString('vi-VN')} ${item.numericUnit}`,
        roleLabel: 'Biết việc',
        stars: 3,
      })
    })

    // ── 4. Traffic: team ──
    trafficData?.teamWinners?.forEach((item) => {
      result.push({
        id: `team-${item.teamId}`,
        displayName: `Team ${item.teamName}`,
        avatarUrl: null,
        teamName: item.teamName,
        departmentName: guessDepartment(item.teamName),
        metricLabel: item.metricLabel,
        valueLabel: `${item.totalValue.toLocaleString('vi-VN')} ${item.numericUnit} (${item.memberCount} thành viên)`,
        roleLabel: 'Team',
        stars: 4,
      })
    })

    return result
  }, [salesData, trafficData])

  // Auto-slide
  useEffect(() => {
    if (paused || persons.length <= 1) return
    timerRef.current = setInterval(() => {
      setActive((a) => (a + 1) % persons.length)
    }, SLIDE_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, persons.length])

  if (persons.length === 0) return null

  const person = persons[active]
  const bg = GRADIENT_BG[active % GRADIENT_BG.length]

  return (
    <section
      className={cn('relative overflow-hidden rounded-2xl shadow-lg', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Vinh danh nhân sự xuất sắc"
    >
      {/* Nền gradient */}
      <div className={cn('bg-gradient-to-br p-6 transition-colors duration-500', bg)}>
        {/* Nút điều hướng */}
        {persons.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActive((a) => (a - 1 + persons.length) % persons.length)}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
              aria-label="Người trước"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setActive((a) => (a + 1) % persons.length)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
              aria-label="Người sau"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Nội dung slide — layout ngang: avatar trái, info phải */}
        <div className="flex items-center gap-5">
          {/* Bên trái: Avatar + tên + sao + role */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            {person.roleLabel === 'Team' ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
                <Users className="h-10 w-10 text-white" aria-hidden />
              </div>
            ) : (
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-0 scale-110 rounded-full bg-white/30 blur-md"
                  aria-hidden
                />
                <EmployeeAvatar
                  name={person.displayName}
                  photoUrl={person.avatarUrl ? resolvePublicAssetUrl(person.avatarUrl) : undefined}
                  className="relative z-10 h-20 w-20 text-xl ring-3 ring-white/50 shadow-lg"
                />
              </div>
            )}

            {/* Sao */}
            {person.roleLabel !== 'Team' && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: person.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-300 text-yellow-300 drop-shadow" />
                ))}
              </div>
            )}

            {/* Vai trò */}
            <span className="whitespace-nowrap rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
              {person.roleLabel}
            </span>
          </div>

          {/* Bên phải: tên + phòng ban + team + thành tích */}
          <div className="min-w-0 flex-1 text-left">
            {/* Tên */}
            <p className="truncate text-lg font-extrabold text-white drop-shadow-md">
              {person.displayName}
            </p>

            {/* Phòng ban + Team */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {person.departmentName && (
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.65rem] font-medium text-white/80 backdrop-blur-sm">
                  {person.departmentName}
                </span>
              )}
              {person.teamName && (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.65rem] text-white/60 backdrop-blur-sm">
                  {person.teamName}
                </span>
              )}
            </div>

            {/* Icon nhỏ: Trophy cho cá nhân, Users cho team */}
            <div className="mt-2.5 flex items-center gap-1.5">
              {person.roleLabel === 'Team' ? (
                <Users className="h-3.5 w-3.5 text-yellow-200/70" aria-hidden />
              ) : (
                <Trophy className="h-3.5 w-3.5 text-yellow-200/70" aria-hidden />
              )}
              <span className="text-xs font-medium text-white/70">{person.metricLabel}</span>
            </div>

            {/* Giá trị thành tích */}
            <p className="mt-1 text-xl font-extrabold text-yellow-200 drop-shadow">
              {person.valueLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {persons.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {persons.map((_, i) => (
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
