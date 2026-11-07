import type { OverviewSummary } from '@/features/dashboard/api'

/** Kỳ báo cáo trong cùng một năm: từ tháng `startMonth` tới `endMonth` (1–12). */
export type OverviewPeriod = { year: number; startMonth: number; endMonth: number }

export type OverviewPreset = 'month' | 'quarter' | 'ytd'

type Hr = OverviewSummary['hr']
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
 * Vạch trục tròn số cho biểu đồ có cả phần dương (trên 0) và âm (dưới 0): bước 1/2/5 × 10ⁿ, khoảng 4
 * khoảng chia, luôn có vạch 0.
 */
export function signedTicks(top: number, bottom: number): number[] {
  const range = Math.max(1, top + bottom)
  const raw = range / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  const step = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow)
  const ticks: number[] = []
  for (let v = -Math.ceil(bottom / step) * step; v <= Math.ceil(top / step) * step; v += step) {
    ticks.push(v === 0 ? 0 : v)
  }
  return ticks
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
 * Loại hợp đồng: 3 loại chuẩn giữ nguyên; chức danh ghi nhầm vào cột này (Trưởng nhóm, Quản lý, BOD,
 * Chuyên gia) gom thành một nhóm; phần còn lại (học việc, thực tập, chưa cập nhật…) vào "Khác".
 */
const CONTRACT_GROUPS = [
  { key: 'official', label: 'Chính thức', match: ['Full-time chính thức'] },
  { key: 'probation', label: 'Thử việc', match: ['Full-time thử việc'] },
  { key: 'parttime', label: 'Part-time', match: ['Part-time'] },
  {
    key: 'lead',
    label: 'Quản lý & chuyên gia',
    match: ['Trưởng nhóm', 'Quản lý', 'BOD', 'Chuyên gia'],
  },
] as const
const CONTRACT_COLORS = [
  'var(--viz-cat-1)',
  'var(--viz-cat-2)',
  'var(--viz-cat-3)',
  'var(--viz-cat-4)',
  'var(--viz-cat-5)',
]

export function contractParts(rows: Hr['byTeamPosition']): SplitPart[] {
  const groups: SplitPart[] = [
    ...CONTRACT_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      count: 0,
      color: '',
      members: [],
    })),
    { key: 'other', label: 'Khác', count: 0, color: '', members: [] },
  ]
  for (const row of rows) {
    const label = row.label ?? 'Chưa cập nhật'
    const i = CONTRACT_GROUPS.findIndex((g) => (g.match as readonly string[]).includes(label))
    const group = groups[i === -1 ? groups.length - 1 : i]!
    group.count += row.count
    group.members!.push({ label, count: row.count })
  }
  // Màu theo nhóm (vị trí cố định), không theo thứ hạng — nhóm rỗng bị bỏ nhưng không đẩy màu.
  return groups.map((g, i) => ({ ...g, color: CONTRACT_COLORS[i]! })).filter((g) => g.count > 0)
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
