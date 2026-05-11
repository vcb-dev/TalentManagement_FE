import { useEffect, useMemo, useState } from 'react'
import { Trophy, X, Users, Star } from 'lucide-react'
import { performanceApi, type SalesHonorBoardResponse } from '@/features/kpi-okr/api'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'salesHonorBanner_dismissed'

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

export function SalesHonorBanner() {
  const { year, month, key: monthKey } = useMemo(currentYearMonth, [])
  const [data, setData] = useState<SalesHonorBoardResponse | null>(null)
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(DISMISS_KEY) === monthKey
  })

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

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, monthKey)
    }
    setDismissed(true)
  }

  if (dismissed || !data) return null

  const hasAnyWinner =
    data.topIndividualRevenue ||
    data.topIndividualOrders ||
    data.topTeamRevenue ||
    data.topTeamOrders
  if (!hasAnyWinner) return null

  const lines: Array<{ icon: 'team' | 'individual'; label: string; value: string }> = []
  if (data.topTeamRevenue) {
    lines.push({
      icon: 'team',
      label: `Team ${data.topTeamRevenue.team.name}: Doanh thu cao nhất`,
      value: formatNumber(data.topTeamRevenue.totalValue, data.topTeamRevenue.numericUnit || 'VND'),
    })
  }
  if (data.topTeamOrders) {
    lines.push({
      icon: 'team',
      label: `Team ${data.topTeamOrders.team.name}: Số đơn cao nhất`,
      value: formatNumber(data.topTeamOrders.totalValue, data.topTeamOrders.numericUnit || 'đơn'),
    })
  }
  if (data.topIndividualRevenue) {
    lines.push({
      icon: 'individual',
      label: `${data.topIndividualRevenue.user.displayName ?? '—'}: Doanh thu cao nhất`,
      value: formatNumber(
        data.topIndividualRevenue.numericValue,
        data.topIndividualRevenue.numericUnit || 'VND'
      ),
    })
  }
  if (data.topIndividualOrders) {
    lines.push({
      icon: 'individual',
      label: `${data.topIndividualOrders.user.displayName ?? '—'}: Số đơn cao nhất`,
      value: formatNumber(
        data.topIndividualOrders.numericValue,
        data.topIndividualOrders.numericUnit || 'đơn'
      ),
    })
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-amber-300/40',
        'bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50',
        'shadow-sm dark:from-amber-950/30 dark:via-orange-950/30 dark:to-rose-950/30',
        'dark:border-amber-700/40'
      )}
      role="region"
      aria-label="Vinh danh Phòng Kinh doanh tháng"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200 md:text-base">
              Vinh danh Phòng Kinh doanh · Tháng {month}/{year}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full p-1 text-amber-700 transition hover:bg-amber-200/60 dark:text-amber-300 dark:hover:bg-amber-900/40"
            aria-label="Đóng banner vinh danh"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {lines.map((line, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm shadow-sm ring-1 ring-amber-200/60 dark:bg-amber-950/40 dark:ring-amber-700/40"
            >
              {line.icon === 'team' ? (
                <Users
                  className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden
                />
              ) : (
                <Star className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {line.label}
              </span>
              <span className="shrink-0 font-bold text-amber-700 dark:text-amber-300">
                {line.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
