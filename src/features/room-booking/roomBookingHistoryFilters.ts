import type { MeetingBooking } from './api'
import { isMeetingEnded } from './roomBookingMinutes'

export type HistoryCategory = 'upcoming' | 'done' | 'rejected'
export type HistoryFilter = 'all' | HistoryCategory

export const HISTORY_FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'upcoming', label: 'Sắp tới' },
  { value: 'done', label: 'Đã họp' },
  { value: 'rejected', label: 'Bị từ chối' },
]

/** Sắp tới = chưa kết thúc (kể cả đang họp); lịch bị từ chối / ghi đè tách riêng dù đã qua. */
export function historyCategory(
  b: Pick<MeetingBooking, 'status' | 'date' | 'timeTo'>,
  vnTime: { date: string; time: string }
): HistoryCategory {
  if (b.status === 'rejected') return 'rejected'
  return isMeetingEnded(b, vnTime) ? 'done' : 'upcoming'
}

/** Bỏ dấu + chữ thường để tìm "phong hop" khớp "Phòng họp". */
function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().trim()
}

export function countByCategory(
  items: MeetingBooking[],
  vnTime: { date: string; time: string }
): Record<HistoryFilter, number> {
  const counts: Record<HistoryFilter, number> = {
    all: items.length,
    upcoming: 0,
    done: 0,
    rejected: 0,
  }
  for (const b of items) counts[historyCategory(b, vnTime)] += 1
  return counts
}

/** Lọc theo nhóm trạng thái + từ khoá (nội dung, phòng, ngày dd/mm/yyyy). Giữ nguyên thứ tự đầu vào. */
export function filterHistory(
  items: MeetingBooking[],
  vnTime: { date: string; time: string },
  filter: HistoryFilter,
  query: string
): MeetingBooking[] {
  const q = fold(query)
  return items.filter((b) => {
    if (filter !== 'all' && historyCategory(b, vnTime) !== filter) return false
    if (!q) return true
    const [y, m, d] = b.date.split('-')
    return fold(`${b.reason} ${b.room} ${d}/${m}/${y}`).includes(q)
  })
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

/** "2026-11-04" → "T4" (thứ trong tuần, giờ trưa để tránh lệch múi giờ). */
export function weekdayShortVi(iso: string): string {
  const day = new Date(`${iso}T12:00:00`).getDay()
  return WEEKDAYS[day] ?? ''
}
