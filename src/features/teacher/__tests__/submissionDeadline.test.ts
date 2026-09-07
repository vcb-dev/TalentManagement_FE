import { describe, expect, it } from 'vitest'
import {
  buildSubmissionDeadlineIso,
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
