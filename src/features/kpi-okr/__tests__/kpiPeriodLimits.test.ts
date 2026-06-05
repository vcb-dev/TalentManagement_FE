import { describe, it, expect } from 'vitest'
import {
  getMaxViewableYm,
  isKpiPeriodSelectable,
  clampKpiPeriod,
  getAssignmentWindowPhase,
  isAssignmentWindowOpen,
  resolveAssignmentWindowForTeam,
  resolveKinhDoanhResultsCloseWindowForTeam,
  isKinhDoanhResultsCloseWindowOpen,
  daysInMonth,
  type AssignmentWindowConfigSlice,
} from '../kpiPeriodLimits'

const FIXED_NOW = new Date(2026, 4, 18) // 2026-05-18 (tháng 5)

describe('getMaxViewableYm', () => {
  it('tháng 5 → max tháng 6 cùng năm', () => {
    const result = getMaxViewableYm(FIXED_NOW)
    expect(result).toEqual({ year: 2026, month: 6 })
  })

  it('tháng 12 → max tháng 1 năm sau', () => {
    const dec = new Date(2025, 11, 1)
    const result = getMaxViewableYm(dec)
    expect(result).toEqual({ year: 2026, month: 1 })
  })

  it('tháng 1 → max tháng 2 cùng năm', () => {
    const jan = new Date(2026, 0, 1)
    const result = getMaxViewableYm(jan)
    expect(result).toEqual({ year: 2026, month: 2 })
  })
})

describe('isKpiPeriodSelectable', () => {
  it('tháng hiện tại và trước đó cho phép chọn', () => {
    expect(isKpiPeriodSelectable(2026, 5, FIXED_NOW)).toBe(true)
    expect(isKpiPeriodSelectable(2026, 4, FIXED_NOW)).toBe(true)
    expect(isKpiPeriodSelectable(2026, 1, FIXED_NOW)).toBe(true)
  })

  it('tháng tới (max) cho phép chọn', () => {
    expect(isKpiPeriodSelectable(2026, 6, FIXED_NOW)).toBe(true)
  })

  it('tháng sau max không cho phép chọn', () => {
    expect(isKpiPeriodSelectable(2026, 7, FIXED_NOW)).toBe(false)
    expect(isKpiPeriodSelectable(2026, 12, FIXED_NOW)).toBe(false)
  })

  it('năm trước cho phép chọn tất cả tháng', () => {
    expect(isKpiPeriodSelectable(2025, 12, FIXED_NOW)).toBe(true)
    expect(isKpiPeriodSelectable(2024, 1, FIXED_NOW)).toBe(true)
  })

  it('năm sau không cho phép (vượt cap)', () => {
    expect(isKpiPeriodSelectable(2027, 1, FIXED_NOW)).toBe(false)
  })
})

describe('clampKpiPeriod', () => {
  it('không thay đổi kỳ hợp lệ', () => {
    expect(clampKpiPeriod(2026, 5, FIXED_NOW)).toEqual({ year: 2026, month: 5 })
  })

  it('clamp tháng vượt max về max', () => {
    expect(clampKpiPeriod(2026, 9, FIXED_NOW)).toEqual({ year: 2026, month: 6 })
  })

  it('clamp năm vượt max về năm cap, tháng clamp', () => {
    const result = clampKpiPeriod(2027, 3, FIXED_NOW)
    expect(result.year).toBe(2026)
    expect(result.month).toBeLessThanOrEqual(6)
  })

  it('năm trước — tháng hợp lệ giữ nguyên', () => {
    expect(clampKpiPeriod(2025, 11, FIXED_NOW)).toEqual({ year: 2025, month: 11 })
  })

  it('clamp tháng < 1 về 1', () => {
    expect(clampKpiPeriod(2025, 0, FIXED_NOW)).toEqual({ year: 2025, month: 1 })
  })
})

