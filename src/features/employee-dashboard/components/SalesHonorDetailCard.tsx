import { useEffect, useMemo, useState } from 'react'
import { Trophy, Users, Star, Calendar } from 'lucide-react'
import {
  performanceApi,
  type SalesHonorBoardResponse,
  type SalesHonorWinnerIndividual,
  type SalesHonorWinnerTeam,
} from '@/features/kpi-okr/api'
import { cn } from '@/lib/utils'

function formatNumber(value: number, unit: string): string {
  const isVnd = unit.toUpperCase() === 'VND'
  const formatted = isVnd
    ? new Intl.NumberFormat('vi-VN').format(Math.round(value))
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
  return `${formatted} ${unit}`
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
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    out.push({ year, month, label: `Tháng ${month}/${year}` })
  }
  return out
}

type Props = {
  className?: string
}

export function SalesHonorDetailCard({ className }: Props) {
  const initial = useMemo(defaultYearMonth, [])
  const [ym, setYm] = useState(initial)
  const [data, setData] = useState<SalesHonorBoardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const options = useMemo(monthOptions, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    performanceApi
      .getSalesHonorBoard(ym.year, ym.month)
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

  return (
    <section
      className={cn('rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5', className)}
      aria-labelledby="sales-honor-detail-title"
    >
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-600" aria-hidden />
          <h3 id="sales-honor-detail-title" className="text-base font-bold">
            Vinh danh Phòng Kinh doanh
          </h3>
        </div>
        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
          <select
            className="bg-transparent text-sm outline-none"
            value={`${ym.year}-${ym.month}`}
            onChange={(e) => {
              const parts = e.target.value.split('-')
              const y = Number(parts[0])
              const m = Number(parts[1])
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
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <WinnerCell
            kind="individual"
            metricLabel="Cá nhân doanh thu cao nhất"
            individual={data?.topIndividualRevenue ?? null}
          />
          <WinnerCell
            kind="individual"
            metricLabel="Cá nhân số đơn cao nhất"
            individual={data?.topIndividualOrders ?? null}
          />
          <WinnerCell
            kind="team"
            metricLabel="Team doanh thu cao nhất"
            team={data?.topTeamRevenue ?? null}
          />
          <WinnerCell
            kind="team"
            metricLabel="Team số đơn cao nhất"
            team={data?.topTeamOrders ?? null}
          />
        </div>
      )}
    </section>
  )
}

type WinnerCellProps =
  | { kind: 'individual'; metricLabel: string; individual: SalesHonorWinnerIndividual | null }
  | { kind: 'team'; metricLabel: string; team: SalesHonorWinnerTeam | null }

function WinnerCell(props: WinnerCellProps) {
  const isTeam = props.kind === 'team'
  const Icon = isTeam ? Users : Star
  const empty =
    (isTeam && !props.team) || (!isTeam && !('individual' in props ? props.individual : null))

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {props.metricLabel}
      </div>
      {empty ? (
        <p className="text-sm text-muted-foreground">Chưa có</p>
      ) : isTeam && props.team ? (
        <div>
          <p className="truncate text-base font-semibold">{props.team.team.name}</p>
          <p className="mt-1 text-lg font-bold text-amber-700">
            {formatNumber(
              props.team.totalValue,
              props.team.numericUnit || (props.team.metric === 'REVENUE' ? 'VND' : 'đơn')
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tổng từ {props.team.memberCount} thành viên
          </p>
        </div>
      ) : !isTeam && props.individual ? (
        <div>
          <p className="truncate text-base font-semibold">
            {props.individual.user.displayName ?? '—'}
          </p>
          {props.individual.teamName && (
            <p className="text-xs text-muted-foreground">Team {props.individual.teamName}</p>
          )}
          <p className="mt-1 text-lg font-bold text-amber-700">
            {formatNumber(props.individual.numericValue, props.individual.numericUnit || 'VND')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
