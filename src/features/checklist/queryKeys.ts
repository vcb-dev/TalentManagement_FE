export const checklistKeys = {
  all: ['checklists'] as const,
  mine: () => [...checklistKeys.all, 'mine'] as const,
  leaderEmployees: () => [...checklistKeys.all, 'leader', 'employees'] as const,
  leaderEmployee: (employeeId: string) =>
    [...checklistKeys.all, 'leader', 'employee', employeeId] as const,
  templates: () => [...checklistKeys.all, 'templates'] as const,
  template: (id: string) => [...checklistKeys.all, 'template', id] as const,
  templateResponses: (id: string) => [...checklistKeys.all, 'template', id, 'responses'] as const,
  employee: (employeeId: string) => [...checklistKeys.all, 'employee', employeeId] as const,
}
