export const dashboardKeys = {
  all: ['dashboard'] as const,
  me: () => [...dashboardKeys.all, 'me'] as const,
  overviewSummary: (year: number, startMonth: number, endMonth: number) =>
    [...dashboardKeys.all, 'overview-summary', year, startMonth, endMonth] as const,
}
