/**
 * Giới hạn bộ lọc kỳ KPI/OKR: chỉ xem được tới tháng kế tiếp so với tháng hiện tại (theo lịch).
 * Ví dụ hôm nay tháng 4 → tối đa chọn tới tháng 5 cùng năm; tháng 6–12 không chọn được.
 */
export function getMaxViewableYm(now: Date = new Date()): { year: number; month: number } {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  if (m === 12) return { year: y + 1, month: 1 }
  return { year: y, month: m + 1 }
}

/** Cho phép chọn (năm, tháng) nếu không vượt quá mốc tối đa; các năm trước vẫn chọn đủ 12 tháng. */
export function isKpiPeriodSelectable(
  year: number,
  month: number,
  now: Date = new Date()
): boolean {
  const cap = getMaxViewableYm(now)
  if (year < cap.year) return true
  if (year > cap.year) return false
  return month <= cap.month
}

/** Chuẩn hoá (năm, tháng) sau khi người dùng đổi năm/tháng — không vượt quá mốc tối đa. */
export function clampKpiPeriod(
  year: number,
  month: number,
  now: Date = new Date()
): { year: number; month: number } {
  const cap = getMaxViewableYm(now)
  const y = Math.min(year, cap.year)
  const mBounded = Math.max(1, Math.min(12, month))
  if (y < cap.year) {
    return { year: y, month: mBounded }
  }
  return { year: y, month: Math.min(mBounded, cap.month) }
}

/**
 * Cửa sổ giao mục tiêu KPI/OKR: mặc định mở 00:00 ngày 01 → 23:59 ngày 02.
 * Đồng bộ với BE `assertAssignmentWindowOpen`.
 */
export function isAssignmentWindowOpen(
  year: number,
  month: number,
  cfg: { startDay?: number; endDay?: number } = {},
  now: Date = new Date()
): boolean {
  const startDay = cfg.startDay ?? 1
  const endDay = cfg.endDay ?? 2
  const start = new Date(year, month - 1, startDay, 0, 0, 0, 0)
  const end = new Date(year, month - 1, endDay, 23, 59, 59, 999)
  return now >= start && now <= end
}
