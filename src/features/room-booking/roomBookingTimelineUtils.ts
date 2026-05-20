import { timeToMinutes, timeToPercent, timeToPercentInWindow } from './roomBookingTimeUtils'

/** Ca ≤ 50 phút hoặc chiếm < ~8.5% khung giờ → hiển thị dạng gọn. */
export function isCompactTimelineBlock(
  timeFrom: string,
  timeTo: string,
  windowStartHour?: number | null
): boolean {
  const duration = Math.max(0, timeToMinutes(timeTo) - timeToMinutes(timeFrom))
  const spanPct =
    windowStartHour != null
      ? timeToPercentInWindow(timeTo, windowStartHour) -
        timeToPercentInWindow(timeFrom, windowStartHour)
      : timeToPercent(timeTo) - timeToPercent(timeFrom)
  return duration <= 50 || spanPct < 8.5
}

export const BLOCK_EDGE_GAP_PCT = 0.55
export const COMPACT_MIN_WIDTH = '2.85rem'
export const HOVER_EXPAND_MIN_WIDTH = '12.5rem'

export function blockLayout(timeFrom: string, timeTo: string) {
  return blockLayoutInWindow(timeFrom, timeTo, null)
}

/** blockLayout theo cửa sổ giờ (live mode); windowStartHour = null → full timeline. */
export function blockLayoutInWindow(
  timeFrom: string,
  timeTo: string,
  windowStartHour: number | null
) {
  const toPct =
    windowStartHour == null
      ? timeToPercent
      : (t: string) => timeToPercentInWindow(t, windowStartHour)
  const left = toPct(timeFrom)
  const right = Math.max(left, toPct(timeTo))
  const rawWidth = Math.max(3, right - left)
  const inset = BLOCK_EDGE_GAP_PCT
  const widthPct = Math.max(3, rawWidth - inset * 2)
  return {
    left: `${left + inset}%`,
    widthPct,
    width: `${widthPct}%`,
  }
}
