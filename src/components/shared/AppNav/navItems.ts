import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  FileUp,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  LineChart,
  ListOrdered,
  Network,
  School,
  ShieldCheck,
  Target,
  Users,
  Building2,
} from 'lucide-react'

export type NavMatchMode = 'exact' | 'prefix' | 'custom'

export type AppNavItem = {
  to: string
  label: string
  icon: LucideIcon
  match: NavMatchMode
  search?: Record<string, unknown>
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
    match: 'custom',
    customMatch: (p) => {
      if (p === '/hr-admin/org' || p.startsWith('/hr-admin/org/')) return false
      return p === '/hr-admin' || p.startsWith('/hr-admin/')
    },
    search: { page: 1 },
    permissionIdsAny: ['hr.employees.view', 'manager.team.view', 'kpi.team_view', 'kpi.team_edit'],
  },
  {
    to: '/hr-admin/org',
    label: 'Phòng ban & Team',
    icon: Network,
    match: 'prefix',
    permissionId: 'hr.org.manage',
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
    to: '/manager/exam-schedule',
    label: 'Lịch thi',
    icon: Calendar,
    match: 'prefix',
    permissionId: 'manager.exam_schedule',
  },
  {
    to: '/manager/class-exams',
    label: 'Bài thi của lớp',
    icon: FileUp,
    match: 'prefix',
    permissionId: 'manager.exam_schedule',
  },
  {
    to: '/manager/grading',
    label: 'Chấm bài thi',
    icon: ClipboardList,
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
  {
    to: '/hr-admin/org',
    label: 'Đơn vị & Nhóm',
    icon: Building2,
    match: 'prefix',
    permissionId: 'hr.org.manage',
  },
]

const TEACHER_CLASS_ITEMS: AppNavItem[] = [
  {
    to: '/teacher/classes',
    label: 'Lớp phụ trách',
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
 * Sidebar: flat route list (permission filter + dedupe by `to` + search).
 * Order ưu tiên luồng sử dụng: Dashboard/KPI → tác vụ manager → nhân sự/org → BOD → teacher.
 */
export function flatSidebarNavItems(canId: (permissionId: string) => boolean): AppNavItem[] {
  const sources = [
    LEADER_KPI_ITEMS,
    MEMBER_SELF_ITEMS,
    MANAGER_OPS_ITEMS,
    HR_ITEMS,
    BOD_ITEMS,
    TEACHER_HEADER_ITEMS,
  ]
  const seen = new Set<string>()
  const out: AppNavItem[] = []
  for (const source of sources) {
    for (const item of filterNavByPermissions(source, canId)) {
      const key = item.to + (item.search !== undefined ? JSON.stringify(item.search) : '')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

export type AppNavGroup = {
  id: string
  label: string
  items: AppNavItem[]
}

/**
 * Sidebar có nhóm: gom theo luồng sử dụng (Tổng quan → Học tập → Quản lý lớp →
 * Nhân sự → Ban lãnh đạo) thay vì danh sách phẳng dài. Mỗi item chỉ xuất hiện
 * 1 lần (dedupe theo `to`+`search`); nhóm rỗng (sau filter quyền) sẽ bị ẩn.
 */
export function groupedSidebarNavItems(canId: (permissionId: string) => boolean): AppNavGroup[] {
  const seen = new Set<string>()
  const take = (items: AppNavItem[]): AppNavItem[] => {
    const out: AppNavItem[] = []
    for (const item of filterNavByPermissions(items, canId)) {
      const key = item.to + (item.search !== undefined ? JSON.stringify(item.search) : '')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
    return out
  }

  const find = (items: AppNavItem[], to: string) => items.filter((i) => i.to === to)

  const groups: AppNavGroup[] = [
    {
      id: 'overview',
      label: 'Tổng quan',
      items: take([
        ...find(LEADER_KPI_ITEMS, '/dashboard'),
        ...find(MEMBER_SELF_ITEMS, '/dashboard'),
        ...find(LEADER_KPI_ITEMS, '/leader/kpi-okr'),
        ...find(LEADER_KPI_ITEMS, '/monthly-report'),
        ...find(MEMBER_SELF_ITEMS, '/monthly-report'),
      ]),
    },
    {
      id: 'learning',
      label: 'Học tập & Thi cử',
      items: take([
        ...find(MEMBER_SELF_ITEMS, '/learning-path'),
        ...find(MEMBER_SELF_ITEMS, '/exam'),
        ...find(MANAGER_OPS_ITEMS, '/manager/exercises'),
      ]),
    },
    {
      id: 'manager',
      label: 'Quản lý lớp & Thi',
      items: take([
        ...find(MANAGER_OPS_ITEMS, '/manager/classes'),
        ...find(TEACHER_HEADER_ITEMS, '/teacher/classes'),
        ...find(MANAGER_OPS_ITEMS, '/manager/exam-schedule'),
        ...find(MANAGER_OPS_ITEMS, '/manager/class-exams'),
        ...find(MANAGER_OPS_ITEMS, '/manager/grading'),
        ...find(TEACHER_HEADER_ITEMS, '/exam/grader'),
        ...find(MANAGER_OPS_ITEMS, '/manager/approvals'),
      ]),
    },
    {
      id: 'hr',
      label: 'Nhân sự & Tổ chức',
      items: take([
        ...find(HR_ITEMS, '/hr-admin'),
        ...find(HR_ITEMS, '/hr-admin/org'),
        ...find(MANAGER_OPS_ITEMS, '/hr-admin/org'),
        ...find(MANAGER_OPS_ITEMS, '/permissions'),
        ...find(BOD_ITEMS, '/permissions'),
      ]),
    },
    {
      id: 'bod',
      label: 'Ban lãnh đạo',
      items: take([
        ...find(BOD_ITEMS, '/bod/dashboard'),
        ...find(BOD_ITEMS, '/bod/trainee-ranking'),
        ...find(BOD_ITEMS, '/bod/team-comparison'),
      ]),
    },
  ]

  return groups.filter((g) => g.items.length > 0)
}

/**
 * Compact header nav: merge by catalog permissions (not a single role).
 * Order: member self, BOD, HR, leader KPI, manager ops, teacher.
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
