import {
  TIMELINE_END_HOUR,
  TIMELINE_START_HOUR,
  TIMELINE_TOTAL_MINUTES,
} from './roomBookingConstants'

export function padTime(t: string): string {
  if (!t) return '00:00'
  const [h, m] = t.split(':')
  return `${(h || '0').padStart(2, '0')}:${(m || '0').padStart(2, '0')}`
}

export function formatTimeRangeVi(from: string, to: string): string {
  return `${padTime(from).replace(/:/g, 'h')} – ${padTime(to).replace(/:/g, 'h')}`
}

export function timeToMinutes(t: string): number {
  const [h, m] = padTime(t).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function clampToTimeline(t: string): string {
  const m = timeToMinutes(t)
  const start = TIMELINE_START_HOUR * 60
  const end = TIMELINE_END_HOUR * 60
  return minutesToTime(Math.min(end, Math.max(start, m)))
}

/** Vị trí % trên trục thời gian (08:00 = 0%, 18:00 = 100%). */
export function timeToPercent(t: string): number {
  const mins = timeToMinutes(t) - TIMELINE_START_HOUR * 60
  return Math.min(100, Math.max(0, (mins / TIMELINE_TOTAL_MINUTES) * 100))
}

/** Vị trí % trong cửa sổ [windowStartHour, TIMELINE_END_HOUR). */
export function timeToPercentInWindow(t: string, windowStartHour: number): number {
  const windowMinutes = (TIMELINE_END_HOUR - windowStartHour) * 60
  if (windowMinutes <= 0) return 0
  const mins = timeToMinutes(t) - windowStartHour * 60
  return Math.min(100, Math.max(0, (mins / windowMinutes) * 100))
}

export function formatDateVi(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!d || !m || !y) return iso
  return `${d}/${m}/${y}`
}

export function formatDateLongVi(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  const label = d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y!, m! - 1, d! + days)
  return dt.toISOString().split('T')[0]!
}

export function hourSlotEnd(hour: number): string {
  const endHour = Math.min(TIMELINE_END_HOUR, hour + 1)
  return `${String(endHour).padStart(2, '0')}:00`
}

export function hourSlotStart(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}
