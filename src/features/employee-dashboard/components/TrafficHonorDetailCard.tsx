import { useEffect, useMemo, useState } from 'react'
import { Zap, Users, Star, Calendar } from 'lucide-react'
import {
  performanceApi,
  type TrafficHonorBoardResponse,
  type TrafficHonorTeamWinner,
  type TrafficHonorIndividualWinner,
} from '@/features/kpi-okr/api'
import { cn } from '@/lib/utils'

function formatNumber(value: number, unit: string): string {
  const isVnd = unit.toUpperCase() === 'VND'
  if (isVnd) {
    if (value >= 1_000_000_000)
      return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000_000)} tỷ VND`
    if (value >= 1_000_000)
      return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value / 1_000_000)} triệu VND`
  }
  if (unit === 'views' && value >= 1_000_000)
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)}M views`
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)} ${unit}`
}

function defaultYearMonth(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function monthOptions(): Array<{ year: number; month: number; label: string }> {
  const now = new Date()
  const out: Array<{ year: number; month: number; label: string }> = []
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
    })
  }
  return out
}

// Giải team = tổng cá nhân trong team, dùng PERSONAL_TRAFFIC/PERSONAL_REVENUE
const TEAM_METRIC_ORDER = ['PERSONAL_TRAFFIC', 'PERSONAL_REVENUE']
const INDIVIDUAL_METRIC_ORDER = ['PERSONAL_TRAFFIC', 'PERSONAL_REVENUE']

type Props = { className?: string }

export function TrafficHonorDetailCard({ className }: Props) {
  const initial = useMemo(defaultYearMonth, [])
  const [ym, setYm] = useState(initial)
  const [data, setData] = useState<TrafficHonorBoardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const options = useMemo(monthOptions, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    performanceApi
      .getTrafficHonorBoard(ym.year, ym.month)
      .then((res) => {
        if (alive) setData(res)
      })
      .catch(() => {
        if (alive) setData(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [ym.year, ym.month])

  const teamWinnersByMetric = useMemo(() => {
    const map = new Map<string, TrafficHonorTeamWinner>()
    data?.teamWinners.forEach((w) => map.set(w.metricKey, w))
    return map
  }, [data])

  const individualWinnersByMetric = useMemo(() => {
    const map = new Map<string, TrafficHonorIndividualWinner>()
    data?.individualWinners.forEach((w) => map.set(w.metricKey, w))
    return map
  }, [data])

  const hasAnyWinner =
    (data?.teamWinners.length ?? 0) > 0 || (data?.individualWinners.length ?? 0) > 0

  return (
    <section
      className={cn('rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5', className)}
      aria-labelledby="traffic-honor-title"
    >
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-sky-600" aria-hidden />
          <h3 id="traffic-honor-title" className="text-base font-bold">
            Vinh danh Traffic Teams
          </h3>
        </div>
        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
          <select
            className="bg-transparent text-sm outline-none"
            value={`${ym.year}-${ym.month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number)
              if (y && m) setYm({ year: y, month: m })
            }}
            aria-label="Chọn tháng"
          >
            {options.map((o) => (
              <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : !hasAnyWinner ? (
        <p className="text-sm text-muted-foreground">Chưa có dữ liệu vinh danh tháng này.</p>
      ) : (
        <div className="space-y-4">
          {/* Team winners — 4 metrics */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Giải Team
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {TEAM_METRIC_ORDER.map((key) => (
                <TeamWinnerCell key={key} winner={teamWinnersByMetric.get(key) ?? null} />
              ))}
            </div>
          </div>

          {/* Individual winners — 2 metrics */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Giải Cá nhân
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {INDIVIDUAL_METRIC_ORDER.map((key) => (
                <IndividualWinnerCell
                  key={key}
                  winner={individualWinnersByMetric.get(key) ?? null}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function TeamWinnerCell({ winner }: { winner: TrafficHonorTeamWinner | null }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Users className="h-3.5 w-3.5" aria-hidden />
        {winner?.metricLabel ?? '—'}
      </div>
      {!winner ? (
        <p className="text-sm text-muted-foreground">Chưa có</p>
      ) : (
        <div>
          <p className="truncate text-base font-semibold">{winner.teamName}</p>
          <p className="mt-1 text-lg font-bold text-sky-700">
            {formatNumber(winner.totalValue, winner.numericUnit)}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{winner.memberCount} thành viên</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 font-semibold',
                winner.ratioPercent === 100
                  ? 'bg-emerald-100 text-emerald-700'
                  : winner.ratioPercent >= 60
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-600'
              )}
            >
              {winner.ratioPercent}% — {formatNumber(winner.amount, 'VND')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function IndividualWinnerCell({ winner }: { winner: TrafficHonorIndividualWinner | null }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Star className="h-3.5 w-3.5" aria-hidden />
        {winner?.metricLabel ?? '—'}
      </div>
      {!winner ? (
        <p className="text-sm text-muted-foreground">Chưa có</p>
      ) : (
        <div>
          <p className="truncate text-base font-semibold">{winner.displayName}</p>
          {winner.teamName && (
            <p className="text-xs text-muted-foreground">Team {winner.teamName}</p>
          )}
          <p className="mt-1 text-lg font-bold text-sky-700">
            {formatNumber(winner.numericValue, winner.numericUnit)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Thưởng: {formatNumber(winner.amount, 'VND')}
          </p>
        </div>
      )}
    </div>
  )
}
