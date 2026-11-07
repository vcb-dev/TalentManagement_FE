import { describe, expect, it } from 'vitest'
import type { MeetingBooking } from '../api'
import {
  countByCategory,
  filterHistory,
  historyCategory,
  weekdayShortVi,
} from '../roomBookingHistoryFilters'

const NOW = { date: '2026-11-04', time: '10:00' }

function booking(over: Partial<MeetingBooking>): MeetingBooking {
  return {
    id: over.id ?? 'b',
    userId: 'u1',
    userName: 'Nguyễn Văn A',
    team: 'N/A',
    room: 'Tầng 5',
    reason: 'Họp team',
    date: '2026-11-04',
    timeFrom: '09:00',
    timeTo: '09:30',
    status: 'approved',
    isEmergency: false,
    isOverridden: false,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...over,
  }
}

describe('historyCategory', () => {
  it('splits upcoming (incl. ongoing) from finished meetings', () => {
    expect(historyCategory(booking({ date: '2026-11-05' }), NOW)).toBe('upcoming')
    expect(historyCategory(booking({ timeFrom: '09:30', timeTo: '11:00' }), NOW)).toBe('upcoming')
    expect(historyCategory(booking({ timeTo: '09:30' }), NOW)).toBe('done')
    expect(historyCategory(booking({ date: '2026-10-01', status: 'pending' }), NOW)).toBe('done')
  })

  it('keeps rejected bookings in their own group even when in the future', () => {
    expect(historyCategory(booking({ date: '2026-12-01', status: 'rejected' }), NOW)).toBe(
      'rejected'
    )
  })
})

describe('filterHistory / countByCategory', () => {
  const items = [
    booking({ id: 'future', date: '2026-11-10', reason: 'Phỏng vấn ứng viên', room: 'Tầng 6' }),
    booking({ id: 'past', date: '2026-10-20', reason: 'Họp đào tạo' }),
    booking({ id: 'rejected', date: '2026-10-21', status: 'rejected', reason: 'Họp khách' }),
  ]

  it('counts every group', () => {
    expect(countByCategory(items, NOW)).toEqual({ all: 3, upcoming: 1, done: 1, rejected: 1 })
  })

  it('filters by group and keeps input order', () => {
    expect(filterHistory(items, NOW, 'all', '').map((b) => b.id)).toEqual([
      'future',
      'past',
      'rejected',
    ])
    expect(filterHistory(items, NOW, 'done', '').map((b) => b.id)).toEqual(['past'])
  })

  it('searches reason, room and dd/mm/yyyy date without diacritics', () => {
    expect(filterHistory(items, NOW, 'all', 'phong van').map((b) => b.id)).toEqual(['future'])
    expect(filterHistory(items, NOW, 'all', 'TẦNG 6').map((b) => b.id)).toEqual(['future'])
    expect(filterHistory(items, NOW, 'all', '20/10').map((b) => b.id)).toEqual(['past'])
    expect(filterHistory(items, NOW, 'rejected', 'dao tao')).toEqual([])
  })
})

describe('weekdayShortVi', () => {
  it('returns the Vietnamese short weekday', () => {
    expect(weekdayShortVi('2026-11-04')).toBe('T4')
    expect(weekdayShortVi('2026-11-08')).toBe('CN')
  })
})
