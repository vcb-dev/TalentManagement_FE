import { describe, expect, it } from 'vitest'
import {
  computeRowProgress,
  computeSubItemProgress,
  parseNumericFromMetric,
} from '@/features/kpi-okr/utils/kpiProgressUtils'

describe('kpiProgressUtils', () => {
  it('parseNumericFromMetric extracts numbers', () => {
    expect(parseNumericFromMetric('20 dashboard')).toBe(20)
    expect(parseNumericFromMetric('100%')).toBe(100)
    expect(parseNumericFromMetric('')).toBeNull()
  })

  it('computeRowProgress from actual vs target (clamped 0-100)', () => {
    expect(computeRowProgress(22, '20')).toBe(100)
    expect(computeRowProgress(15, '20')).toBe(75)
  })

  it('computeSubItemProgress uses self eval when no numeric', () => {
    expect(computeSubItemProgress({ selfEvalStatus: 'OK' })).toBe(100)
    expect(computeSubItemProgress({ selfEvalStatus: 'NOT' })).toBe(0)
  })

  it('weighted progress scenario: 3 sub-items', () => {
    const subs = [
      { weight: 40, numericValue: 10, targetMetric: '10' },
      { weight: 30, numericValue: 6, targetMetric: '12' },
      { weight: 30, numericValue: 9, targetMetric: '9' },
    ]
    const weighted =
      subs.reduce((sum, s) => sum + s.weight * (computeSubItemProgress(s) ?? 0), 0) /
      subs.reduce((sum, s) => sum + s.weight, 0)
    expect(Math.round(weighted)).toBe(85)
  })
})
