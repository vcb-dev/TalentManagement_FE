export const managerKeys = {
  all: ['manager'] as const,
  teamProgress: (teamId?: string) => [...managerKeys.all, 'team-progress', teamId ?? 'all'] as const,
  approvals: () => [...managerKeys.all, 'approvals'] as const,
  kpiMonthly: (month: string) => [...managerKeys.all, 'kpi', month] as const,
}
