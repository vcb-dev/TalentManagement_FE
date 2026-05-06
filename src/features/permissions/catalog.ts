import type { Action, Resource } from '@/types/auth'

/**
 * Catalog quyền chức năng (id ổn định) — dùng cho UI cây + kiểm tra quyền.
 * Backend sau này có thể trả cùng id hoặc map sang bảng DB.
 */
export type PermissionScope = 'global'
export type PermissionKind = 'module' | 'function' | 'data_toggle'

export interface PermissionNode {
  id: string
  parentId: string | null
  label: string
  kind: PermissionKind
  scope: PermissionScope
  /** Quyền "Xem" bắt buộc khi bật quyền khác trong cùng nhóm (module) */
  mandatoryViewForModule?: string
  /** Tương thích PermissionGate cũ (action + resource) */
  legacy?: { action: Action; resource: Resource }
}

const nodes: PermissionNode[] = [
  { id: 'mod.home', parentId: null, label: 'Trang chủ', kind: 'module', scope: 'global' },
  {
    id: 'home.view',
    parentId: 'mod.home',
    label: 'Xem trang chủ',
    kind: 'function',
    scope: 'global',
  },

  {
    id: 'mod.dashboard',
    parentId: null,
    label: 'Dashboard cá nhân',
    kind: 'module',
    scope: 'global',
  },
  {
    id: 'dashboard.view',
    parentId: 'mod.dashboard',
    label: 'Xem dashboard',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'view', resource: 'checklist' },
  },

  { id: 'mod.learning', parentId: null, label: 'Lộ trình học', kind: 'module', scope: 'global' },
  {
    id: 'learning.view',
    parentId: 'mod.learning',
    label: 'Xem lộ trình',
    kind: 'function',
    scope: 'global',
    mandatoryViewForModule: 'mod.learning',
  },
  {
    id: 'learning.edit_progress',
    parentId: 'mod.learning',
    label: 'Cập nhật tiến độ',
    kind: 'function',
    scope: 'global',
  },

  { id: 'mod.exam', parentId: null, label: 'Thi & kết quả', kind: 'module', scope: 'global' },
  {
    id: 'exam.view',
    parentId: 'mod.exam',
    label: 'Xem lịch thi & kết quả',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'view', resource: 'exam' },
    mandatoryViewForModule: 'mod.exam',
  },
  {
    id: 'exam.take',
    parentId: 'mod.exam',
    label: 'Làm bài thi',
    kind: 'function',
    scope: 'global',
  },

  { id: 'mod.kpi', parentId: null, label: 'KPI & OKR', kind: 'module', scope: 'global' },
  {
    id: 'kpi.view',
    parentId: 'mod.kpi',
    label: 'Xem KPI & OKR',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'view', resource: 'kpi' },
    mandatoryViewForModule: 'mod.kpi',
  },
  {
    id: 'kpi.edit_own',
    parentId: 'mod.kpi',
    label: 'Cập nhật KPI/OKR của tôi',
    kind: 'function',
    scope: 'global',
  },
  {
    id: 'kpi.team_view',
    parentId: 'mod.kpi',
    label: 'Xem KPI/OKR trong team',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'view', resource: 'okr' },
  },
  {
    id: 'kpi.team_edit',
    parentId: 'mod.kpi',
    label: 'Sửa KPI/OKR trong team',
    kind: 'function',
    scope: 'global',
  },
  {
    id: 'kpi.window_override',
    parentId: 'mod.kpi',
    label: 'HR cấu hình cửa sổ giao mục tiêu',
    kind: 'function',
    scope: 'global',
  },

  {
    id: 'mod.report',
    parentId: null,
    label: 'Báo cáo hàng tháng',
    kind: 'module',
    scope: 'global',
  },
  {
    id: 'report.view',
    parentId: 'mod.report',
    label: 'Xem báo cáo',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'view', resource: 'monthly_report' },
    mandatoryViewForModule: 'mod.report',
  },
  {
    id: 'report.edit',
    parentId: 'mod.report',
    label: 'Tạo & sửa báo cáo',
    kind: 'function',
    scope: 'global',
  },

  { id: 'mod.hr', parentId: null, label: 'Nhân sự (HR)', kind: 'module', scope: 'global' },
  {
    id: 'hr.employees.view',
    parentId: 'mod.hr',
    label: 'Xem danh sách nhân viên',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'view', resource: 'employee' },
    mandatoryViewForModule: 'mod.hr',
  },
  {
    id: 'hr.employees.create',
    parentId: 'mod.hr',
    label: 'Tạo nhân viên',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'create', resource: 'employee' },
  },
  {
    id: 'hr.employees.edit',
    parentId: 'mod.hr',
    label: 'Sửa nhân viên',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'edit', resource: 'employee' },
  },
  {
    id: 'hr.employees.deactivate',
    parentId: 'mod.hr',
    label: 'Ngưng hoạt động',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'deactivate', resource: 'employee' },
  },
  {
    id: 'hr.dept.view',
    parentId: 'mod.hr',
    label: 'Xem phòng ban',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'view', resource: 'department' },
  },
  {
    id: 'hr.org.manage',
    parentId: 'mod.hr',
    label: 'Quản lý phòng ban & team',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'edit', resource: 'department' },
  },

  { id: 'mod.manager', parentId: null, label: 'Quản lý vận hành', kind: 'module', scope: 'global' },
  {
    id: 'manager.team.view',
    parentId: 'mod.manager',
    label: 'Xem tiến độ team',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'view', resource: 'team' },
    mandatoryViewForModule: 'mod.manager',
  },
  {
    id: 'manager.classes',
    parentId: 'mod.manager',
    label: 'Chia lớp',
    kind: 'function',
    scope: 'global',
  },
  {
    id: 'manager.review_submissions',
    parentId: 'mod.manager',
    label: 'Duyệt bài làm',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'view', resource: 'submission' },
  },
  {
    id: 'manager.exam_schedule',
    parentId: 'mod.manager',
    label: 'Lịch thi & chỉ định chấm',
    kind: 'function',
    scope: 'global',
  },
  {
    id: 'manager.approvals',
    parentId: 'mod.manager',
    label: 'Duyệt thăng cấp / sao',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'approve', resource: 'promotion' },
  },
  {
    id: 'manager.exercises',
    parentId: 'mod.manager',
    label: 'Bài tập lộ trình',
    kind: 'function',
    scope: 'global',
  },
  {
    id: 'manager.exam.classify',
    parentId: 'mod.manager',
    label: 'Phân loại bài thi',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'classify', resource: 'exam' },
  },

  { id: 'mod.bod', parentId: null, label: 'BOD — Tổng quan', kind: 'module', scope: 'global' },
  {
    id: 'bod.dashboard.view',
    parentId: 'mod.bod',
    label: 'Tổng quan nhân sự',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'view', resource: 'radar_chart' },
    mandatoryViewForModule: 'mod.bod',
  },
  {
    id: 'bod.ranking.view',
    parentId: 'mod.bod',
    label: 'Xếp hạng tập sự',
    kind: 'function',
    scope: 'global',
  },
  {
    id: 'bod.comparison.view',
    parentId: 'mod.bod',
    label: 'So sánh team',
    kind: 'function',
    scope: 'global',
  },

  {
    id: 'mod.teacher',
    parentId: null,
    label: 'Giảng viên / Chấm thi',
    kind: 'module',
    scope: 'global',
  },
  {
    id: 'teacher.classes.view',
    parentId: 'mod.teacher',
    label: 'Xem lớp & thành viên',
    kind: 'function',
    scope: 'global',
    mandatoryViewForModule: 'mod.teacher',
  },
  {
    id: 'teacher.grade',
    parentId: 'mod.teacher',
    label: 'Chấm bài thi',
    kind: 'function',
    scope: 'global',
    legacy: { action: 'grade', resource: 'exam' },
  },

  {
    id: 'mod.admin_rbac',
    parentId: null,
    label: 'Phân quyền người dùng',
    kind: 'module',
    scope: 'global',
  },
  {
    id: 'admin.permissions.assign',
    parentId: 'mod.admin_rbac',
    label: 'Gán & chỉnh quyền nhân viên',
    kind: 'function',
    scope: 'global',
  },

  // Toggle cấp dữ liệu (ABAC) — lưu riêng trong dataScopeFlags
  {
    id: 'data.limit_orders',
    parentId: 'mod.manager',
    label: 'Giới hạn dữ liệu team theo phụ trách',
    kind: 'data_toggle',
    scope: 'global',
  },
  {
    id: 'data.limit_reports',
    parentId: 'mod.report',
    label: 'Giới hạn báo cáo theo phụ trách',
    kind: 'data_toggle',
    scope: 'global',
  },
]

