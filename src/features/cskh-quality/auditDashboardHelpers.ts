import type { AuditComparisonStats, CskhAuditRow } from './api'
import {
  displayAgentName,
  parseAuditActionItems,
  parseBulletLines,
  type DisplayTranscriptLine,
} from './auditHelpers'

export const AUDIT_CRITERIA = [
  { id: 'greeting', label: 'Chào hỏi, thiện cảm', max: 20, icon: '👋' },
  { id: 'needs', label: 'Khai thác nhu cầu', max: 20, icon: '🔍' },
  { id: 'consult', label: 'Tư vấn, giải đáp', max: 20, icon: '💬' },
  { id: 'objection', label: 'Xử lý từ chối / thắc mắc', max: 20, icon: '🛡️' },
  { id: 'closing', label: 'Kết thúc, CS sau bán', max: 20, icon: '✅' },
] as const

export type AuditCriterionScore = {
  id: string
  label: string
  max: number
  score: number
  icon: string
  source: 'ai' | 'legacy'
}

export type AuditSentimentView = {
  label: string
  customer: string
  staff: string
  tone: 'positive' | 'neutral' | 'negative'
  source: 'ai' | 'legacy'
}

export type AuditTranscriptMetricsView = {
  firstResponseSec: number | null
  staffReplies: number
  customerMessages: number
  proactivePct: number
  source: 'be' | 'fe'
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Fallback cho audit cũ (trước khi AI trả criteria_scores). */
function legacyEstimateCriteriaScores(row: CskhAuditRow): AuditCriterionScore[] {
  const total = clamp(row.score, 0, 100)
  const base = total / 5
  const issues = parseAuditActionItems(row)
    .map((i) => i.issue.toLowerCase())
    .join(' ')

  const hints: Record<string, RegExp[]> = {
    greeting: [/chào|xưng hô|dạ|vâng/i],
    needs: [/khai thác|nhu cầu|báo giá.*sớm/i],
    consult: [/tư vấn|giải đáp|chất liệu/i],
    objection: [/từ chối|thắc mắc/i],
    closing: [/kết thúc|cta|chốt|follow/i],
  }

  const raw = AUDIT_CRITERIA.map((c) => {
    let penalty = 0
    for (const re of hints[c.id] ?? []) {
      if (re.test(issues)) penalty += 2.5
    }
    if (row.metadata?.staffAbsent && (c.id === 'greeting' || c.id === 'consult')) penalty += 8
    return { ...c, score: clamp(Math.round(base - penalty), 0, c.max), source: 'legacy' as const }
  })

  const sum = raw.reduce((a, c) => a + c.score, 0)
  const diff = total - sum
  if (diff !== 0 && raw.length > 0) {
    let bestIdx = 0
    for (let i = 1; i < raw.length; i++) {
      if (raw[i]!.score > raw[bestIdx]!.score) bestIdx = i
    }
    const item = raw[bestIdx]!
    raw[bestIdx] = { ...item, score: clamp(item.score + diff, 0, item.max) }
  }
  return raw
}

/** Điểm 5 tiêu chí — ưu tiên metadata từ AI/BE. */
export function resolveCriteriaScores(row: CskhAuditRow): AuditCriterionScore[] {
  const cs = row.metadata?.criteriaScores
  if (cs && typeof cs === 'object') {
    const mapped: AuditCriterionScore[] = AUDIT_CRITERIA.map((c) => {
      const key = c.id as keyof typeof cs
      const scoreVal = cs[key]
      const score =
        scoreVal == null || Number.isNaN(Number(scoreVal)) ? 0 : clamp(Number(scoreVal), 0, c.max)
      return { ...c, score, source: 'ai' as const }
    })
    if (mapped.every((m) => m.score >= 0)) return mapped
  }
  return legacyEstimateCriteriaScores(row)
}

export function scoreRankLabel(score: number): { label: string; stars: number; passed: boolean } {
  if (score >= 80) return { label: 'Tốt', stars: 4.5, passed: true }
  if (score >= 70) return { label: 'Khá', stars: 4, passed: true }
  if (score >= 50) return { label: 'Trung bình', stars: 3, passed: false }
  return { label: 'Cần cải thiện', stars: 2, passed: false }
}

export function criterionBarColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.85) return 'bg-emerald-500'
  if (pct >= 0.65) return 'bg-amber-400'
  return 'bg-rose-500'
}

