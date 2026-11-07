import { describe, expect, it } from 'vitest'
import {
  agendaDayLabel,
  agendaTimeLabel,
  attendanceRate,
  contractParts,
  examParts,
  genderParts,
  matchPreset,
  passRate,
  pct,
  periodLabel,
  presetPeriod,
  signedTicks,
  topWithOther,
} from '../overviewModel'

const NOV_4 = new Date(2026, 10, 4)

describe('kỳ báo cáo', () => {
  it('nút nhanh: tháng này / quý này / từ đầu năm', () => {
    expect(presetPeriod('month', NOV_4)).toEqual({ year: 2026, startMonth: 11, endMonth: 11 })
    expect(presetPeriod('quarter', NOV_4)).toEqual({ year: 2026, startMonth: 10, endMonth: 12 })
    expect(presetPeriod('ytd', NOV_4)).toEqual({ year: 2026, startMonth: 1, endMonth: 11 })
  })

  it('nhận ra kỳ trùng nút nhanh, kỳ tự chọn thì null', () => {
    expect(matchPreset({ year: 2026, startMonth: 10, endMonth: 12 }, NOV_4)).toBe('quarter')
    expect(matchPreset({ year: 2026, startMonth: 9, endMonth: 11 }, NOV_4)).toBeNull()
    expect(matchPreset({ year: 2025, startMonth: 11, endMonth: 11 }, NOV_4)).toBeNull()
  })

  it('nhãn kỳ', () => {
    expect(periodLabel({ year: 2026, startMonth: 11, endMonth: 11 })).toBe('T11/2026')
    expect(periodLabel({ year: 2026, startMonth: 10, endMonth: 11 })).toBe('T10 – T11/2026')
  })
})

describe('tỷ lệ', () => {
  it('mẫu số 0 trả null (hiện "—"), không phải 0%', () => {
    expect(pct(0, 0)).toBeNull()
    expect(pct(1, 3)).toBe(33)
  })

  it('chuyên cần tính cả đi muộn; tỷ lệ đạt bỏ bài chờ chấm', () => {
    expect(attendanceRate({ present: 8, late: 1, absent: 1 })).toBe(90)
    expect(attendanceRate({ present: 0, late: 0, absent: 0 })).toBeNull()
    expect(passRate({ submitted: 10, passed: 3, retake: 1, other: 0, waiting: 6 })).toBe(75)
    expect(passRate({ submitted: 5, passed: 0, retake: 0, other: 0, waiting: 5 })).toBeNull()
  })
})

describe('gom nhóm cơ cấu', () => {
  it('loại hợp đồng: chức danh gom "Quản lý & chuyên gia", còn lại vào "Khác"; màu theo nhóm', () => {
    const parts = contractParts([
      { label: 'Full-time chính thức', count: 163 },
      { label: 'Part-time', count: 49 },
      { label: 'Trưởng nhóm', count: 16 },
      { label: 'BOD', count: 5 },
      { label: null, count: 3 },
      { label: 'Học việc', count: 2 },
    ])
    expect(parts.map((p) => [p.key, p.count])).toEqual([
      ['official', 163],
      ['parttime', 49],
      ['lead', 21],
      ['other', 5],
    ])
    // "Thử việc" rỗng bị bỏ nhưng Part-time vẫn giữ màu ô 3 của nó.
    expect(parts[1]!.color).toBe('var(--viz-cat-3)')
    expect(parts[3]!.members).toEqual([
      { label: 'Chưa cập nhật', count: 3 },
      { label: 'Học việc', count: 2 },
    ])
  })

  it('giới tính: Nữ, Nam, còn lại "Chưa cập nhật"', () => {
    expect(
      genderParts([
        { label: 'Nam', count: 111 },
        { label: 'Nữ', count: 184 },
        { label: null, count: 2 },
      ]).map((p) => [p.label, p.count])
    ).toEqual([
      ['Nữ', 184],
      ['Nam', 111],
      ['Chưa cập nhật', 2],
    ])
  })

  it('kết quả thi bỏ phần bằng 0', () => {
    expect(
      examParts({ submitted: 4, passed: 2, retake: 0, other: 0, waiting: 2 }).map((p) => p.key)
    ).toEqual(['passed', 'waiting'])
  })

  it('topWithOther gộp đuôi, giữ "Chưa có team" ở cuối; ít dòng thì không gộp', () => {
    const rows = ['a', 'b', 'c', 'd'].map((k, i) => ({ key: k, label: k, count: 10 - i }))
    const none = { key: 'none', label: 'Chưa có team', count: 3 }
    expect(topWithOther([...rows, none], 2, 'team').map((r) => [r.key, r.count])).toEqual([
      ['a', 10],
      ['b', 9],
      ['rest', 15],
      ['none', 3],
    ])
    expect(topWithOther(rows.slice(0, 3), 2, 'team')).toHaveLength(3)
  })
})

describe('trục biểu đồ', () => {
  it('vạch tròn số, có 0, phủ cả phần trên và dưới', () => {
    expect(signedTicks(47, 18)).toEqual([-20, 0, 20, 40, 60])
    expect(signedTicks(3, 2)).toEqual([-2, 0, 2, 4])
    expect(signedTicks(0, 0)).toEqual([0])
  })
})

describe('lịch', () => {
  it('hạn nộp cả ngày', () => {
    expect(agendaTimeLabel('00:00', '23:59')).toBe('Cả ngày')
    expect(agendaTimeLabel('14:30', '16:00')).toBe('14:30–16:00')
  })

  it('nhãn ngày tương đối hoặc thứ', () => {
    expect(agendaDayLabel('2026-11-04', '2026-11-04')).toBe('Hôm nay')
    expect(agendaDayLabel('2026-11-05', '2026-11-04')).toBe('Ngày mai')
    expect(agendaDayLabel('2026-11-03', '2026-11-04')).toBe('Hôm qua')
    expect(agendaDayLabel('2026-11-02', '2026-11-04')).toBe('T2')
  })
})