export const PERMISSION_NODES: readonly PermissionNode[] = nodes

/**
 * Thứ tự màn hình ở UI phân quyền (bám thứ tự luồng dùng như menu/sidebar).
 * Mỗi mục = một khối: tích = bật toàn bộ quyền con trong màn.
 */
export const PERMISSION_MODULE_IDS_UI_ORDER: readonly string[] = [
  'mod.home',
  'mod.dashboard',
  'mod.learning',
  'mod.exam',
  'mod.kpi',
  'mod.report',
  'mod.hr',
  'mod.manager',
  'mod.bod',
  'mod.teacher',
  'mod.admin_rbac',
] as const

/**
 * Các màn/đường dẫn hiển thị cho người cấp quyền (tiếng Việt, theo ứng dụng hiện tại).
 * Dùng trên màn “Phân quyền” — không cần trùng 1-1 từng quyền hệ thống, mục tiêu là mô tả rõ khu vực người dùng sẽ thấy.
 */
export const PERMISSION_MODULE_UI_SCREENS: Readonly<Record<string, readonly string[]>> = {
  'mod.home': ['Trang chủ ứng dụng (/)'],
  'mod.dashboard': ['Dashboard cá nhân (/dashboard)'],
  'mod.learning': ['Lộ trình học & checklist theo cấp (/learning-path, …)'],
  'mod.exam': [
    'Kết quả & lịch thi, phòng thi, làm bài (/exam, /exam/…, trừ khu vực chấm thi dành cho giảng viên /exam/grader)',
  ],
  'mod.kpi': [
    'KPI & OKR cá nhân (/kpi-okr)',
    'KPI & OKR trong team — quản lý/leader (/leader/kpi-okr, khi được cấp quyền team)',
    'Cửa sổ giao KPI/OKR theo tháng (/hr-admin/settings/kpi-windows, quyền HR)',
  ],
  'mod.report': [
    'Báo cáo KPI/OKR hàng tháng (/monthly-report, …)',
    'Kèm tùy chọn phạm vi dữ liệu: chỉ dữ liệu team/người phụ trách (khi bật cờ tương ứng trong khối này)',
  ],
  'mod.hr': [
    'Danh sách & hồ sơ nhân viên (/hr-admin, /hr-admin/$mãNhânViên)',
    'Cơ cấu phòng ban & team (/hr-admin/org)',
  ],
  'mod.manager': [
    'Xem team & hồ sơ qua màn Nhân sự (/hr-admin) khi cần quyền xem team',
    'Chia lớp (/manager/classes)',
    'Duyệt bài nộp (/manager/review-submissions)',
    'Lịch thi, bài thi theo lớp, màn chấm (/manager/exam-schedule, /manager/class-exams, /manager/grading, …)',
    'Duyệt thăng cấp / sao (/manager/approvals)',
    'Bài tập lộ trình cho team (/manager/exercises)',
    'Phân loại bài thi, luồng thi theo cấp hình (trong ứng dụng thi, khi có quyền phân loại)',
    'Tùy chọn phạm vi: giới hạn dữ liệu vận hành theo người phụ trách (ABAC, không phải một URL riêng)',
  ],
  'mod.bod': [
    'Tổng quan nhân sự (/bod/dashboard)',
    'Xếp hạng tập sự (/bod/trainee-ranking)',
    'So sánh team (/bod/team-comparison)',
  ],
  'mod.teacher': [
    'Lớp phụ trách (/teacher/classes)',
    'Khu vực chấm bài, kỳ thi dành cho giảng viên (/exam/grader, …)',
  ],
  'mod.admin_rbac': ['Gán & chỉnh quyền nhân viên (/permissions, màn bạn đang dùng)'],
}

