import { describe, expect, it } from 'vitest'
import { examEpochBounds } from '@/lib/examScheduleTime'
import {
  addDaysToDateIso,
  buildSubmissionDeadlineIso,
  explicitSubmissionDeadlineIso,
  formatDeadlineRange,
  formatWindowLength,
  isSameDayDeadline,
  resolveSubmissionDeadline,
  submissionWindowOf,
  submissionWindowStatus,
  type ScheduleExamQuestions,
} from '../submissionDeadline'
import { submissionWindowDraftError } from '../components/SubmissionWindowFields'

describe('submissionDeadline', () => {
  it('builds deadline in Vietnam timezone', () => {
    expect(buildSubmissionDeadlineIso('2026-04-15', '23:59')).toBe('2026-04-15T16:59:00.000Z')
  })

  it('allows end time before start time across different days', () => {
    expect(isSameDayDeadline('2026-04-01', '2026-04-05')).toBe(false)
    expect(isSameDayDeadline('2026-04-01', '2026-04-01')).toBe(true)
    expect(isSameDayDeadline('2026-04-01', '')).toBe(true)
  })

  it('resolves standalone schedule deadline from examQuestions', () => {
    const result = resolveSubmissionDeadline({
      dateIso: '2026-04-01',
      startTime: '08:00',
      endTime: '17:00',
      examQuestions: {
        endDateIso: '2026-04-05',
        submissionDeadline: '2026-04-05T10:00:00.000Z',
      },
    })
    expect(result.endDateIso).toBe('2026-04-05')
    expect(result.submissionDeadline).toBe('2026-04-05T10:00:00.000Z')
  })
})

describe('explicitSubmissionDeadlineIso', () => {
  it('uses submissionDeadline extended to a later day', () => {
    expect(
      explicitSubmissionDeadlineIso({
        endTime: '23:59',
        examQuestions: {
          endDateIso: '2026-11-24',
          gradingType: 'rubric_reading',
          submissionDeadline: '2026-11-24T16:59:00.000Z',
        },
      })
    ).toBe('2026-11-24T16:59:00.000Z')
  })

  it('builds deadline from endDateIso + endTime when submissionDeadline is missing', () => {
    expect(
      explicitSubmissionDeadlineIso({
        endTime: '17:00',
        examQuestions: { endDateIso: '2026-11-24' },
      })
    ).toBe('2026-11-24T10:00:00.000Z')
  })

  it('returns null for regular exams without explicit deadline', () => {
    expect(
      explicitSubmissionDeadlineIso({ endTime: '10:00', examQuestions: { duration: 60 } })
    ).toBeNull()
    expect(explicitSubmissionDeadlineIso({ endTime: '10:00', examQuestions: null })).toBeNull()
  })
})

describe('examEpochBounds with extended submission deadline', () => {
  it('ends at submissionDeadline instead of start + duration', () => {
    const { endMs } = examEpochBounds({
      dateIso: '2026-11-23',
      startTime: '00:00',
      endTime: '23:59',
      examQuestions: { endDateIso: '2026-11-24', submissionDeadline: '2026-11-24T16:59:00.000Z' },
    })
    expect(endMs).toBe(Date.parse('2026-11-24T16:59:00.000Z'))
  })
})

describe('khung nhận bài phản tư', () => {
  it('hạn chót lấy từ BE (submissionDeadline) thay vì quy ra số phút', () => {
    const w = submissionWindowOf({
      dateIso: '2026-11-26',
      startTime: '08:00',
      endTime: '08:00',
      examQuestions: { duration: 1440 } as ScheduleExamQuestions,
      submissionDeadline: '2026-11-27T01:00:00.000Z',
    })
    expect(w).toMatchObject({
      openDateIso: '2026-11-26',
      openTime: '08:00',
      closeDateIso: '2026-11-27',
      closeTime: '08:00',
    })
    expect(formatWindowLength(w.closeMs - w.openMs)).toBe('1 ngày')
    expect(submissionWindowStatus(Date.parse('2026-11-26T00:00:00.000Z'), w)).toBe('upcoming')
    expect(submissionWindowStatus(Date.parse('2026-11-26T02:00:00.000Z'), w)).toBe('open')
    expect(submissionWindowStatus(Date.parse('2026-11-27T01:00:00.000Z'), w)).toBe('closed')
  })

  it('không có submissionDeadline → giải từ hạn học phần / examQuestions', () => {
    const w = submissionWindowOf({
      dateIso: '2026-11-25',
      startTime: '13:00',
      endTime: '17:00',
      roadmapItems: [{ deadline: '2026-11-28T16:59:00.000Z' }],
    })
    expect([w.closeDateIso, w.closeTime]).toEqual(['2026-11-28', '23:59'])
  })

  it('độ dài khung nộp dễ đọc', () => {
    const min = 60_000
    expect(formatWindowLength(45 * min)).toBe('45 phút')
    expect(formatWindowLength(270 * min)).toBe('4 giờ 30 phút')
    expect(formatWindowLength(1439 * min)).toBe('23 giờ 59 phút')
    expect(formatWindowLength((3 * 1440 + 15 * 60 + 59) * min)).toBe('3 ngày 15 giờ')
    expect(formatWindowLength(0)).toBe('')
  })

  it('cộng ngày & hiển thị khoảng hạn nộp', () => {
    expect(addDaysToDateIso('2026-11-29', 3)).toBe('2026-12-02')
    expect(
      formatDeadlineRange({
        dateIso: '2026-11-26',
        startTime: '08:00',
        endTime: '08:00',
        examQuestions: { submissionDeadline: '2026-11-27T01:00:00.000Z' },
      })
    ).toBe('08:00 26/11/2026 → 08:00 27/11/2026')
    expect(
      formatDeadlineRange({ dateIso: '2026-11-25', startTime: '13:00', endTime: '17:00' })
    ).toBe('25/11/2026 · 13:00 → 17:00')
  })

  it('kiểm tra khung đang soạn', () => {
    const base = { openDate: '2026-11-26', openTime: '08:00', closeDate: '2026-11-26' }
    expect(submissionWindowDraftError({ ...base, closeTime: '08:00' })).toMatch(/Hạn chót phải sau/)
    expect(submissionWindowDraftError({ ...base, closeTime: '23:59' })).toBeNull()
    expect(
      submissionWindowDraftError({ ...base, closeDate: '2026-11-27', closeTime: '07:00' })
    ).toBeNull()
    expect(submissionWindowDraftError({ ...base, openDate: '', closeTime: '23:59' })).toMatch(
      /ngày mở/
    )
  })
})