describe('getAssignmentWindowPhase', () => {
  it('trả "open" trong cửa sổ mặc định (ngày 1-2)', () => {
    const duringWindow = new Date(2026, 4, 1, 12, 0, 0)
    expect(getAssignmentWindowPhase(2026, 5, {}, duringWindow)).toBe('open')
  })

  it('trả "before" trước ngày 1', () => {
    const before = new Date(2026, 3, 30, 23, 59, 59)
    expect(getAssignmentWindowPhase(2026, 5, {}, before)).toBe('before')
  })

  it('trả "after" sau ngày 2', () => {
    const after = new Date(2026, 4, 3, 0, 0, 1)
    expect(getAssignmentWindowPhase(2026, 5, {}, after)).toBe('after')
  })

  it('tùy chỉnh startDay/endDay', () => {
    const day5 = new Date(2026, 4, 5, 12, 0, 0)
    expect(getAssignmentWindowPhase(2026, 5, { startDay: 4, endDay: 6 }, day5)).toBe('open')
    expect(getAssignmentWindowPhase(2026, 5, { startDay: 4, endDay: 6 }, FIXED_NOW)).toBe('after')
  })
})

describe('isAssignmentWindowOpen', () => {
  it('trả true trong cửa sổ', () => {
    const day1 = new Date(2026, 4, 1, 10, 0, 0)
    expect(isAssignmentWindowOpen(2026, 5, {}, day1)).toBe(true)
  })

  it('trả false ngoài cửa sổ', () => {
    expect(isAssignmentWindowOpen(2026, 5, {}, FIXED_NOW)).toBe(false)
  })
})

describe('resolveAssignmentWindowForTeam', () => {
  const TEAM_ID = 'team-001'
  const baseConfigs: AssignmentWindowConfigSlice[] = [
    { teamId: TEAM_ID, year: 2026, month: 5, assignStartDay: 3, assignEndDay: 5 },
    { teamId: null, year: 2026, month: 5, assignStartDay: 1, assignEndDay: 2 },
  ]

  it('ưu tiên config theo teamId', () => {
    const result = resolveAssignmentWindowForTeam(TEAM_ID, 2026, 5, baseConfigs)
    expect(result).toEqual({ startDay: 3, endDay: 5 })
  })

  it('fallback về global (teamId null) khi không có config team', () => {
    const result = resolveAssignmentWindowForTeam('other-team', 2026, 5, baseConfigs)
    expect(result).toEqual({ startDay: 1, endDay: 2 })
  })

  it('fallback về mặc định 1–2 khi không có config nào', () => {
    const result = resolveAssignmentWindowForTeam(TEAM_ID, 2026, 6, baseConfigs)
    expect(result).toEqual({ startDay: 1, endDay: 2 })
  })
})

describe('resolveKinhDoanhResultsCloseWindowForTeam', () => {
  const TEAM_ID = 'team-kd'

  it('mặc định ngày 1 tháng kỳ đến ngày 5 tháng sau', () => {
    expect(resolveKinhDoanhResultsCloseWindowForTeam(TEAM_ID, 2026, 6, [])).toEqual({
      startDay: 1,
      endDay: 5,
    })
    expect(daysInMonth(2026, 2)).toBe(28)
  })

  it('ưu tiên config theo team', () => {
    const configs = [{ teamId: TEAM_ID, year: 2026, month: 6, answerStartDay: 1, answerEndDay: 25 }]
    expect(resolveKinhDoanhResultsCloseWindowForTeam(TEAM_ID, 2026, 6, configs)).toEqual({
      startDay: 1,
      endDay: 25,
    })
  })
})

describe('isKinhDoanhResultsCloseWindowOpen', () => {
  it('mở từ 1/6 đến hết 5/7, khóa sau 5/7', () => {
    const midJune = new Date(2026, 5, 15, 12, 0, 0)
    const july3 = new Date(2026, 6, 3, 12, 0, 0)
    const afterJuly5 = new Date(2026, 6, 6, 0, 0, 0)
    const beforeJune = new Date(2026, 4, 31, 23, 0, 0)
    expect(isKinhDoanhResultsCloseWindowOpen(2026, 6, { startDay: 1, endDay: 5 }, midJune)).toBe(
      true
    )
    expect(isKinhDoanhResultsCloseWindowOpen(2026, 6, { startDay: 1, endDay: 5 }, july3)).toBe(true)
    expect(isKinhDoanhResultsCloseWindowOpen(2026, 6, { startDay: 1, endDay: 5 }, afterJuly5)).toBe(
      false
    )
    expect(isKinhDoanhResultsCloseWindowOpen(2026, 6, { startDay: 1, endDay: 5 }, beforeJune)).toBe(
      false
    )
  })
})
