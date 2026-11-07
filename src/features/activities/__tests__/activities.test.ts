import { describe, expect, it } from 'vitest'
import {
  activityClockLabel,
  activityDateBlock,
  activityStatus,
  daysInMonth,
  formatActivityTime,
  pickSpotlight,
  shiftMonth,
  startsInLabel,
  toActivityIso,
  vnDateTimeParts,
  vnMonthOf,
} from '../activityTime'
import { layoutMonthRibbon } from '../monthRibbon'
import { activityFormSchema, activityFormToInput, activityFormValues } from '../schemas'

const SAME_DAY = {
  id: 'a',
  title: 'Team building',
  location: 'Sân vận động',
  startAt: '2026-11-20T01:00:00.000Z',
  endAt: '2026-11-20T04:30:00.000Z',
}

const VALID_FORM = {
  title: 'Team building',
  location: 'Sân vận động',
  startDate: '2026-11-20',
  startTime: '08:00',
  endDate: '',
  endTime: '11:30',
}

describe('activityTime', () => {
  it('reads date and time in Vietnam time', () => {
    expect(vnDateTimeParts('2026-10-31T17:00:00.000Z')).toEqual({
      date: '2026-11-01',
      time: '00:00',
    })
  })

  it('formats one-day and multi-day activities', () => {
    expect(formatActivityTime(SAME_DAY)).toBe('20/11/2026 · 08:00 – 11:30')
    expect(
      formatActivityTime({
        startAt: toActivityIso('2026-11-20', '08:00'),
        endAt: toActivityIso('2026-11-22', '17:00'),
      })
    ).toBe('20/11/2026 08:00 – 22/11/2026 17:00')
  })

  it('builds the date block for one-day and multi-day activities', () => {
    expect(activityDateBlock(SAME_DAY)).toEqual({
      date: '20/11',
      detail: 'Thứ Sáu, 08:00 – 11:30',
    })
    expect(
      activityDateBlock({
        startAt: toActivityIso('2026-11-20', '08:00'),
        endAt: toActivityIso('2026-11-22', '17:00'),
      })
    ).toEqual({ date: '20 – 22/11', detail: 'Từ 08:00 đến 17:00' })
    expect(
      activityDateBlock({
        startAt: toActivityIso('2026-11-30', '20:00'),
        endAt: toActivityIso('2026-12-01', '02:00'),
      }).date
    ).toBe('30/11 – 01/12')
  })

  it('drops the date from the ticket time only when it is a single day', () => {
    expect(activityClockLabel(SAME_DAY)).toBe('08:00 – 11:30')
    expect(
      activityClockLabel({
        startAt: toActivityIso('2026-11-20', '08:00'),
        endAt: toActivityIso('2026-11-22', '17:00'),
      })
    ).toBe('20/11/2026 08:00 – 22/11/2026 17:00')
  })

  it('names the weekday in Vietnam time, not the instant in UTC', () => {
    // 17:30 UTC thứ Sáu 20/11 đã là 00:30 thứ Bảy 21/11 ở Việt Nam.
    expect(
      activityDateBlock({
        startAt: '2026-11-20T17:30:00.000Z',
        endAt: '2026-11-20T18:30:00.000Z',
      })
    ).toEqual({ date: '21/11', detail: 'Thứ Bảy, 00:30 – 01:30' })
  })

  it('counts down by Vietnam calendar days, not by hours left', () => {
    const start = toActivityIso('2026-11-20', '08:00')
    expect(startsInLabel(start, new Date(toActivityIso('2026-11-20', '07:00')))).toBe('Hôm nay')
    // Chỉ còn 9 tiếng nhưng đã là ngày hôm sau theo lịch.
    expect(startsInLabel(start, new Date(toActivityIso('2026-11-19', '23:00')))).toBe('Ngày mai')
    expect(startsInLabel(start, new Date(toActivityIso('2026-11-15', '08:00')))).toBe('Còn 5 ngày')
  })

  it('knows month lengths including leap years', () => {
    expect(daysInMonth({ year: 2026, month: 11 })).toBe(30)
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28)
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29)
  })

  it('spotlights the ongoing activity, then the nearest upcoming one', () => {
    const past = {
      ...SAME_DAY,
      id: 'past',
      endAt: '2026-11-02T04:00:00.000Z',
      startAt: '2026-11-02T01:00:00.000Z',
    }
    const live = {
      ...SAME_DAY,
      id: 'live',
      startAt: '2026-11-10T01:00:00.000Z',
      endAt: '2026-11-10T04:00:00.000Z',
    }
    const next = { ...SAME_DAY, id: 'next' }
    const during = new Date('2026-11-10T02:00:00.000Z')
    expect(pickSpotlight([past, live, next], during)?.id).toBe('live')
    expect(pickSpotlight([past, next], during)?.id).toBe('next')
    expect(pickSpotlight([past], during)).toBeNull()
    expect(pickSpotlight([], during)).toBeNull()
  })

  it('derives the status from the current time', () => {
    expect(activityStatus(SAME_DAY, new Date('2026-11-20T00:59:00.000Z'))).toBe('upcoming')
    expect(activityStatus(SAME_DAY, new Date('2026-11-20T01:00:00.000Z'))).toBe('ongoing')
    expect(activityStatus(SAME_DAY, new Date('2026-11-20T04:30:00.000Z'))).toBe('ongoing')
    expect(activityStatus(SAME_DAY, new Date('2026-11-20T04:31:00.000Z'))).toBe('past')
  })

  it('finds the Vietnam month of an instant', () => {
    expect(vnMonthOf('2026-10-31T17:00:00.000Z')).toEqual({ year: 2026, month: 11 })
  })

  it('moves between months across year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(shiftMonth({ year: 2026, month: 6 }, 1)).toEqual({ year: 2026, month: 7 })
  })
})

