import { useQuery } from '@tanstack/react-query'
import { DEFAULT_OVERVIEW_HR_FILTER, dashboardApi, type OverviewHrFilter } from './api'
import { dashboardKeys } from './queryKeys'

export function useMyDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dashboardKeys.me(),
    queryFn: () => dashboardApi.me(),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    refetchInterval: () => (document.visibilityState === 'visible' ? 120_000 : false),
  })
}

/** Giữ số liệu kỳ trước trong lúc tải kỳ mới — không nháy skeleton khi đổi bộ lọc. */
export function useOverviewSummary(
  year: number,
  startMonth: number,
  endMonth: number,
  filter: OverviewHrFilter = DEFAULT_OVERVIEW_HR_FILTER,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: dashboardKeys.overviewSummary(year, startMonth, endMonth, filter),
    queryFn: () => dashboardApi.overviewSummary(year, startMonth, endMonth, filter),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}
