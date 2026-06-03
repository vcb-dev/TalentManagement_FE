import type { PerformanceAssignment } from '@/features/kpi-okr/api'

/**
 * Auto-seed is intentionally disabled.
 *
 * KPI/OKR rows should only be created by explicit user actions such as
 * "Tự seed catalog", import, or manual add. Keeping this hook as a no-op
 * preserves existing callers while preventing hidden writes when a leader
 * merely opens the workspace.
 */
export function useKpiOkrAutoSeed(_params: {
  selectedTeamId: string | null
  year: number
  month: number
  loadingThis: boolean
  assignmentsThisMonth: PerformanceAssignment[]
  isKinhDoanhTeam: boolean
  isTrafficTeamSelected: boolean
  canEditTeam: boolean
  selectedTemplateCode: string
  assignKey: readonly [string, string | null, number, number]
  templateQ: {
    isLoading: boolean
    data:
      | {
          content: string
          kind: string
          priority: number
          category?: string | null
          targetMetric?: string | null
          numericUnit?: string | null
        }[]
      | undefined
  }
}) {
  return
}
