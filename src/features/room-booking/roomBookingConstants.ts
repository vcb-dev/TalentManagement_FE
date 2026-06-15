export const MEETING_ROOMS = [
  { id: 'Tầng 5', label: 'Tầng 5' },
  { id: 'Tầng 6', label: 'Tầng 6' },
  { id: 'Tầng 7', label: 'Tầng 7' },
] as const

/** Khung giờ hiển thị trên lưới (khớp mockup 08:00–18:00). */
export const TIMELINE_START_HOUR = 8
export const TIMELINE_END_HOUR = 24

export const TIMELINE_HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
  (_, i) => TIMELINE_START_HOUR + i
)

export const TIMELINE_TOTAL_MINUTES = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60

export type StatusFilter = 'all' | 'ongoing' | 'approved' | 'pending'

export const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'ongoing', label: 'Đang họp' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'pending', label: 'Chờ duyệt' },
]

export const LEGEND_ITEMS = [
  { key: 'ongoing', label: 'Đang họp', className: 'bg-emerald-500' },
  { key: 'approved', label: 'Đã duyệt', className: 'bg-emerald-200' },
  { key: 'done', label: 'Đã họp xong', className: 'bg-stone-400' },
  { key: 'pending', label: 'Chờ duyệt', className: 'bg-amber-200' },
  { key: 'empty', label: 'Còn trống', className: 'bg-slate-200' },
] as const

export type TimelineViewMode = 'live' | 'full'

export const HOUR_COL_PX = 88

/**
 * Ngày bắt đầu áp dụng nộp BBH (giờ VN).
 * Buổi họp kết thúc trước ngày này chỉ hiển thị "Đã họp xong", không yêu cầu BBH.
 */
export const BBH_REQUIRED_FROM_DATE = '2026-05-19'
