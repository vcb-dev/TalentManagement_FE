import type { ActivityMonth, CompanyActivity } from './types'

export type ActivityStatus = 'ongoing' | 'upcoming' | 'past'

const VN_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Ngày `YYYY-MM-DD` + giờ `HH:mm` theo giờ VN, bất kể múi giờ của trình duyệt. */
export function vnDateTimeParts(value: string | Date): { date: string; time: string } {
  const parts = new Map(VN_PARTS.formatToParts(new Date(value)).map((p) => [p.type, p.value]))
  return {
    date: `${parts.get('year')}-${parts.get('month')}-${parts.get('day')}`,
    time: `${parts.get('hour')}:${parts.get('minute')}`,
  }
}

/** Ghép ngày + giờ admin nhập (luôn hiểu là giờ VN) thành ISO gửi BE. */
export function toActivityIso(date: string, time: string): string {
  return `${date}T${time}:00+07:00`
}

function viDate(isoDate: string): string {
  return isoDate.split('-').reverse().join('/')
}

export function formatActivityTime({
  startAt,
  endAt,
}: Pick<CompanyActivity, 'startAt' | 'endAt'>): string {
  const start = vnDateTimeParts(startAt)
  const end = vnDateTimeParts(endAt)
  if (start.date === end.date) return `${viDate(start.date)} · ${start.time} – ${end.time}`
  return `${viDate(start.date)} ${start.time} – ${viDate(end.date)} ${end.time}`
}

const VN_WEEKDAY = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'long',
})

export function vnWeekday(value: string | Date): string {
  return VN_WEEKDAY.format(new Date(value))
}

/** Ngày lớn + dòng chi tiết cho trang danh sách — không kèm năm vì đầu trang đã có tháng. */
export function activityDateBlock({ startAt, endAt }: Pick<CompanyActivity, 'startAt' | 'endAt'>): {
  date: string
  detail: string
} {
  const start = vnDateTimeParts(startAt)
  const end = vnDateTimeParts(endAt)
  const [, startMonth, startDay] = start.date.split('-')
  const [, endMonth, endDay] = end.date.split('-')
  if (start.date === end.date) {
    return {
      date: `${startDay}/${startMonth}`,
      detail: `${vnWeekday(startAt)}, ${start.time} – ${end.time}`,
    }
  }
  return {
    date:
      startMonth === endMonth
        ? `${startDay} – ${endDay}/${endMonth}`
        : `${startDay}/${startMonth} – ${endDay}/${endMonth}`,
    detail: `Từ ${start.time} đến ${end.time}`,
  }
}

/** Dòng thời gian cạnh một cuống vé đã ghi ngày: cùng ngày thì chỉ cần giờ. */
export function activityClockLabel({
  startAt,
  endAt,
}: Pick<CompanyActivity, 'startAt' | 'endAt'>): string {
  const start = vnDateTimeParts(startAt)
  const end = vnDateTimeParts(endAt)
  return start.date === end.date
    ? `${start.time} – ${end.time}`
    : formatActivityTime({ startAt, endAt })
}

function dayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return Date.UTC(year!, month! - 1, day!) / 86_400_000
}

/** Đếm ngược theo ngày lịch VN, không theo số giờ còn lại. */
export function startsInLabel(startAt: string, now: Date = new Date()): string {
  const days = dayNumber(vnDateTimeParts(startAt).date) - dayNumber(vnDateTimeParts(now).date)
  if (days <= 0) return 'Hôm nay'
  return days === 1 ? 'Ngày mai' : `Còn ${days} ngày`
}

export function daysInMonth({ year, month }: ActivityMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function activityStatus(
  { startAt, endAt }: Pick<CompanyActivity, 'startAt' | 'endAt'>,
  now: Date = new Date()
): ActivityStatus {
  if (new Date(endAt) < now) return 'past'
  return new Date(startAt) <= now ? 'ongoing' : 'upcoming'
}

/** Hoạt động được làm nổi: đang diễn ra trước, không có thì hoạt động sắp tới gần nhất. */
export function pickSpotlight(
  activities: CompanyActivity[],
  now: Date = new Date()
): CompanyActivity | null {
  return (
    activities.find((a) => activityStatus(a, now) === 'ongoing') ??
    activities.find((a) => activityStatus(a, now) === 'upcoming') ??
    null
  )
}

export function vnMonthOf(value: string | Date = new Date()): ActivityMonth {
  const [year, month] = vnDateTimeParts(value).date.split('-')
  return { year: Number(year), month: Number(month) }
}

export function shiftMonth({ year, month }: ActivityMonth, delta: number): ActivityMonth {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}
