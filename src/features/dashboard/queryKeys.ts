import type { OverviewHrFilter } from './api'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  me: () => [...dashboardKeys.all, 'me'] as const,
  overviewSummary: (year: number, startMonth: number, endMonth: number, filter: OverviewHrFilter) =>
    [...dashboardKeys.all, 'overview-summary', year, startMonth, endMonth, filter] as const,
}
