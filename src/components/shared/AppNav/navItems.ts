import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  GraduationCap,
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
  /** Nếu có — hiển thị khi user có ít nhất một trong các quyền (ưu tiên hơn `permissionId` nếu cả hai đều có). */
  permissionIdsAny?: string[]
}

/** Member: dashboard, lộ trình, thi, KPI, báo cáo — quyền bám route + catalog (tránh link tới màn không vào được). */
export const MEMBER_SELF_ITEMS: AppNavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard cá nhân',
    icon: LayoutGrid,
    match: 'exact',
    permissionIdsAny: ['dashboard.view', 'home.view'],
  },
  {
    to: '/learning-path',
    label: 'Lộ trình học',
    icon: ListOrdered,
    match: 'prefix',
    permissionId: 'learning.view',
  },
  {
    to: '/learning-classes',
    label: 'Lớp học',
    icon: GraduationCap,
    match: 'prefix',
    permissionId: 'learning.view',
  },
  {
    to: '/exam',
    label: 'Kết quả & lịch thi',
    icon: Calendar,
    match: 'custom',
    customMatch: (p) => {
      if (p === '/exam/grader' || p.startsWith('/exam/grader')) return false
      return p === '/exam' || (p.startsWith('/exam/') && !p.startsWith('/exam/grader'))
    },
    permissionId: 'exam.view',
  },
  /** Route `/_protected/kpi-okr` chỉ MEMBER — dùng `kpi.edit_own` (không dùng chung `kpi.view` với trưởng nhóm). */
  {
    to: '/kpi-okr',
    label: 'KPI & OKR của tôi',
    icon: Target,
    match: 'prefix',
    permissionId: 'kpi.edit_own',
  },
  {
    to: '/monthly-report',
    label: 'Báo cáo hàng tháng',
    icon: BarChart3,
    match: 'prefix',
    permissionId: 'report.view',
  },
]

const HR_ITEMS: AppNavItem[] = [
  {
    to: '/hr-admin',
    label: 'Danh sách nhân sự',
    icon: Users,
    match: 'prefix',
    search: { page: 1 },
    permissionIdsAny: ['hr.employees.view', 'manager.team.view', 'kpi.team_view', 'kpi.team_edit'],
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

/** Leader / quản lý có quyền team KPI: dashboard, KPI team, báo cáo — khớp `/_protected/leader/kpi-okr` và `monthly-report`. */
export const LEADER_KPI_ITEMS: AppNavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutGrid,
    match: 'exact',
    permissionIdsAny: ['dashboard.view', 'home.view'],
  },
  {
    to: '/leader/kpi-okr',
    label: 'KPI & OKR trong team',
    icon: Target,
    match: 'prefix',
    permissionIdsAny: ['kpi.team_view', 'kpi.team_edit'],
  },
  {
    to: '/monthly-report',
    label: 'Báo cáo hàng tháng',
    icon: BarChart3,
    match: 'prefix',
    permissionId: 'report.view',
  },
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
    if (item.permissionIdsAny?.length) {
      return item.permissionIdsAny.some((id) => hasPermission(id))
    }
    if (!item.permissionId) return true
    return hasPermission(item.permissionId)
  })
}

/**
 * Gộp menu header (layout compact) theo quyền catalog — không phụ thuộc một `user.role` duy nhất.
 * Thứ tự: cá nhân → BOD → HR → trưởng nhóm KPI → quản lý → giảng viên/chấm thi.
 */
export function mergeCompactHeaderNavItems(canId: (permissionId: string) => boolean): AppNavItem[] {
  const seen = new Set<string>()
  const out: AppNavItem[] = []
  const push = (items: AppNavItem[]) => {
    for (const item of filterNavByPermissions(items, canId)) {
      const key = item.to + (item.search ? JSON.stringify(item.search) : '')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
  }
  push(MEMBER_SELF_ITEMS)
  push(BOD_ITEMS)
  push(HR_ITEMS)
  push(LEADER_KPI_ITEMS)
  push(MANAGER_OPS_ITEMS)
  push(TEACHER_HEADER_ITEMS)
  return out
}

export function isNavItemActive(pathname: string, item: AppNavItem): boolean {
  const p = normalizePath(pathname)
  if (item.match === 'custom' && item.customMatch) return item.customMatch(p)
  const t = normalizePath(item.to)
  if (item.match === 'exact') return p === t
  if (item.match === 'prefix') return p === t || p.startsWith(`${t}/`)
  return p === t || p.startsWith(`${t}/`)
}
