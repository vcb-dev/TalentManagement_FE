/** Parse số từ chuỗi chỉ tiêu (vd: "20 dashboard", "100%"). */
export function parseNumericFromMetric(s: string | null | undefined): number | null {
  if (!s?.trim()) return null
  const cleaned = s
    .trim()
    .replace(/[^\d.,-]/g, '')
    .replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Tiến độ % từ actual vs target (0–100). */
export function computeRowProgress(
  numericValue: number | null | undefined,
  targetMetric: string | null | undefined,
  fallbackPercent?: number | null
): number | null {
  const target = parseNumericFromMetric(targetMetric)
  if (numericValue != null && target != null && target > 0) {
    return Math.min(100, Math.max(0, Math.round((numericValue / target) * 100)))
  }
  if (fallbackPercent != null && Number.isFinite(fallbackPercent)) {
    return Math.min(100, Math.max(0, Math.round(fallbackPercent)))
  }
  return null
}

export function computeSubItemProgress(sub: {
  targetMetric?: string | null
  numericValue?: number | null
  selfEvalStatus?: string | null
}): number {
  const p = computeRowProgress(sub.numericValue ?? null, sub.targetMetric ?? null)
  if (p != null) return p
  if (sub.selfEvalStatus === 'OK') return 100
  if (sub.selfEvalStatus === 'NOT') return 0
  return 0
}

/** Tiến độ KPI cha = trung bình có trọng số từ các mục con (đồng bộ BE). */
export function computeWeightedProgressFromSubItems(
  subItems: Array<{
    weight?: number
    targetMetric?: string | null
    numericValue?: number | null
    selfEvalStatus?: string | null
  }>
): number | null {
  if (!subItems.length) return null
  let totalWeight = 0
  let weightedSum = 0
  for (const s of subItems) {
    const w = Math.max(0, s.weight ?? 0)
    if (w <= 0) continue
    totalWeight += w
    weightedSum += w * computeSubItemProgress(s)
  }
  if (totalWeight <= 0) return null
  return Math.min(100, Math.max(0, Math.round(weightedSum / totalWeight)))
}

export type SubItemDraft = {
  label: string
  targetMetric: string
  numericUnit: string
  weight: number
}

export function emptySubItemLine(): SubItemDraft {
  return { label: '', targetMetric: '', numericUnit: '', weight: 0 }
}

export const MAX_SUB_ITEMS = 10
