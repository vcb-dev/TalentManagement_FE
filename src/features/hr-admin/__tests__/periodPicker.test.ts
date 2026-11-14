import { describe, expect, it } from 'vitest'
import { isoDateMatchesMonthYear } from '../employeeListFilters'
import { countActiveEmployeeFilters } from '../components/HrEmployeeList/EmployeeFilterPopover'
import { isPeriodSet, periodLabel, periodMode } from '../components/HrEmployeeList/PeriodPicker'

describe('periodLabel / periodMode', () => {
  it('ngày, tháng, năm', () => {
    expect(periodLabel({ day: 3, month: 11, year: 2026 })).toBe('Ngày 03/11/2026')
    expect(periodMode({ day: 3, month: 11, year: 2026 })).toBe('day')
    expect(periodLabel({ month: 2, year: 2025 })).toBe('Tháng 02/2025')
    expect(periodMode({ month: 2, year: 2025 })).toBe('month')
    expect(periodLabel({ year: 2024 })).toBe('Năm 2024')
    expect(periodMode({ year: 2024 })).toBe('year')
  })

  it('chưa lọc → null, mở sẵn chế độ tháng', () => {
    expect(periodLabel({})).toBeNull()
    expect(periodMode({})).toBe('month')
    expect(isPeriodSet({})).toBe(false)
  })

  it('link cũ chỉ có tháng vẫn hiển thị rõ', () => {
    expect(periodLabel({ month: 3 })).toBe('Tháng 3 · mọi năm')
    expect(isPeriodSet({ month: 3 })).toBe(true)
  })
})

describe('lọc vào làm theo ngày', () => {
  it('khớp đúng ngày, tháng, năm', () => {
    expect(isoDateMatchesMonthYear('2026-11-03', 11, 2026, 3)).toBe(true)
    expect(isoDateMatchesMonthYear('2026-11-04', 11, 2026, 3)).toBe(false)
    expect(isoDateMatchesMonthYear('2026-11-03', 11, 2026)).toBe(true)
  })

  it('ngày / tháng / năm vào làm tính là 1 bộ lọc', () => {
    expect(
      countActiveEmployeeFilters({ status: 'active', startDay: 3, startMonth: 11, startYear: 2026 })
    ).toBe(1)
    expect(countActiveEmployeeFilters({ status: 'active', startYear: 2026 })).toBe(1)
    expect(countActiveEmployeeFilters({ status: 'active' })).toBe(0)
  })
})
