import type {
  OverviewHrFilter,
  OverviewSummary,
  OVERVIEW_CONTRACT_KEYS,
  OVERVIEW_LEVEL_KEYS,
  OVERVIEW_ROLE_KEYS,
} from '@/features/dashboard/api'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'

/** Kỳ báo cáo trong cùng một năm: từ tháng `startMonth` tới `endMonth` (1–12). */
export type OverviewPeriod = { year: number; startMonth: number; endMonth: number }

export type OverviewPreset = 'month' | 'quarter' | 'ytd'

type Hr = OverviewSummary['hr']
type OverviewContractKey = (typeof OVERVIEW_CONTRACT_KEYS)[number]
type OverviewLevelKey = (typeof OVERVIEW_LEVEL_KEYS)[number]
type OverviewRoleKey = (typeof OVERVIEW_ROLE_KEYS)[number]
type Attendance = OverviewSummary['learning']['attendance']
type ExamTally = OverviewSummary['learning']['classRows'][number]['results']

export function presetPeriod(preset: OverviewPreset, today: Date = new Date()): OverviewPeriod {
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  if (preset === 'month') return { year, startMonth: month, endMonth: month }
  if (preset === 'quarter') {
    const q = Math.floor((month - 1) / 3)
    return { year, startMonth: q * 3 + 1, endMonth: q * 3 + 3 }
  }
  return { year, startMonth: 1, endMonth: month }
}

export function matchPreset(
  period: OverviewPeriod,
  today: Date = new Date()
): OverviewPreset | null {
  for (const preset of ['month', 'quarter', 'ytd'] as const) {
    const p = presetPeriod(preset, today)
    if (
      p.year === period.year &&
      p.startMonth === period.startMonth &&
      p.endMonth === period.endMonth
    ) {
      return preset
    }
  }
  return null
}

/** "T11/2026" hoặc "T10 – T11/2026". */
export function periodLabel({ year, startMonth, endMonth }: OverviewPeriod): string {
  if (startMonth === endMonth) return `T${startMonth}/${year}`
  return `T${startMonth} – T${endMonth}/${year}`
}

export function monthInPeriod(year: number, month: number, period: OverviewPeriod): boolean {
  return year === period.year && month >= period.startMonth && month <= period.endMonth
}

/** Tỷ lệ phần trăm làm tròn; `null` khi mẫu số bằng 0 (hiển thị "—", không phải 0%). */
export function pct(part: number, total: number): number | null {
  if (!total) return null
  return Math.round((part / total) * 100)
}

export function formatPct(value: number | null): string {
  return value === null ? '—' : `${value}%`
}

/**
 * Tỷ lệ một phần trên tổng để hiển thị: không làm tròn thành 0% khi vẫn có người, hay 100% khi chưa
 * phải tất cả (294/295 → ">99%", 1/295 → "<1%").
 */
export function formatShare(part: number, total: number): string {
  const value = pct(part, total)
  if (value === null) return '—'
  if (value === 0 && part > 0) return '<1%'
  if (value === 100 && part < total) return '>99%'
  return `${value}%`
}

export function formatCount(n: number): string {
  return n.toLocaleString('vi-VN')
}

/** Có mặt (gồm đi muộn) trên tổng lượt đã điểm danh. */
export function attendanceRate(t: Attendance): number | null {
  return pct(t.present + t.late, t.present + t.late + t.absent)
}

export function attendanceMarked(t: Attendance): number {
  return t.present + t.late + t.absent
}

/** Đạt trên số bài đã có kết quả (không tính bài đang chờ chấm). */
export function passRate(t: ExamTally): number | null {
  return pct(t.passed, t.passed + t.retake + t.other)
}

export type SplitPart = {
  key: string
  label: string
  count: number
  color: string
  /** Các giá trị gốc gộp vào nhóm này (hiện trong tooltip). */
  members?: Array<{ label: string; count: number }>
}

