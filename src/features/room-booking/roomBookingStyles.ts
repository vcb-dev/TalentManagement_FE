import type { MeetingBooking } from './api'
import { resolveTimeStatus } from './roomBookingStatus'

export function getBookingBlockClasses(
  b: MeetingBooking,
  vnTime?: { date: string; time: string }
): string {
  const timeStatus = vnTime ? resolveTimeStatus(b, vnTime) : b.timeStatus

  if (b.status === 'approved' && timeStatus === 'ongoing') {
    return 'border-emerald-500 bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300/80 animate-pulse'
  }
  if (b.status === 'approved' && timeStatus === 'done') {
    return 'border-stone-400 bg-stone-300/90 text-stone-700 shadow-sm line-through decoration-stone-500/60'
  }
  if (b.status === 'pending') {
    return 'border-amber-300 bg-amber-50 text-amber-950 shadow-sm'
  }
  if (b.status === 'approved') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm'
  }
  if (b.status === 'rejected') {
    return 'border-slate-200 bg-slate-100 text-slate-600 line-through opacity-70'
  }
  return 'border-slate-200 bg-slate-50 text-slate-800'
}

export function getBookingMarkerClasses(
  b: MeetingBooking,
  vnTime: { date: string; time: string }
): string {
  const timeStatus = resolveTimeStatus(b, vnTime)

  if (b.status === 'approved' && timeStatus === 'ongoing') {
    return 'bg-emerald-500 ring-emerald-300 animate-pulse'
  }
  if (b.status === 'approved' && timeStatus === 'done') {
    return 'bg-stone-500 ring-stone-300'
  }
  if (b.status === 'pending') {
    return 'bg-amber-500 ring-amber-200'
  }
  if (b.status === 'approved') {
    return 'bg-emerald-500 ring-emerald-200'
  }
  if (b.status === 'rejected') {
    return 'bg-rose-400 ring-rose-200 opacity-60'
  }
  return 'bg-slate-400 ring-slate-200'
}