export function resolveComparisonAverages(
  comparison: AuditComparisonStats | undefined,
  row: CskhAuditRow,
  allAudits: CskhAuditRow[]
): { staff: number; team: number; overall: number; source: 'be' | 'fe' } {
  if (comparison) {
    return {
      staff: comparison.staff,
      team: comparison.team,
      overall: comparison.overall,
      source: 'be',
    }
  }

  const scores = allAudits.map((a) => a.score).filter((s) => s >= 0)
  const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const agent = displayAgentName(row)
  const staffRows = allAudits.filter((a) => displayAgentName(a) === agent && agent !== '—')
  const staff = staffRows.length
    ? Math.round(staffRows.reduce((a, b) => a + b.score, 0) / staffRows.length)
    : row.score
  const pageName = row.metadata?.pageName
  const teamRows = pageName ? allAudits.filter((a) => a.metadata?.pageName === pageName) : allAudits
  const team = teamRows.length
    ? Math.round(teamRows.reduce((a, b) => a + b.score, 0) / teamRows.length)
    : overall

  return { staff, team, overall, source: 'fe' }
}

export function resolveProsCons(row: CskhAuditRow): {
  pros: string[]
  cons: string[]
  source: 'ai' | 'legacy'
} {
  const strengths = row.metadata?.strengths?.filter(Boolean)
  const weaknesses = row.metadata?.weaknesses?.filter(Boolean)
  if (strengths?.length || weaknesses?.length) {
    return {
      pros: strengths ?? [],
      cons: weaknesses ?? [],
      source: 'ai',
    }
  }

  const lines = parseBulletLines(row.feedback)
  const negativeRe = /cần cải thiện|thiếu|chưa|không|vi phạm|yếu|kém|chưa rep|bỏ sót/i
  const pros: string[] = []
  const cons: string[] = []
  for (const line of lines) {
    if (negativeRe.test(line)) cons.push(line)
    else pros.push(line)
  }
  for (const issue of parseAuditActionItems(row)
    .map((i) => i.issue)
    .filter(Boolean)) {
    if (!cons.includes(issue)) cons.push(issue)
  }
  return { pros, cons, source: 'legacy' }
}

export function resolveKeywords(
  row: CskhAuditRow,
  transcript: DisplayTranscriptLine[]
): { keywords: string[]; source: 'ai' | 'legacy' } {
  const fromAi = row.metadata?.keywords?.filter(Boolean)
  if (fromAi?.length) return { keywords: fromAi, source: 'ai' }

  const stop = new Set([
    'dạ',
    'ạ',
    'em',
    'anh',
    'chị',
    'bạn',
    'mình',
    'cho',
    'với',
    'này',
    'được',
    'không',
    'có',
    'là',
    'và',
    'của',
    'nha',
    'nhé',
  ])
  const freq = new Map<string, number>()
  for (const line of transcript) {
    const words = (line.text ?? '').toLowerCase().match(/[\p{L}]{3,}/gu) ?? []
    for (const w of words) {
      if (stop.has(w)) continue
      freq.set(w, (freq.get(w) ?? 0) + 1)
    }
  }
  return {
    keywords: [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([w]) => w),
    source: 'legacy',
  }
}

export function resolveTags(row: CskhAuditRow, fromAd: boolean): string[] {
  const fromAi = row.metadata?.tags?.filter(Boolean)
  if (fromAi?.length) return fromAi
  const tags: string[] = []
  if (fromAd) tags.push('Quảng cáo')
  if (row.metadata?.needsFollowUp) tags.push('Cần follow-up')
  if (row.metadata?.staffAbsent) tags.push('Chưa rep')
  return tags
}