export function getModuleUiScreens(moduleId: string): readonly string[] {
  return PERMISSION_MODULE_UI_SCREENS[moduleId] ?? []
}

const byId = new Map(nodes.map((n) => [n.id, n] as const))

export function getPermissionNode(id: string): PermissionNode | undefined {
  return byId.get(id)
}

export function getChildNodeIds(parentId: string): string[] {
  return nodes.filter((n) => n.parentId === parentId).map((n) => n.id)
}

/** Các node module (cấp 1) */
export function getModuleRootIds(): string[] {
  return nodes.filter((n) => n.kind === 'module' && n.parentId === null).map((n) => n.id)
}

/** Module roots theo thứ tự UI; thêm ở cuối mọi id có trong catalog nhưng chưa có trong bảng thứ tự. */
export function getModuleRootIdsInUiOrder(): string[] {
  const roots = new Set(getModuleRootIds())
  const ordered: string[] = []
  for (const id of PERMISSION_MODULE_IDS_UI_ORDER) {
    if (roots.has(id)) ordered.push(id)
  }
  for (const id of roots) {
    if (!ordered.includes(id)) ordered.push(id)
  }
  return ordered
}

export function countFunctionsUnderModule(moduleId: string): { total: number; leaves: string[] } {
  const leaves: string[] = []
  const walk = (pid: string) => {
    for (const n of nodes) {
      if (n.parentId !== pid) continue
      if (n.kind === 'function') leaves.push(n.id)
      else if (n.kind === 'module') walk(n.id)
    }
  }
  walk(moduleId)
  const toggleUnder = nodes
    .filter((n) => n.kind === 'data_toggle' && n.parentId === moduleId)
    .map((n) => n.id)
  return { total: leaves.length + toggleUnder.length, leaves: [...leaves, ...toggleUnder] }
}
