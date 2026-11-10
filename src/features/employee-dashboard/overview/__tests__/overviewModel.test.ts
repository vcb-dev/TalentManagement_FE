import { describe, expect, it } from 'vitest'
import {
  agendaDayLabel,
  agendaTimeLabel,
  attendanceRate,
  contractParts,
  countActiveHrFilters,
  examParts,
  formatRate,
  formatShare,
  genderParts,
  matchPreset,
  niceAxis,
  niceAxisPair,
  passRate,
  pct,
  periodLabel,
  periodNewHireRate,
  presetPeriod,
  roleParts,
  topWithOther,
  trendLabelSides,
  trendPoints,
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

  it('tỷ lệ hiển thị không làm tròn thành 0% / 100% sai', () => {
    expect(formatShare(294, 295)).toBe('>99%')
    expect(formatShare(1, 295)).toBe('<1%')
    expect(formatShare(295, 295)).toBe('100%')
    expect(formatShare(0, 295)).toBe('0%')
    expect(formatShare(0, 0)).toBe('—')
    expect(formatShare(1, 3)).toBe('33%')
  })

  it('chuyên cần tính cả đi muộn; tỷ lệ đạt bỏ bài chờ chấm', () => {
    expect(attendanceRate({ present: 8, late: 1, absent: 1 })).toBe(90)
    expect(attendanceRate({ present: 0, late: 0, absent: 0 })).toBeNull()
    expect(passRate({ submitted: 10, passed: 3, retake: 1, other: 0, waiting: 6 })).toBe(75)
    expect(passRate({ submitted: 5, passed: 0, retake: 0, other: 0, waiting: 5 })).toBeNull()
  })
})

