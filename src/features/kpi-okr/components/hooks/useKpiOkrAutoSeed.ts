import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { performanceApi, type PerformanceAssignment } from '@/features/kpi-okr/api'
import { getApiErrorMessage } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import {
  MANDATORY_METRICS_BY_TEMPLATE,
  REMOVED_TRAFFIC_MANDATORY_METRICS,
} from '@/features/kpi-okr/catalogHelpers'

/**
 * Auto-seed + cleanup effects for KpiOkrWorkspace.
 * Extracted from KpiOkrWorkspace.tsx.
 *
 * Three effects:
 * 1. Seed mandatory metrics if missing (kinh doanh + traffic teams)
 * 2. Cleanup removed mandatory metrics (traffic teams only)
 * 3. Seed template metrics configured by manager (any team type)
 */
export function useKpiOkrAutoSeed(params: {
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
  const {
    selectedTeamId,
    year,
    month,
    loadingThis,
    assignmentsThisMonth,
    isKinhDoanhTeam,
    isTrafficTeamSelected,
    canEditTeam,
    selectedTemplateCode,
    assignKey,
    templateQ,
  } = params

  const qc = useQueryClient()
  const periodKey = `${selectedTeamId}|${year}|${month}`

  const autoSeedDoneRef = useRef<Set<string>>(new Set())
  const cleanupDoneRef = useRef<Set<string>>(new Set())
  const templateSeedDoneRef = useRef<Set<string>>(new Set())

  const mandatoryList = MANDATORY_METRICS_BY_TEMPLATE[selectedTemplateCode] ?? []

  // 1. Seed mandatory metrics if missing
  useEffect(() => {
    if (
      !selectedTeamId ||
      loadingThis ||
      !canEditTeam ||
      isMockApiEnabled() ||
      !(isKinhDoanhTeam || isTrafficTeamSelected) ||
      !mandatoryList.length ||
      autoSeedDoneRef.current.has(periodKey)
    )
      return

    const presentContents = new Set(assignmentsThisMonth.map((a) => a.content))
    const missing = mandatoryList.filter((m) => !presentContents.has(m))
    if (!missing.length) return

    autoSeedDoneRef.current.add(periodKey)
    void Promise.all(
      missing.map((content) =>
        performanceApi.cascadeAddAssignment(selectedTeamId, {
          year,
          month,
          content,
          kind: 'KPI' as const,
          priority: 1,
          category: 'KPI_BONUS',
        })
      )
    )
      .then(() => {
        void qc.invalidateQueries({ queryKey: assignKey })
      })
      .catch((err: unknown) => {
        autoSeedDoneRef.current.delete(periodKey)
        toast.error('Không thể khởi tạo chỉ số cố định: ' + getApiErrorMessage(err))
      })
  }, [
    selectedTeamId,
    year,
    month,
    loadingThis,
    assignmentsThisMonth,
    mandatoryList,
    isKinhDoanhTeam,
    isTrafficTeamSelected,
    canEditTeam,
    periodKey,
    qc,
    assignKey,
  ])

  // 2. Cleanup removed mandatory metrics (traffic teams only)
  useEffect(() => {
    if (
      !selectedTeamId ||
      loadingThis ||
      !canEditTeam ||
      isMockApiEnabled() ||
      !isTrafficTeamSelected ||
      cleanupDoneRef.current.has(periodKey)
    )
      return

    const presentContents = new Set(assignmentsThisMonth.map((a) => a.content))
    const toRemove = (REMOVED_TRAFFIC_MANDATORY_METRICS as readonly string[]).filter((m) =>
      presentContents.has(m)
    )
    if (!toRemove.length) return

    cleanupDoneRef.current.add(periodKey)
    void Promise.all(
      toRemove.map((content) =>
        performanceApi.cascadeDeleteByContent(selectedTeamId, { year, month, content })
      )
    )
      .then(() => {
        void qc.invalidateQueries({ queryKey: assignKey })
      })
      .catch(() => {
        cleanupDoneRef.current.delete(periodKey)
      })
  }, [
    selectedTeamId,
    year,
    month,
    loadingThis,
    assignmentsThisMonth,
    isTrafficTeamSelected,
    canEditTeam,
    periodKey,
    qc,
    assignKey,
  ])

  // 3. Seed template metrics (custom metrics configured by manager)
  useEffect(() => {
    const templates = templateQ.data ?? []
    if (
      !selectedTeamId ||
      loadingThis ||
      !canEditTeam ||
      isMockApiEnabled() ||
      templateQ.isLoading ||
      !templates.length ||
      templateSeedDoneRef.current.has(periodKey)
    )
      return

    const presentContents = new Set(assignmentsThisMonth.map((a) => a.content))
    const missing = templates.filter((t) => !presentContents.has(t.content))
    if (!missing.length) return

    templateSeedDoneRef.current.add(periodKey)
    void Promise.all(
      missing.map((tmpl) =>
        performanceApi.cascadeAddAssignment(selectedTeamId, {
          year,
          month,
          content: tmpl.content,
          kind: tmpl.kind as 'KPI' | 'OKR',
          priority: tmpl.priority,
          category: tmpl.category,
          targetMetric: tmpl.targetMetric,
          numericUnit: tmpl.numericUnit,
        })
      )
    )
      .then(() => void qc.invalidateQueries({ queryKey: assignKey }))
      .catch(() => {
        templateSeedDoneRef.current.delete(periodKey)
      })
  }, [
    selectedTeamId,
    year,
    month,
    loadingThis,
    templateQ.isLoading,
    templateQ.data,
    assignmentsThisMonth,
    canEditTeam,
    periodKey,
    qc,
    assignKey,
  ])
}
