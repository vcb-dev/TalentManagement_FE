import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/features/dashboard/api'
import { dashboardKeys } from '@/features/dashboard/queryKeys'

export function useMyDashboard() {
  return useQuery({
    queryKey: dashboardKeys.me(),
    queryFn: () => dashboardApi.me(),
  })
}