describe('gom nhóm cơ cấu', () => {
  it('trạng thái nhân viên: nhãn + màu theo nhóm, bỏ nhóm rỗng không đổi màu nhóm khác', () => {
    const parts = contractParts([
      { key: 'official', count: 163, members: [{ label: 'Full-time chính thức', count: 163 }] },
      { key: 'parttime', count: 49, members: [{ label: 'Part-time', count: 49 }] },
      { key: 'intern', count: 0, members: [] },
      {
        key: 'lead',
        count: 21,
        members: [
          { label: 'Trưởng nhóm', count: 16 },
          { label: 'BOD', count: 5 },
        ],
      },
      { key: 'none', count: 3, members: [{ label: 'Chưa cập nhật', count: 3 }] },
    ])
    expect(parts.map((p) => [p.label, p.count])).toEqual([
      ['Chính thức', 163],
      ['Part-time', 49],
      ['Quản lý & chuyên gia', 21],
      ['Chưa cập nhật', 3],
    ])
    expect(parts[1]!.color).toBe('var(--viz-cat-3)')
    expect(parts[2]!.members).toHaveLength(2)
  })

  it('chức vụ: Ban lãnh đạo → Quản lý → Trưởng nhóm → Nhân viên, màu cố định theo vai trò', () => {
    const parts = roleParts([
      { key: 'MEMBER', count: 250 },
      { key: 'LEADER', count: 20 },
      { key: 'BOD', count: 5 },
      { key: 'MANAGER', count: 3 },
      { key: 'TEACHER', count: 0 },
    ])
    expect(parts.map((p) => [p.label, p.count, p.color])).toEqual([
      ['Ban lãnh đạo', 5, 'var(--viz-cat-4)'],
      ['Quản lý', 3, 'var(--viz-cat-3)'],
      ['Trưởng nhóm', 20, 'var(--viz-cat-2)'],
      ['Nhân viên', 250, 'var(--viz-cat-1)'],
    ])
  })

  it('chức vụ: Nhân sự (HR) gộp vào Nhân viên, kể cả khi không có MEMBER', () => {
    expect(
      roleParts([
        { key: 'MEMBER', count: 250 },
        { key: 'HR', count: 2 },
      ]).map((p) => [p.key, p.count])
    ).toEqual([['MEMBER', 252]])
    expect(roleParts([{ key: 'HR', count: 2 }]).map((p) => [p.label, p.count])).toEqual([
      ['Nhân viên', 2],
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

describe('tăng trưởng nhân sự', () => {
  const monthly = [
    { year: 2026, month: 9, newHires: 10, leaves: 2, headcount: 250 },
    { year: 2026, month: 10, newHires: 30, leaves: 5, headcount: 275 },
    { year: 2026, month: 11, newHires: 6, leaves: 1, headcount: 280 },
    { year: 2026, month: 12, newHires: 0, leaves: 0, headcount: null },
  ]

  it('tỷ lệ mới theo tháng 1 chữ số thập phân; tháng tương lai null', () => {
    const points = trendPoints(monthly, { year: 2026, startMonth: 10, endMonth: 11 })
    expect(points.map((p) => p.newHireRate)).toEqual([4, 10.9, 2.1, null])
    expect(points.map((p) => p.inPeriod)).toEqual([false, true, true, false])
    expect(points.map((p) => p.delta)).toEqual([null, 25, 5, null])
    expect(points.map((p) => p.growth)).toEqual([null, 10, 1.8, null])
  })

  it('trục tròn số, đủ khoảng chia, chừa chỗ cho nhãn', () => {
    expect(niceAxis(297)).toEqual([0, 100, 200, 300, 400, 500])
    expect(niceAxis(260)).toEqual([0, 100, 200, 300, 400, 500])
    expect(niceAxis(250)).toEqual([0, 100, 200, 300, 400, 500])
    expect(niceAxis(210)).toEqual([0, 50, 100, 150, 200, 250])
    expect(niceAxis(30.5)).toEqual([0, 10, 20, 30, 40, 50])
    expect(niceAxis(8.1)).toEqual([0, 2, 4, 6, 8, 10])
    expect(niceAxis(0)).toHaveLength(6)
  })

  it('cặp trục cùng số khoảng chia, đỉnh trục trái sát số liệu', () => {
    expect(niceAxisPair(297, 30.5)).toEqual({
      left: [0, 50, 100, 150, 200, 250, 300, 350],
      right: [0, 5, 10, 15, 20, 25, 30, 35],
    })
    const small = niceAxisPair(12, 8.1)
    expect(small.left[small.left.length - 1]).toBeGreaterThanOrEqual(12 * 1.12)
    expect(small.right).toHaveLength(small.left.length)
  })

  it('nhãn hai đường: đường cao ghi trên, thấp ghi dưới; sát nhau thì tách', () => {
    const at = (headcount: number, newHireRate: number) =>
      ({ headcount, newHireRate }) as Parameters<typeof trendLabelSides>[0][number]
    const sides = trendLabelSides([at(200, 5), at(100, 30), at(150, 21), at(250, 20)], 300, 40)
    expect(sides).toEqual([
      { headcountBelow: false, rateBelow: false }, // tỷ lệ sát đáy (vùng cột) → ghi trên
      { headcountBelow: false, rateBelow: false }, // tỷ lệ cao hơn hẳn
      { headcountBelow: true, rateBelow: false }, // tỷ lệ nhỉnh hơn một chút → nhân sự ghi dưới
      { headcountBelow: false, rateBelow: true }, // tỷ lệ thấp hơn → ghi dưới
    ])
  })

  it('tỷ lệ cả kỳ: cộng vào làm trong kỳ / số nhân sự tháng cuối đã có số', () => {
    expect(periodNewHireRate(monthly, { year: 2026, startMonth: 10, endMonth: 12 })).toEqual({
      rate: 12.9,
      newHires: 36,
      headcount: 280,
    })
    expect(periodNewHireRate(monthly, { year: 2027, startMonth: 1, endMonth: 1 })).toEqual({
      rate: null,
      newHires: 0,
      headcount: null,
    })
    expect(formatRate(12.9)).toBe('12,9%')
    expect(formatRate(null)).toBe('—')
  })

  it('đếm bộ lọc khác mặc định (khối & team tính là một)', () => {
    expect(countActiveHrFilters({ status: 'active' })).toBe(0)
    expect(
      countActiveHrFilters({ status: 'all', divisionId: 'd', level: 'tap_su', role: 'MEMBER' })
    ).toBe(4)
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