function computeTranscriptMetricsFe(
  transcript: DisplayTranscriptLine[]
): Omit<AuditTranscriptMetricsView, 'source'> {
  let firstCustomerAt: number | null = null
  let firstStaffAfter: number | null = null
  let staffReplies = 0
  let customerMessages = 0

  for (const line of transcript) {
    const isStaff = line.sender === 'Staff'
    const t = line.timestamp ? new Date(line.timestamp).getTime() : NaN
    if (Number.isNaN(t)) continue
    if (!isStaff) {
      customerMessages++
      if (firstCustomerAt == null) firstCustomerAt = t
    } else {
      staffReplies++
      if (firstCustomerAt != null && firstStaffAfter == null && t >= firstCustomerAt) {
        firstStaffAfter = t
      }
    }
  }

  const firstResponseSec =
    firstCustomerAt != null && firstStaffAfter != null
      ? Math.max(0, Math.round((firstStaffAfter - firstCustomerAt) / 1000))
      : null
  const total = staffReplies + customerMessages
  return {
    firstResponseSec,
    staffReplies,
    customerMessages,
    proactivePct: total > 0 ? Math.round((staffReplies / total) * 100) : 0,
  }
}

export function resolveTranscriptMetrics(
  row: CskhAuditRow,
  transcript: DisplayTranscriptLine[]
): AuditTranscriptMetricsView {
  const m = row.metadata?.transcriptMetrics
  if (m && typeof m === 'object') {
    return {
      firstResponseSec: m.firstResponseSec ?? null,
      staffReplies: m.staffReplies ?? 0,
      customerMessages: m.customerMessages ?? 0,
      proactivePct: m.proactivePct ?? 0,
      source: 'be',
    }
  }
  return { ...computeTranscriptMetricsFe(transcript), source: 'fe' }
}

export function resolveSentiment(row: CskhAuditRow): AuditSentimentView {
  const s = row.metadata?.sentiment
  if (s?.label || s?.customer || s?.staff) {
    const tone =
      s.tone === 'positive' || s.tone === 'negative' || s.tone === 'neutral' ? s.tone : 'neutral'
    return {
      label: s.label ?? 'Trung tính',
      customer: s.customer ?? '—',
      staff: s.staff ?? '—',
      tone,
      source: 'ai',
    }
  }

  const score = row.score
  if (score >= 80)
    return {
      label: 'Tích cực',
      customer: 'Hài lòng / quan tâm sản phẩm',
      staff: 'Thân thiện, chuyên nghiệp',
      tone: 'positive',
      source: 'legacy',
    }
  if (score >= 60)
    return {
      label: 'Trung tính',
      customer: 'Còn thắc mắc, chờ thêm thông tin',
      staff: 'Đáp ứng cơ bản',
      tone: 'neutral',
      source: 'legacy',
    }
  return {
    label: 'Cần chú ý',
    customer: 'Chưa được giải quyết trọn vẹn',
    staff: 'Thiếu sót trong quy trình',
    tone: 'negative',
    source: 'legacy',
  }
}

export function formatDurationSec(sec: number | null): string {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function buildTimelineEvents(
  transcript: DisplayTranscriptLine[],
  auditDayLabel: string | null
): Array<{ time: string; title: string; detail?: string }> {
  const events: Array<{ time: string; title: string; detail?: string; sort: number }> = []

  for (const line of transcript) {
    if (!line.timestamp) continue
    const d = new Date(line.timestamp)
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const isStaff = line.sender === 'Staff'
    const preview = (line.text ?? '').trim().slice(0, 80)
    events.push({
      sort: d.getTime(),
      time,
      title: isStaff ? 'Nhân viên phản hồi' : 'Khách gửi tin',
      detail: preview || (line.type === 'image' ? '[Ảnh]' : undefined),
    })
  }

  if (auditDayLabel) {
    events.push({
      sort: Date.now(),
      time: auditDayLabel,
      title: 'Kết thúc phạm vi audit',
      detail: 'Hết ngày được chấm điểm',
    })
  }

  return events
    .sort((a, b) => a.sort - b.sort)
    .map(({ time, title, detail }) => ({ time, title, detail }))
}

export function conversationIndexLabel(index: number, total: number): string {
  return `#${index}/${total}`
}

export function sidebarPreviewTime(row: CskhAuditRow): string {
  const transcript = Array.isArray(row.transcript) ? row.transcript : []
  const last = [...transcript].reverse().find((l) => l.timestamp)
  if (last?.timestamp) {
    return new Date(last.timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return new Date(row.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