/**
 * Trạng thái nhân viên (cột Loại hợp đồng / vị trí), nhóm do BE gom (`byContract`). Màu theo nhóm (vị trí
 * cố định trong bảng màu), không theo thứ hạng — lọc bỏ nhóm rỗng không làm đổi màu nhóm khác.
 */
export const CONTRACT_META: Record<
  OverviewContractKey,
  { label: string; color: string; hint?: string }
> = {
  official: { label: 'Chính thức', color: 'var(--viz-cat-1)' },
  probation: { label: 'Thử việc', color: 'var(--viz-cat-2)' },
  parttime: { label: 'Part-time', color: 'var(--viz-cat-3)' },
  intern: { label: 'Thực tập & học việc', color: 'var(--viz-cat-4)' },
  lead: {
    label: 'Quản lý & chuyên gia',
    color: 'var(--viz-cat-5)',
    hint: 'Trưởng nhóm, Quản lý, BOD, Chuyên gia ghi ở cột Loại hợp đồng',
  },
  other: { label: 'Khác', color: 'var(--viz-cat-6)' },
  none: { label: 'Chưa cập nhật', color: 'var(--viz-none)' },
}

export function contractParts(rows: Hr['byContract']): SplitPart[] {
  return rows
    .filter((r) => r.count > 0)
    .map((r) => ({
      key: r.key,
      label: CONTRACT_META[r.key].label,
      count: r.count,
      color: CONTRACT_META[r.key].color,
      members: r.members,
    }))
}

/** Nhãn bộ lọc trạng thái (áp cho phần cơ cấu). */
export const STATUS_FILTER_LABEL: Record<OverviewHrFilter['status'], string> = {
  active: 'Đang làm việc',
  inactive: 'Đã nghỉ',
  transferred: 'Điều chuyển',
  probation: 'Thử việc (chờ)',
  reserved: 'Bảo lưu',
  all: 'Mọi trạng thái',
}

export const LEVEL_LABEL: Record<OverviewLevelKey, string> = {
  tap_su: 'Tập sự',
  biet_viec: 'Biết việc',
  duoc_viec: 'Được việc',
  dong_gop_ket_qua: 'Đóng góp kết quả',
  tuong: 'Tướng',
}

/**
 * Chức vụ = vai trò như thẻ ở Danh sách nhân sự, xếp theo cấp bậc từ cao xuống (Giảng viên — thường = 0
 * — ở cuối). Nhân sự (HR) là nhân viên nên không có nhóm riêng: gộp vào Nhân viên, cả ở biểu đồ lẫn bộ
 * lọc (BE lọc "Nhân viên" lấy cả HR).
 */
export const ROLE_ORDER = [
  'BOD',
  'MANAGER',
  'LEADER',
  'MEMBER',
  'TEACHER',
] as const satisfies readonly OverviewRoleKey[]

/**
 * Màu cố định theo vai trò (không theo vị trí lát): các cặp kề nhau theo thứ tự trên, kể cả cặp khép
 * vòng và khi bỏ Giảng viên, đã kiểm tra mù màu trên nền sáng + tối.
 */
const ROLE_COLOR: Record<(typeof ROLE_ORDER)[number], string> = {
  BOD: 'var(--viz-cat-4)',
  MANAGER: 'var(--viz-cat-3)',
  LEADER: 'var(--viz-cat-2)',
  MEMBER: 'var(--viz-cat-1)',
  TEACHER: 'var(--viz-cat-5)',
}

export function roleParts(rows: Hr['byRole']): SplitPart[] {
  const count = new Map<OverviewRoleKey, number>()
  for (const r of rows) {
    const key = r.key === 'HR' ? 'MEMBER' : r.key
    count.set(key, (count.get(key) ?? 0) + r.count)
  }
  return ROLE_ORDER.flatMap((k) => {
    const n = count.get(k) ?? 0
    return n > 0 ? [{ key: k, label: ROLE_LABEL_VI[k], count: n, color: ROLE_COLOR[k] }] : []
  })
}

