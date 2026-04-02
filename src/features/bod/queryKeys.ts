export const bodKeys = {
  all: ['bod'] as const,
  dashboard: () => [...bodKeys.all, 'dashboard'] as const,
  radar: (departmentId?: string) => [...bodKeys.all, 'radar', departmentId ?? 'all'] as const,
  headcount: () => [...bodKeys.all, 'headcount'] as const,
}
