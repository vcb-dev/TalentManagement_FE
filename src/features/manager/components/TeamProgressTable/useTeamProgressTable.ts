import { useTeamProgress } from '@/features/manager/hooks'

export function useTeamProgressTable(teamId?: string) {
  const q = useTeamProgress(teamId)
  return { page: q.data, isLoading: q.isLoading }
}
