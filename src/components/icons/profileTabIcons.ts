import type { LucideIcon } from 'lucide-react'
import { Calendar, ClipboardList, LayoutGrid, ListOrdered, UserCircle } from 'lucide-react'

/**
 * Icon tab hồ sơ — cùng ngữ nghĩa với menu sidebar (Dashboard, Lộ trình, Thi, …).
 */
export const PROFILE_TAB_ICONS = {
  overview: LayoutGrid,
  learning: ListOrdered,
  exams: Calendar,
  work: ClipboardList,
  info: UserCircle,
} as const satisfies Record<'overview' | 'learning' | 'exams' | 'work' | 'info', LucideIcon>
