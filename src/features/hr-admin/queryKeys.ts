import type { EmployeeFilters } from './types'

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: EmployeeFilters) => [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  detailByID: () => [...employeeKeys.all, 'detailByID'] as const,
  detailEmployeeByID: (id: string) => [...employeeKeys.detailByID(), id] as const,
  loginCredential: (id: string) => [...employeeKeys.all, 'login-credential', id] as const,
  orgChanges: (id: string) => [...employeeKeys.all, 'org-changes', id] as const,
  /** STT phụ thuộc cả người cùng nhóm — đổi ai cũng phải làm mới cả nhóm key này. */
  orderNumbers: () => [...employeeKeys.all, 'order-number'] as const,
  orderNumber: (id: string) => [...employeeKeys.orderNumbers(), id] as const,
  attachmentPreview: (id: string, field: string, objectPath: string) =>
    [...employeeKeys.all, 'attachment-preview', id, field, objectPath] as const,
  projects: (id: string) => [...employeeKeys.all, 'projects', id] as const,
}

export const employeeCardColorKeys = {
  all: ['employee-card-colors'] as const,
}

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  members: (projectId: string) => [...projectKeys.all, 'members', projectId] as const,
}
