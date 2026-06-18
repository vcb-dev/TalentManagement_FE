import type { PerformanceAssignmentSubItem } from '@/features/kpi-okr/api'

// ── Types ──

export type SubItemDraft = {
  id?: string
  label: string
  targetMetric: string
  numericUnit: string
  weight: number
  numericValue: number | null
  selfEvalStatus: string | null
  selfReviewNote: string | null
}

export const emptySubItemLine: SubItemDraft = {
  label: '',
  targetMetric: '',
  numericUnit: '',
  weight: 1,
  numericValue: null,
  selfEvalStatus: null,
  selfReviewNote: null,
}

// ── Progress helpers ──

/**
 * Compute overall progress % for a KPI row.
 * If `numericValue` and `targetMetric` are both present and target is numeric,
 * derive progress from them; otherwise fall back to the stored `progressPercent`.
 */
export function computeRowProgress(
  numericValue: number | null,
  targetMetric: string | null,
  progressPercent: number
): number | undefined {
  if (numericValue != null && targetMetric?.trim()) {
    const target = parseFloat(targetMetric)
    if (!Number.isNaN(target) && target > 0) {
      return Math.min(Math.round((numericValue / target) * 100), 100)
    }
  }
  if (progressPercent != null) return Math.min(progressPercent, 100)
  return undefined
}

/**
 * Compute progress for a single sub-item row.
 */
export function computeSubItemProgress(
  sub: Pick<PerformanceAssignmentSubItem, 'numericValue' | 'targetMetric'>
): number | undefined {
  if (sub.numericValue != null && sub.targetMetric?.trim()) {
    const target = parseFloat(sub.targetMetric)
    if (!Number.isNaN(target) && target > 0) {
      return Math.min(Math.round((sub.numericValue / target) * 100), 100)
    }
  }
  return undefined
}

/**
 * Weighted average progress across sub-items.
 * Returns null if none of the sub-items have computable progress.
 */
export function computeWeightedProgressFromSubItems(
  subs: PerformanceAssignmentSubItem[]
): number | null {
  if (!subs.length) return null
  let totalWeight = 0
  let weightedSum = 0
  let anyValid = false

  for (const sub of subs) {
    const p = computeSubItemProgress(sub)
    const w = sub.weight ?? 1
    if (p != null) {
      weightedSum += p * w
      totalWeight += w
      anyValid = true
    }
  }

  if (!anyValid || totalWeight === 0) return null
  return Math.round(weightedSum / totalWeight)
}
