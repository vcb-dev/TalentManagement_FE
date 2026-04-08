import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  KeyRound,
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
  /** Nếu có — chỉ hiển thị khi user có quyền catalog id này */
  permissionId?: string
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

const HR_ITEMS: AppNavItem[] = [
  {
    to: '/hr-admin',
    label: 'Nhân sự',
    icon: Users,
    match: 'prefix',
    search: { page: 1 },
    permissionId: 'hr.employees.view',
  },
]

const BOD_ITEMS: AppNavItem[] = [
  {
    to: '/bod/dashboard',
    label: 'Tổng quan nhân sự',
    icon: LineChart,
    match: 'prefix',
    permissionId: 'bod.dashboard.view',
  },
  {
    to: '/bod/trainee-ranking',
    label: 'Xếp hạng tập sự',
    icon: BarChart3,
    match: 'prefix',
    permissionId: 'bod.ranking.view',
  },
  {
    to: '/bod/team-comparison',
    label: 'So sánh team',
    icon: BarChart3,
    match: 'prefix',
    permissionId: 'bod.comparison.view',
  },
  {
    to: '/permissions',
    label: 'Phân quyền nhân viên',
    icon: KeyRound,
    match: 'prefix',
    permissionId: 'admin.permissions.assign',
  },
]

const MANAGER_OPS_ITEMS: AppNavItem[] = [
  {
    to: '/manager/team-progress',
    label: 'Nhân sự trong team',
    icon: Users,
    match: 'custom',
    customMatch: (p) => p === '/manager/team-progress' || p.startsWith('/manager/team/'),
    permissionId: 'manager.team.view',
  },
  {
    to: '/manager/classes',
    label: 'Chia lớp',
    icon: School,
    match: 'prefix',
    permissionId: 'manager.classes',
  },
  {
    to: '/manager/review-submissions',
    label: 'Duyệt bài làm',
    icon: ShieldCheck,
    match: 'prefix',
    permissionId: 'manager.review_submissions',
  },
  {
    to: '/manager/exam-schedule',
    label: 'Lịch thi & chỉ định chấm',
    icon: Calendar,
    match: 'prefix',
    permissionId: 'manager.exam_schedule',
  },
  {
    to: '/manager/approvals',
    label: 'Duyệt thăng cấp / sao',
    icon: ShieldCheck,
    match: 'prefix',
    permissionId: 'manager.approvals',
  },
  {
    to: '/manager/exercises',
    label: 'Bài tập lộ trình',
    icon: BookOpen,
    match: 'prefix',
    permissionId: 'manager.exercises',
  },
  {
    to: '/permissions',
    label: 'Phân quyền nhân viên',
    icon: KeyRound,
    match: 'prefix',
    permissionId: 'admin.permissions.assign',
  },
]

const TEACHER_CLASS_ITEMS: AppNavItem[] = [
  {
    to: '/teacher/classes',
    label: 'Lớp & thành viên',
    icon: School,
    match: 'prefix',
    permissionId: 'teacher.classes.view',
  },
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
    permissionId: 'teacher.grade',
  },
]

/** Leader: dashboard, nhân sự team, KPI, báo cáo */
export const LEADER_KPI_ITEMS: AppNavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid, match: 'exact' },
  { to: '/leader/team', label: 'Nhân sự trong team', icon: Users, match: 'prefix' },
  { to: '/leader/kpi-okr', label: 'KPI & OKR trong team', icon: Target, match: 'prefix' },
  { to: '/monthly-report', label: 'Báo cáo hàng tháng', icon: BarChart3, match: 'prefix' },
]

export { HR_ITEMS, BOD_ITEMS, MANAGER_OPS_ITEMS, TEACHER_CLASS_ITEMS }

export function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1)
  return p
}

export function filterNavByPermissions(
  items: AppNavItem[],
  hasPermission: (permissionId: string) => boolean
): AppNavItem[] {
  return items.filter((item) => {
    if (!item.permissionId) return true
    return hasPermission(item.permissionId)
  })
}

export function isNavItemActive(pathname: string, item: AppNavItem): boolean {
  const p = normalizePath(pathname)
  if (item.match === 'custom' && item.customMatch) return item.customMatch(p)
  const t = normalizePath(item.to)
  if (item.match === 'exact') return p === t
  if (item.match === 'prefix') return p === t || p.startsWith(`${t}/`)
  return p === t || p.startsWith(`${t}/`)
}
