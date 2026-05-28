import type { CskhAuditRow } from './api'
import { resolveCriteriaScores, resolveCustomerSentimentBreakdown } from './auditDashboardHelpers'

export type WorkspaceKpiSnapshot = {
  total: number
  avgScore: number | null
  csatPct: number | null
  standardPct: number | null
  missedPct: number | null
  followUpPct: number | null
  negativePct: number | null
  closingPct: number | null
  scoreSpark: number[]
}

function pct(n: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((n / total) * 1000) / 10
}

function isMissed(row: CskhAuditRow): boolean {
  const m = row.metadata
  return Boolean(m?.noReply || m?.staffAbsent || m?.needsFollowUp)
}

function isFollowUpOk(row: CskhAuditRow): boolean {
  const m = row.metadata
  if (m?.noReply || m?.staffAbsent) return false
  if (m?.needsFollowUp) return false
  const staffReplies = m?.transcriptMetrics?.staffReplies ?? 0
  return staffReplies > 0 || row.score >= 60
}

function isNegativeCustomer(row: CskhAuditRow): boolean {
  const tone = row.metadata?.sentiment?.tone
  if (tone === 'negative') return true
  const label = (row.metadata?.sentiment?.label ?? '').toLowerCase()
  return /tiêu cực|cần chú ý|negative|khó chịu|bực/i.test(label)
}

function isClosing(row: CskhAuditRow): boolean {
  const closing = row.metadata?.criteriaScores?.closing
  if (closing != null && closing >= 14) return true
  const tags = row.metadata?.tags ?? []
  if (tags.some((t) => /chốt|đặt hàng|mua|thanh toán|cọc/i.test(t))) return true
  const fb = `${row.feedback ?? ''}`.toLowerCase()
  return /chốt|đặt hàng|đã mua|cọc|thanh toán/i.test(fb)
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10))
}

/** "Phản hồi đúng chuẩn" ưu tiên theo criteria, fallback theo transcript metrics. */
function calcStandardPct(row: CskhAuditRow): number {
  const criteria = resolveCriteriaScores(row)
  const criteriaTotal = criteria.reduce((a, c) => a + c.score, 0)
  const criteriaMax = criteria.reduce((a, c) => a + c.max, 0)
  if (criteriaMax > 0) return clampPct((criteriaTotal / criteriaMax) * 100)

  const m = row.metadata?.transcriptMetrics
  if (!m) return 0
  const responseScore =
    m.firstResponseSec == null
      ? 65
      : m.firstResponseSec <= 60
        ? 100
        : m.firstResponseSec <= 180
          ? 80
          : 55
  const proactive = m.proactivePct ?? 60
  const replyScore = Math.min(100, (m.staffReplies ?? 0) * 20)
  return clampPct(responseScore * 0.45 + proactive * 0.35 + replyScore * 0.2)
}

/** "Follow-up" dựa trên proactive + cờ needsFollowUp/noReply/staffAbsent, không dùng QA score. */
function calcFollowUpPct(row: CskhAuditRow): number {
  const m = row.metadata
  const tm = m?.transcriptMetrics
  if (m?.noReply || m?.staffAbsent) return 0
  const proactiveBase =
    tm?.proactivePct != null ? clampPct(tm.proactivePct) : tm?.staffReplies ? 80 : 40
  if (m?.needsFollowUp) return clampPct(proactiveBase * 0.4)
  return clampPct(60 + proactiveBase * 0.4)
}

function buildCriteriaSpark(row: CskhAuditRow, buckets = 8): number[] {
  const criteria = resolveCriteriaScores(row)
  if (criteria.length >= 3) {
    const pts = criteria.map((c) => Math.round((c.score / c.max) * 100))
    while (pts.length < buckets) pts.push(pts[pts.length - 1] ?? row.score)
    return pts.slice(0, buckets)
  }
  const s = row.score
  return Array.from({ length: buckets }, (_, i) => Math.max(0, Math.min(100, s + (i - 4) * 2)))
}

