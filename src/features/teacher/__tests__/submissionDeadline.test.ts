import { describe, expect, it } from 'vitest'
import { examEpochBounds } from '@/lib/examScheduleTime'
import {
  buildSubmissionDeadlineIso,
  explicitSubmissionDeadlineIso,
  isSameDayDeadline,
  resolveSubmissionDeadline,
} from '../submissionDeadline'

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
