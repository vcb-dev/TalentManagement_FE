export const kpiQueryKeys = {
  assignments: (teamId: string | null, year: number, month: number) =>
    ['kpi-assignments', teamId, year, month] as const,
  allAssignments: () => ['kpi-assignments'] as const,
  allSummaries: () => ['kpi-summaries'] as const,
}
