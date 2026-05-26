import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  performanceApi,
  type PerformanceAssignment,
  type PerformanceSummaryRow,
} from '@/features/kpi-okr/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useAuthStore } from '@/stores/auth.store'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'

/**
 * Centralized data-fetching hook for KpiOkrWorkspace.
 * Extracted from KpiOkrWorkspace.tsx to keep the component lean and avoid re-renders.
 */
export function useKpiOkrData(
  selectedTeamId: string | null,
  year: number,
  month: number,
  prevYear: number,
  prevMonth: number
) {
  const user = useAuthStore((s) => s.user)
  const eff = useMemo(() => {
    if (!user) return { has: () => false }
    return resolveEffectivePermissionSet(user)
  }, [user])

  const assignKey = ['kpi-assignments', selectedTeamId, year, month] as const
  const assignPrevKey = ['kpi-assignments-prev', selectedTeamId, prevYear, prevMonth] as const
  const sumKey = ['kpi-summaries', selectedTeamId, year, month] as const

  const assignmentsQ = useQuery({
    queryKey: assignKey,
    queryFn: () =>
      selectedTeamId
        ? performanceApi.listAssignments(selectedTeamId, year, month)
        : Promise.resolve([] as PerformanceAssignment[]),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })

  const assignmentsPrevQ = useQuery({
    queryKey: assignPrevKey,
    queryFn: () =>
      selectedTeamId
        ? performanceApi.listAssignments(selectedTeamId, prevYear, prevMonth)
        : Promise.resolve([] as PerformanceAssignment[]),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })

  const summariesQ = useQuery({
    queryKey: sumKey,
    queryFn: () =>
      selectedTeamId
        ? performanceApi.listSummaries(selectedTeamId, year, month)
        : Promise.resolve([] as PerformanceSummaryRow[]),
    enabled: Boolean(selectedTeamId) && !isMockApiEnabled(),
  })

  const windowConfigsQ = useQuery({
    queryKey: ['performance', 'window-configs'],
    queryFn: () => performanceApi.listWindowConfigs(),
    staleTime: 60_000,
    enabled: !isMockApiEnabled(),
  })

  const catalogAllowlistQ = useQuery({
    queryKey: ['performance', 'catalog-division-allowlist'],
    queryFn: () => performanceApi.getCatalogDivisionAllowlist(),
    staleTime: 60_000,
    enabled: !isMockApiEnabled(),
  })

  // Template chỉ số tùy chỉnh do manager cấu hình — dùng để auto-seed tháng mới
  const canEditTeam = useMemo(() => Boolean(user?.id) && eff.has('kpi.edit_team'), [user?.id, eff])

  const templateQ = useQuery({
    queryKey: ['team-metric-templates', selectedTeamId],
    queryFn: () => performanceApi.listTeamMetricTemplates(selectedTeamId!),
    enabled: !!selectedTeamId && !isMockApiEnabled() && canEditTeam,
    staleTime: 60_000,
  })

  return {
    user,
    eff,
    assignKey,
    assignPrevKey,
    sumKey,
    assignmentsQ,
    assignmentsPrevQ,
    summariesQ,
    windowConfigsQ,
    catalogAllowlistQ,
    templateQ,
    canEditTeam,
  }
}