export type TrendPoint = {
  key: string
  year: number
  month: number
  headcount: number | null
  newHires: number
  leaves: number
  /** Vào làm trong tháng / số nhân sự cuối tháng, %, 1 chữ số thập phân. */
  newHireRate: number | null
  /** Chênh lệch số nhân sự so với tháng trước (người) và theo %; tháng đầu / thiếu số thì null. */
  delta: number | null
  growth: number | null
  inPeriod: boolean
}

function ratio1(part: number, total: number | null): number | null {
  if (!total) return null
  return Math.round((part / total) * 1000) / 10
}

export function trendPoints(monthly: Hr['monthly'], period: OverviewPeriod): TrendPoint[] {
  return monthly.map((m, i) => {
    const prev = i > 0 ? monthly[i - 1]!.headcount : null
    const delta = m.headcount !== null && prev !== null ? m.headcount - prev : null
    return {
      key: `${m.year}-${m.month}`,
      year: m.year,
      month: m.month,
      headcount: m.headcount,
      newHires: m.newHires,
      leaves: m.leaves,
      newHireRate: m.headcount === null ? null : ratio1(m.newHires, m.headcount),
      delta,
      growth: delta === null ? null : ratio1(delta, prev),
      inPeriod: monthInPeriod(m.year, m.month, period),
    }
  })
}

/**
 * Trục từ 0 với đúng `intervals` khoảng chia, bước tròn 1 / 2 / 2,5 / 5 × 10ⁿ, chừa ~12% phía trên cho
 * nhãn số.
 */
export function niceAxis(max: number, intervals = 5): number[] {
  const raw = Math.max(max * 1.12, Number.EPSILON) / intervals
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow
  return Array.from({ length: intervals + 1 }, (_, i) => Math.round(i * step * 1e6) / 1e6)
}

/**
 * Cặp trục trái / phải cùng số khoảng chia (vạch lưới trùng nhau). Số khoảng chia (4–7) chọn sao cho
 * đỉnh trục trái sát số liệu nhất — tránh trục 0–500 cho số lớn nhất ~300.
 */
export function niceAxisPair(
  leftMax: number,
  rightMax: number
): { left: number[]; right: number[] } {
  let best = niceAxis(leftMax, 4)
  for (let intervals = 5; intervals <= 7; intervals += 1) {
    const ticks = niceAxis(leftMax, intervals)
    if (ticks[ticks.length - 1]! < best[best.length - 1]!) best = ticks
  }
  return { left: best, right: niceAxis(rightMax, best.length - 1) }
}

/**
 * Đặt nhãn số của hai đường (tổng nhân sự trục trái, tỷ lệ trục phải) để không đè nhau: so vị trí tương
 * đối (0–1) của hai điểm cùng tháng; đường nào cao hơn ghi nhãn phía trên, đường thấp hơn ghi phía dưới.
 * Điểm tỷ lệ sát đáy (vùng cột) thì luôn ghi phía trên.
 */
export function trendLabelSides(
  points: TrendPoint[],
  countTop: number,
  rateTop: number
): Array<{ headcountBelow: boolean; rateBelow: boolean }> {
  return points.map((p) => {
    if (p.headcount === null || p.newHireRate === null || !countTop || !rateTop) {
      return { headcountBelow: false, rateBelow: false }
    }
    const h = p.headcount / countTop
    const r = p.newHireRate / rateTop
    if (r >= h) return { headcountBelow: r - h < 0.12, rateBelow: false }
    return { headcountBelow: false, rateBelow: r > 0.25 }
  })
}

/**
 * Tỷ lệ nhân sự mới của cả kỳ: số vào làm trong kỳ / số nhân sự ở tháng cuối kỳ đã có số liệu
 * (kỳ kéo sang tháng tương lai thì lấy tháng gần nhất).
 */
export function periodNewHireRate(
  monthly: Hr['monthly'],
  period: OverviewPeriod
): { rate: number | null; newHires: number; headcount: number | null } {
  const months = monthly.filter((m) => monthInPeriod(m.year, m.month, period))
  const newHires = months.reduce((sum, m) => sum + m.newHires, 0)
  const headcount = [...months].reverse().find((m) => m.headcount !== null)?.headcount ?? null
  return { rate: ratio1(newHires, headcount), newHires, headcount }
}