describe('layoutMonthRibbon', () => {
  const NOV = { year: 2026, month: 11 }
  const span = (id: string, start: string, end: string) => ({
    ...SAME_DAY,
    id,
    startAt: toActivityIso(start, '08:00'),
    endAt: toActivityIso(end, '17:00'),
  })
  const mid = new Date('2026-11-05T03:00:00.000Z')

  it('places non-overlapping activities on the same lane', () => {
    const { bars, laneCount } = layoutMonthRibbon(
      [span('a', '2026-11-03', '2026-11-04'), span('b', '2026-11-05', '2026-11-05')],
      NOV,
      mid
    )
    expect(laneCount).toBe(1)
    expect(bars.map((b) => b.lane)).toEqual([0, 0])
  })

  it('stacks overlapping activities and reuses freed lanes', () => {
    const { bars, laneCount } = layoutMonthRibbon(
      [
        span('a', '2026-11-03', '2026-11-10'),
        span('b', '2026-11-05', '2026-11-06'),
        span('c', '2026-11-08', '2026-11-08'),
        span('d', '2026-11-10', '2026-11-12'),
      ],
      NOV,
      mid
    )
    expect(laneCount).toBe(2)
    expect(Object.fromEntries(bars.map((b) => [b.activity.id, b.lane]))).toEqual({
      a: 0,
      b: 1,
      c: 1,
      d: 1,
    })
  })

  it('clips activities that run past either end of the month', () => {
    const { bars } = layoutMonthRibbon([span('a', '2026-10-28', '2026-12-02')], NOV, mid)
    expect(bars[0]).toMatchObject({ startDay: 1, endDay: 30 })
  })

  it('marks today only when viewing the current month', () => {
    expect(layoutMonthRibbon([], NOV, mid).today).toBe(5)
    expect(layoutMonthRibbon([], { year: 2026, month: 12 }, mid).today).toBeNull()
    expect(layoutMonthRibbon([], { year: 2027, month: 11 }, mid).today).toBeNull()
  })

  it('uses the Vietnam date at the edge of a UTC day', () => {
    const lateUtc = {
      ...SAME_DAY,
      startAt: '2026-11-09T17:30:00.000Z',
      endAt: '2026-11-09T18:30:00.000Z',
    }
    expect(layoutMonthRibbon([lateUtc], NOV, mid).bars[0]).toMatchObject({
      startDay: 10,
      endDay: 10,
    })
  })
})

describe('activityFormSchema', () => {
  const endTimeErrors = (values: typeof VALID_FORM) => {
    const result = activityFormSchema.safeParse(values)
    return result.success ? [] : result.error.issues.filter((i) => i.path[0] === 'endTime')
  }

  it('accepts a same-day activity with a blank end date', () => {
    expect(activityFormSchema.safeParse(VALID_FORM).success).toBe(true)
  })

  it('requires the title, location, start date and both times', () => {
    for (const field of ['title', 'location', 'startDate', 'startTime', 'endTime']) {
      expect(activityFormSchema.safeParse({ ...VALID_FORM, [field]: '' }).success).toBe(false)
    }
  })

  it('rejects an end that is not after the start', () => {
    expect(endTimeErrors({ ...VALID_FORM, endTime: '08:00' })).toHaveLength(1)
    expect(endTimeErrors({ ...VALID_FORM, endDate: '2026-11-19' })).toHaveLength(1)
    expect(endTimeErrors({ ...VALID_FORM, endDate: '2026-11-21', endTime: '07:00' })).toEqual([])
  })

  it('shows only the required message on a blank end time', () => {
    expect(endTimeErrors({ ...VALID_FORM, endTime: '' }).map((i) => i.message)).toEqual([
      'Vui lòng chọn giờ kết thúc',
    ])
  })

  it('rejects anything but a padded 24-hour time', () => {
    for (const startTime of ['25:00', '08:60', '8h', '8:00 PM', '8:05']) {
      expect(activityFormSchema.safeParse({ ...VALID_FORM, startTime }).success).toBe(false)
    }
  })
})

describe('activity form mapping', () => {
  it('fills a blank end date with the start date', () => {
    expect(activityFormToInput(VALID_FORM)).toEqual({
      title: 'Team building',
      location: 'Sân vận động',
      startAt: '2026-11-20T08:00:00+07:00',
      endAt: '2026-11-20T11:30:00+07:00',
    })
  })

  it('round-trips a saved activity through the form', () => {
    const values = activityFormValues(SAME_DAY)
    expect(values).toEqual(VALID_FORM)

    const multiDay = activityFormValues({ ...SAME_DAY, endAt: '2026-11-22T10:00:00.000Z' })
    expect(multiDay.endDate).toBe('2026-11-22')
    expect(multiDay.endTime).toBe('17:00')
  })

  it('starts blank for a new activity', () => {
    expect(activityFormValues().title).toBe('')
    expect(activityFormValues(null).startDate).toBe('')
  })
})
