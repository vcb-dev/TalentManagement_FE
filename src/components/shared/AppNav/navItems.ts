import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  LayoutGrid,
  LineChart,
  ListOrdered,
  School,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react'

export type NavMatchMode = 'exact' | 'prefix' | 'custom'

export type AppNavItem = {
  to: string
  label: string
  icon: LucideIcon
  match: NavMatchMode
  search?: { page: number }
  customMatch?: (normalizedPath: string) => boolean
}

/** Member: dashboard, lộ trình, thi, KPI, báo cáo */
export const MEMBER_SELF_ITEMS: AppNavItem[] = [
  { to: '/dashboard', label: 'Dashboard cá nhân', icon: LayoutGrid, match: 'exact' },
  { to: '/learning-path', label: 'Lộ trình học', icon: ListOrdered, match: 'exact' },
  {
    to: '/exam',
    label: 'Kết quả & lịch thi',
    icon: Calendar,
    match: 'custom',
    customMatch: (p) => {
      if (p === '/exam/grader' || p.startsWith('/exam/grader')) return false
      return p === '/exam' || (p.startsWith('/exam/') && !p.startsWith('/exam/grader'))
    },
  },
  { to: '/kpi-okr', label: 'KPI & OKR của tôi', icon: Target, match: 'prefix' },
  { to: '/monthly-report', label: 'Báo cáo hàng tháng', icon: BarChart3, match: 'prefix' },
]

const HR_ADMIN_ITEMS: AppNavItem[] = [
  { to: '/hr-admin', label: 'Nhân sự', icon: Users, match: 'prefix', search: { page: 1 } },
]

const BOD_ITEMS: AppNavItem[] = [
  { to: '/bod/dashboard', label: 'Tổng quan nhân sự', icon: LineChart, match: 'prefix' },
  { to: '/bod/trainee-ranking', label: 'Xếp hạng tập sự', icon: BarChart3, match: 'prefix' },
  { to: '/bod/team-comparison', label: 'So sánh team', icon: BarChart3, match: 'prefix' },
]

const MANAGER_OPS_ITEMS: AppNavItem[] = [
  {
    to: '/manager/team-progress',
    label: 'Nhân sự trong team',
    icon: Users,
    match: 'custom',
    customMatch: (p) => p === '/manager/team-progress' || p.startsWith('/manager/team/'),
  },
  { to: '/manager/classes', label: 'Chia lớp', icon: School, match: 'prefix' },
  { to: '/manager/review-submissions', label: 'Duyệt bài làm', icon: ShieldCheck, match: 'prefix' },
  {
    to: '/manager/exam-schedule',
    label: 'Lịch thi & chỉ định chấm',
    icon: Calendar,
    match: 'prefix',
  },
  { to: '/manager/approvals', label: 'Duyệt thăng cấp / sao', icon: ShieldCheck, match: 'prefix' },
  { to: '/manager/exercises', label: 'Bài tập lộ trình', icon: BookOpen, match: 'prefix' },
]

const TEACHER_CLASS_ITEMS: AppNavItem[] = [
  { to: '/teacher/classes', label: 'Lớp & thành viên', icon: School, match: 'prefix' },
]

/** Teacher: header ngang (thay sidebar) — lớp + chấm thi */
export const TEACHER_HEADER_ITEMS: AppNavItem[] = [
  ...TEACHER_CLASS_ITEMS,
  {
    to: '/exam/grader',
    label: 'Chấm bài & kỳ thi',
    icon: ClipboardList,
    match: 'custom',
    customMatch: (p) =>
      p === '/exam/grader' ||
      p.startsWith('/exam/grader/') ||
      /^\/exam\/[^/]+\/(grade|result)$/.test(p),
  },
]

/** Leader: dashboard, nhân sự team, KPI, báo cáo */
export const LEADER_KPI_ITEMS: AppNavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid, match: 'exact' },
  { to: '/leader/team', label: 'Nhân sự trong team', icon: Users, match: 'prefix' },
  { to: '/leader/kpi-okr', label: 'KPI & OKR trong team', icon: Target, match: 'prefix' },
  { to: '/monthly-report', label: 'Báo cáo hàng tháng', icon: BarChart3, match: 'prefix' },
]

export {
  HR_ADMIN_ITEMS,
  BOD_ITEMS,
  MANAGER_OPS_ITEMS,
  TEACHER_CLASS_ITEMS,
}

export function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1)
  return p
}

export function isNavItemActive(pathname: string, item: AppNavItem): boolean {
  const p = normalizePath(pathname)
  if (item.match === 'custom' && item.customMatch) return item.customMatch(p)
  const t = normalizePath(item.to)
  if (item.match === 'exact') return p === t
  if (item.match === 'prefix') return p === t || p.startsWith(`${t}/`)
  return p === t || p.startsWith(`${t}/`)
}