export function formatRate(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('vi-VN')}%`
}

/** Số bộ lọc đang khác mặc định (trạng thái mặc định = Đang làm việc). */
export function countActiveHrFilters(f: OverviewHrFilter): number {
  return [
    f.status !== 'active',
    Boolean(f.teamId || f.divisionId),
    f.contract !== undefined,
    f.level !== undefined,
    f.role !== undefined,
  ].filter(Boolean).length
}

export function genderParts(rows: Hr['byGender']): SplitPart[] {
  const female = rows.find((r) => r.label === 'Nữ')?.count ?? 0
  const male = rows.find((r) => r.label === 'Nam')?.count ?? 0
  const rest = rows
    .filter((r) => r.label !== 'Nữ' && r.label !== 'Nam')
    .reduce((sum, r) => sum + r.count, 0)
  return [
    { key: 'female', label: 'Nữ', count: female, color: 'var(--viz-cat-5)' },
    { key: 'male', label: 'Nam', count: male, color: 'var(--viz-cat-1)' },
    { key: 'unknown', label: 'Chưa cập nhật', count: rest, color: 'var(--viz-none)' },
  ].filter((p) => p.count > 0)
}

/** Kết quả thi theo trạng thái: Đạt / Học lại / Khác (bảo lưu, chia tay) / Chờ chấm. */
export function examParts(t: ExamTally): SplitPart[] {
  return [
    { key: 'passed', label: 'Đạt', count: t.passed, color: 'var(--viz-pass)' },
    { key: 'retake', label: 'Học lại', count: t.retake, color: 'var(--viz-retake)' },
    { key: 'other', label: 'Bảo lưu / khác', count: t.other, color: 'var(--viz-removed)' },
    { key: 'waiting', label: 'Chờ chấm', count: t.waiting, color: 'var(--viz-none)' },
  ].filter((p) => p.count > 0)
}

export type RankedRow = {
  key: string
  label: string
  sublabel?: string | null
  count: number
  /** Team id để mở Danh sách nhân sự đã lọc; không có thì dòng không bấm được. */
  teamId?: string
}

/** Giữ `limit` dòng đầu, phần còn lại gộp "Khác (n team)" — dòng "Chưa có …" luôn giữ riêng ở cuối. */
export function topWithOther(rows: RankedRow[], limit: number, unit: string): RankedRow[] {
  const missing = rows.filter((r) => r.key === 'none')
  const ranked = rows.filter((r) => r.key !== 'none')
  if (ranked.length <= limit + 1) return [...ranked, ...missing]
  const rest = ranked.slice(limit)
  return [
    ...ranked.slice(0, limit),
    {
      key: 'rest',
      label: `Khác (${rest.length} ${unit})`,
      count: rest.reduce((sum, r) => sum + r.count, 0),
    },
    ...missing,
  ]
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function isoToUtcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!))
}

export function formatDateVi(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Giờ buổi học; hạn nộp bài cả ngày (00:00–23:59) ghi "Cả ngày". */
export function agendaTimeLabel(startTime: string, endTime: string): string {
  if (startTime === '00:00' && endTime === '23:59') return 'Cả ngày'
  return `${startTime}–${endTime}`
}

/** Nhãn ngày trong lịch: "Hôm nay", "Ngày mai", "Hôm qua" hoặc thứ trong tuần. */
export function agendaDayLabel(iso: string, todayIso: string): string {
  const diff = Math.round(
    (isoToUtcDate(iso).getTime() - isoToUtcDate(todayIso).getTime()) / 86_400_000
  )
  if (diff === 0) return 'Hôm nay'
  if (diff === 1) return 'Ngày mai'
  if (diff === -1) return 'Hôm qua'
  return WEEKDAYS[isoToUtcDate(iso).getUTCDay()]!
}
