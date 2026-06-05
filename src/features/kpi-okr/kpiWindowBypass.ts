/**
 * Tạm thời bỏ kiểm tra cửa sổ KPI/OKR & khảo sát cho các kỳ liệt kê.
 * Đồng bộ với BE `kpi-window-bypass.ts`. Xóa kỳ khỏi mảng khi không cần bypass nữa.
 */
export const KPI_WINDOW_BYPASS_PERIODS = [{ year: 2026, month: 5 }] as const

export function isKpiWindowBypassed(year: number, month: number): boolean {
  return KPI_WINDOW_BYPASS_PERIODS.some((p) => p.year === year && p.month === month)
}
