export const dashboardKeys = {
  all: ['dashboard'] as const,
  me: () => [...dashboardKeys.all, 'me'] as const,
  learningOpsSummary: (year: number, startMonth: number, endMonth: number) =>
    [...dashboardKeys.all, 'learning-ops-summary', year, startMonth, endMonth] as const,
}
