import { useQuery } from '@tanstack/react-query'
import { bodApi } from './api'
import { bodKeys } from './queryKeys'

export function useBodDashboard() {
  return useQuery({
    queryKey: bodKeys.dashboard(),
    queryFn: () => bodApi.dashboard(),
  })
}

export function useBodRadar(departmentId?: string) {
  return useQuery({
    queryKey: bodKeys.radar(departmentId),
    queryFn: () => bodApi.radar(departmentId),
  })
}

export function useBodHeadcount() {
  return useQuery({
    queryKey: bodKeys.headcount(),
    queryFn: () => bodApi.headcount(),
  })
}
