export const managerKeys = {
  all: ['manager'] as const,
  teamProgress: (teamId?: string) => [...managerKeys.all, 'team-progress', teamId ?? 'all'] as const,
  approvals: () => [...managerKeys.all, 'approvals'] as const,
  kpiMonthly: (month: string) => [...managerKeys.all, 'kpi', month] as const,
  classes: (params?: { search?: string; levelFrom?: string; status?: string }) =>
    [...managerKeys.all, 'classes', params?.search ?? '', params?.levelFrom ?? '', params?.status ?? ''] as const,
  classMemberOptions: (query: string, levelFrom?: string) =>
    [...managerKeys.all, 'class-member-options', query, levelFrom ?? ''] as const,
}
