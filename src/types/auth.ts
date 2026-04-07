/** HR, Member, Teacher (chấm thi theo kỳ), Manager, Leader (KPI/OKR team), BOD. */
export type Role = 'MEMBER' | 'LEADER' | 'MANAGER' | 'HR' | 'TEACHER' | 'BOD'

export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'deactivate'
  | 'grade'
  | 'approve'
  | 'classify'

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
  role: Role
  permissions: Permission[]
  departmentId: string
  teamIds: string[]
}
