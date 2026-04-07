import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import type { Role } from '@/types/auth'

export interface RoleTemplate {
  id: string
  /** Nhãn hiển thị — bám ROLE_LABEL_VI / role hệ thống */
  name: string
  description?: string
  /** Role hệ thống tương ứng (MEMBER … BOD) */
  linkedRole: Role
  permissionIds: string[]
}

/**
 * Một template cho mỗi role trong ROLES — thứ tự bám `ROLES` trong constants.
 */
export const ROLE_TEMPLATES: readonly RoleTemplate[] = [
  {
    id: 'tpl.member',
    name: ROLE_LABEL_VI.MEMBER,
    linkedRole: 'MEMBER',
    permissionIds: [
      'home.view',
      'dashboard.view',
      'learning.view',
      'learning.edit_progress',
      'exam.view',
      'exam.take',
      'kpi.view',
      'kpi.edit_own',
      'report.view',
      'report.edit',
    ],
  },
  {
    id: 'tpl.leader',
    name: ROLE_LABEL_VI.LEADER,
    linkedRole: 'LEADER',
    permissionIds: [
      'home.view',
      'dashboard.view',
      'learning.view',
      'exam.view',
      'kpi.view',
      'kpi.team_view',
      'kpi.team_edit',
      'report.view',
      'report.edit',
    ],
  },
  {
    id: 'tpl.manager',
    name: ROLE_LABEL_VI.MANAGER,
    linkedRole: 'MANAGER',
    permissionIds: [
      'home.view',
      'dashboard.view',
      'hr.employees.view',
      'hr.employees.edit',
      'manager.team.view',
      'manager.classes',
      'manager.review_submissions',
      'manager.exam_schedule',
      'manager.approvals',
      'manager.exercises',
      'manager.exam.classify',
      'kpi.view',
      'kpi.team_view',
      'admin.permissions.assign',
    ],
  },
  {
    id: 'tpl.hr',
    name: ROLE_LABEL_VI.HR_ADMIN,
    linkedRole: 'HR_ADMIN',
    permissionIds: [
      'home.view',
      'dashboard.view',
      'hr.employees.view',
      'hr.employees.create',
      'hr.employees.edit',
      'hr.employees.deactivate',
      'hr.dept.view',
      'exam.view',
    ],
  },
  {
    id: 'tpl.teacher',
    name: ROLE_LABEL_VI.TEACHER,
    linkedRole: 'TEACHER',
    permissionIds: ['home.view', 'teacher.classes.view', 'teacher.grade', 'exam.view'],
  },
  {
    id: 'tpl.bod',
    name: ROLE_LABEL_VI.BOD,
    linkedRole: 'BOD',
    permissionIds: [
      'home.view',
      'bod.dashboard.view',
      'bod.ranking.view',
      'bod.comparison.view',
      'hr.employees.view',
      'admin.permissions.assign',
    ],
  },
]

export function getTemplateById(id: string): RoleTemplate | undefined {
  return ROLE_TEMPLATES.find((t) => t.id === id)
}

export function getTemplateByLinkedRole(role: Role): RoleTemplate | undefined {
  return ROLE_TEMPLATES.find((t) => t.linkedRole === role)
}