function buildScoreSpark(rows: CskhAuditRow[], buckets = 8): number[] {
  if (!rows.length) return [0, 0, 0, 0, 0, 0, 0, 0]
  const sorted = [...rows].sort((a, b) => a.score - b.score)
  const out: number[] = []
  const size = Math.max(1, Math.ceil(sorted.length / buckets))
  for (let i = 0; i < buckets; i++) {
    const slice = sorted.slice(i * size, (i + 1) * size)
    if (!slice.length) {
      out.push(out[out.length - 1] ?? sorted[0]?.score ?? 0)
      continue
    }
    out.push(Math.round(slice.reduce((s, r) => s + r.score, 0) / slice.length))
  }
  return out
}

export function computeWorkspaceKpiSnapshot(rows: CskhAuditRow[]): WorkspaceKpiSnapshot {
  const total = rows.length
  if (!total) {
    return {
      total: 0,
      avgScore: null,
      csatPct: null,
      standardPct: null,
      missedPct: null,
      followUpPct: null,
      negativePct: null,
      closingPct: null,
      scoreSpark: [0, 0, 0, 0, 0, 0, 0, 0],
    }
  }

  const sum = rows.reduce((s, r) => s + r.score, 0)
  const csatN = rows.filter((r) => r.score >= 80).length
  const standardN = rows.filter((r) => r.score >= 70).length
  const missedN = rows.filter(isMissed).length
  const followN = rows.filter(isFollowUpOk).length
  const negN = rows.filter(isNegativeCustomer).length
  const closeN = rows.filter(isClosing).length

  return {
    total,
    avgScore: Math.round(sum / total),
    csatPct: pct(csatN, total),
    standardPct: pct(standardN, total),
    missedPct: pct(missedN, total),
    followUpPct: pct(followN, total),
    negativePct: pct(negN, total),
    closingPct: pct(closeN, total),
    scoreSpark: buildScoreSpark(rows),
  }
}

/** KPI 7 thẻ — theo đúng hội thoại đang chọn (dữ liệu audit thật). */
export function computeConversationKpiSnapshot(row: CskhAuditRow): WorkspaceKpiSnapshot {
  const breakdown = resolveCustomerSentimentBreakdown(row)
  const criteria = resolveCriteriaScores(row)
  const standardPct = calcStandardPct(row)

  const closingCrit = criteria.find((c) => c.id === 'closing')
  const closingPct = closingCrit
    ? Math.round((closingCrit.score / closingCrit.max) * 1000) / 10
    : null

  const followUpPct = calcFollowUpPct(row)

  return {
    total: 1,
    avgScore: row.score,
    csatPct: breakdown.positive,
    standardPct,
    missedPct: isMissed(row) ? 100 : 0,
    followUpPct,
    negativePct: breakdown.negative,
    closingPct,
    scoreSpark: buildCriteriaSpark(row),
  }
}

export function auditDayMinusOne(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function formatKpiDelta(
  current: number | null,
  previous: number | null,
  /** true = higher is better (e.g. CSAT); false = lower is better (e.g. missed rate) */
  higherIsBetter: boolean,
  unit: '%' | 'điểm' = '%'
): { text: string; tone: 'up-good' | 'up-bad' | 'neutral' } | null {
  if (current == null || previous == null) return null
  const diff = Math.round((current - previous) * 10) / 10
  if (Math.abs(diff) < 0.05) return { text: '— 0', tone: 'neutral' }
  const up = diff > 0
  const good = higherIsBetter ? up : !up
  const arrow = up ? '↑' : '↓'
  const abs = Math.abs(diff)
  const n = Number.isInteger(abs) ? String(abs) : abs.toFixed(1)
  const suffix = unit === 'điểm' ? `${n} điểm` : `${n}%`
  return {
    text: `${arrow} ${suffix}`,
    tone: good ? 'up-good' : 'up-bad',
  }
}
