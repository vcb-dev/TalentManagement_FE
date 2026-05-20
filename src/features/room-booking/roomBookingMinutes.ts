import type { MeetingBooking } from './api'
import { BBH_REQUIRED_FROM_DATE } from './roomBookingConstants'

export type MinutesStatus = 'not_required' | 'pending' | 'submitted'

/** Buổi họp thuộc giai đoạn bắt buộc nộp BBH (từ ngày triển khai tính năng). */
export function isSubjectToBbhPolicy(b: Pick<MeetingBooking, 'date'>): boolean {
  return b.date >= BBH_REQUIRED_FROM_DATE
}

/** Buổi họp đã kết thúc (theo giờ VN). */
export function isMeetingEnded(
  b: Pick<MeetingBooking, 'date' | 'timeTo'>,
  vnTime: { date: string; time: string }
): boolean {
  const { date: td, time: ct } = vnTime
  return b.date < td || (b.date === td && b.timeTo <= ct)
}

/** Cần nộp BBH: đã duyệt, đã kết thúc, và từ ngày áp dụng tính năng trở đi. */
export function requiresMeetingMinutes(
  b: MeetingBooking,
  vnTime: { date: string; time: string }
): boolean {
  return b.status === 'approved' && isMeetingEnded(b, vnTime) && isSubjectToBbhPolicy(b)
}

export function getMinutesStatus(
  b: MeetingBooking,
  vnTime: { date: string; time: string }
): MinutesStatus {
  if (!requiresMeetingMinutes(b, vnTime)) return 'not_required'
  if (b.minutesFileUrl) return 'submitted'
  return 'pending'
}

export function getMinutesStatusLabel(status: MinutesStatus): string {
  switch (status) {
    case 'submitted':
      return 'Đã nộp BBH'
    case 'pending':
      return 'Chưa nộp BBH'
    default:
      return '—'
  }
}
