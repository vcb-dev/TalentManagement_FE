import { useQuery } from '@tanstack/react-query'
import { profileApi } from '@/features/profile/api'
import { profileKeys } from '@/features/profile/queryKeys'

export function useMyProfilePage() {
  return useQuery({
    queryKey: profileKeys.page(),
    queryFn: () => profileApi.getPage(),
  })
}
