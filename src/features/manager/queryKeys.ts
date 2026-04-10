export const managerKeys = {
  all: ['manager'] as const,
  teamProgress: (teamId?: string) =>
    [...managerKeys.all, 'team-progress', teamId ?? 'all'] as const,
  approvals: () => [...managerKeys.all, 'approvals'] as const,
  kpiMonthly: (month: string) => [...managerKeys.all, 'kpi', month] as const,
  classes: (params?: { search?: string; levelFrom?: string; status?: string }) =>
    [
      ...managerKeys.all,
      'classes',
      params?.search ?? '',
      params?.levelFrom ?? '',
      params?.status ?? '',
    ] as const,
  classMemberOptions: (query: string, levelFrom?: string, excludeUserId?: string) =>
    [
      ...managerKeys.all,
      'class-member-options',
      query,
      levelFrom ?? '',
      excludeUserId ?? '',
    ] as const,
  roadmapItems: (params?: { levelLabel?: string; topic?: string; q?: string }) =>
    [
      ...managerKeys.all,
      'roadmap-items',
      params?.levelLabel ?? '',
      params?.topic ?? '',
      params?.q ?? '',
    ] as const,
  classSchedules: (classId: string) => [...managerKeys.all, 'class-schedules', classId] as const,
}
