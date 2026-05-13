/** HR, Member, Teacher (chấm thi theo kỳ), Manager, Leader (LEADER — trưởng nhóm KPI/OKR), BOD. */
export type Role = 'MEMBER' | 'LEADER' | 'MANAGER' | 'HR' | 'TEACHER' | 'BOD'
export type StaffLevel = 'PROBATION' | 'PROFICIENT' | 'GENERAL' | 'UNKNOWN'

export type Action = 'view' | 'create' | 'edit' | 'deactivate' | 'grade' | 'approve' | 'classify'

export type Resource =
  | 'employee'
  | 'exam'
  | 'promotion'
  | 'team'
  | 'department'
  | 'radar_chart'
  | 'checklist'
  | 'submission'
  | 'kpi'
  | 'okr'
  | 'monthly_report'

export interface Permission {
  action: Action
  resource: Resource
}

export interface UserSession {
  id: string
  name: string
  email: string
  /** Role hiển thị chính (backward compat) — ưu tiên roles[0] nếu có */
  role: Role
  /** Đa vai trò gán cho tài khoản (RBAC động; mock / API sau) */
  roles?: Role[]
  permissions: Permission[]
  /** Quyền chức năng theo id catalog — ưu tiên khi kiểm tra can(permissionId) */
  permissionIds?: string[]
  /** Cờ giới hạn dữ liệu (ABAC), ví dụ chỉ xem bản ghi phụ trách */
  dataScopeFlags?: Record<string, boolean>
  departmentId: string
  teamIds: string[]
  staffLevel: StaffLevel
  jobTitle?: string
  team?: string
  portraitRef?: string
}
