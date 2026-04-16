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
