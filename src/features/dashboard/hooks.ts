import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from './api'
import { dashboardKeys } from './queryKeys'

export function useMyDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dashboardKeys.me(),
    queryFn: () => dashboardApi.me(),
    enabled: options?.enabled ?? true,
  })
}

export function useLearningOpsSummary(
  year: number,
  startMonth: number,
  endMonth: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: dashboardKeys.learningOpsSummary(year, startMonth, endMonth),
    queryFn: () => dashboardApi.learningOpsSummary(year, startMonth, endMonth),
    enabled: options?.enabled ?? true,
  })
}
