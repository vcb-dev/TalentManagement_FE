import { daysInMonth, vnDateTimeParts, vnMonthOf } from './activityTime'
import type { ActivityMonth, CompanyActivity } from './types'

export type RibbonBar = {
  activity: CompanyActivity
  /** Ngày trong tháng (1-based), đã cắt theo tháng đang xem. */
  startDay: number
  endDay: number
  /** Hàng vạch (0-based) — các hoạt động trùng ngày nằm khác hàng. */
  lane: number
}

export type MonthRibbonLayout = {
  days: number
  laneCount: number
  bars: RibbonBar[]
  /** Ngày hôm nay nếu đang xem đúng tháng này. */
  today: number | null
}

function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8))
}

/** Xếp hoạt động thành các vạch trên dải ngày của tháng, dùng ít hàng nhất có thể. */
export function layoutMonthRibbon(
  activities: CompanyActivity[],
  month: ActivityMonth,
  now: Date = new Date()
): MonthRibbonLayout {
  const days = daysInMonth(month)
  const prefix = `${month.year}-${String(month.month).padStart(2, '0')}-`
  const firstDate = `${prefix}01`
  const lastDate = `${prefix}${String(days).padStart(2, '0')}`

  const spans = activities
    .map((activity) => {
      const start = vnDateTimeParts(activity.startAt).date
      const end = vnDateTimeParts(activity.endAt).date
      return {
        activity,
        startDay: start < firstDate ? 1 : dayOfMonth(start),
        endDay: end > lastDate ? days : dayOfMonth(end),
      }
    })
    .sort((a, b) => a.startDay - b.startDay)

  const laneEnds: number[] = []
  const bars = spans.map((span) => {
    const free = laneEnds.findIndex((end) => end < span.startDay)
    const lane = free === -1 ? laneEnds.length : free
    laneEnds[lane] = span.endDay
    return { ...span, lane }
  })

  const current = vnMonthOf(now)
  const isCurrent = current.year === month.year && current.month === month.month
  return {
    days,
    laneCount: laneEnds.length,
    bars,
    today: isCurrent ? dayOfMonth(vnDateTimeParts(now).date) : null,
  }
}
