import type { AuditComparisonStats, CskhAuditRow, CskhCustomerIntent } from './api'
import {
  displayAgentName,
  parseAiListField,
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

/** Chuyển feedback AI thành các dòng bullet để hiển thị trong tab Phân tích chi tiết. */
export function resolveFeedbackBullets(row: CskhAuditRow): string[] {
  const feedback = row.feedback?.trim()
  if (!feedback) return []

  const lines = parseBulletLines(feedback)
  if (lines.length > 1) return lines

  const fromAi = parseAiListField(feedback)
  if (fromAi.length > 1) return fromAi

  const bySentence = feedback
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
  if (bySentence.length > 1) return bySentence

  return fromAi.length ? fromAi : lines.length ? lines : [feedback]
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

const GENERIC_KEYWORD_STOP = new Set([
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
  'ảnh',
  'nhận',
  'hàng',
  'gửi',
  'luôn',
  'còn',
  'khi',
  'chưa',
  'giúp',
  'đeo',
  'lõm',
  'lại',
  'rồi',
  'vậy',
  'nữa',
  'đó',
  'nào',
  'sao',
  'xin',
  'shop',
  'ad',
])

function isUsefulKeywordPhrase(value: string): boolean {
  const text = value.trim()
  if (text.length < 2) return false
  const lower = text.toLowerCase()
  if (GENERIC_KEYWORD_STOP.has(lower)) return false
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 1 && text.length <= 5 && !/[A-Z0-9]/.test(text)) return false
  if (words.length === 1 && GENERIC_KEYWORD_STOP.has(words[0]!.toLowerCase())) return false
  return true
}

function dedupeLabels(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const label = value.trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

export type ResolvedKeywords = {
  products: NonNullable<CskhCustomerIntent['products']>
  productMentions: string[]
  topics: string[]
  keywords: string[]
  hasData: boolean
}

export function resolveKeywords(
  row: CskhAuditRow,
  customerIntent?: CskhCustomerIntent | null
): ResolvedKeywords {
  const products = customerIntent?.products ?? []
  const productMentions = dedupeLabels(
    (customerIntent?.productMentions ?? []).filter(isUsefulKeywordPhrase)
  )
  const topics = dedupeLabels(customerIntent?.topics ?? [])
  const aiKeywords = dedupeLabels((row.metadata?.keywords ?? []).filter(isUsefulKeywordPhrase))
  const tagKeywords = dedupeLabels((row.metadata?.tags ?? []).filter(isUsefulKeywordPhrase))

  const productNames = new Set(products.map((p) => p.name.toLowerCase()))
  const mentionSet = new Set(productMentions.map((m) => m.toLowerCase()))
  const topicSet = new Set(topics.map((t) => t.toLowerCase()))

  const keywords = dedupeLabels(
    [...aiKeywords, ...tagKeywords].filter((kw) => {
      const lower = kw.toLowerCase()
      return !productNames.has(lower) && !mentionSet.has(lower) && !topicSet.has(lower)
    })
  ).slice(0, 8)

  const hasData =
    products.length > 0 || productMentions.length > 0 || topics.length > 0 || keywords.length > 0

  return {
    products,
    productMentions,
    topics,
    keywords,
    hasData,
  }
}

export function resolveTags(row: CskhAuditRow, _fromAd: boolean): string[] {
  const fromAi = row.metadata?.tags?.filter(Boolean)
  if (fromAi?.length) return fromAi

  const tags: string[] = []
  if (row.metadata?.needsFollowUp) tags.push('Khách chờ phản hồi')
  if (row.metadata?.staffAbsent) tags.push('Chưa có phản hồi NV')
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

export type CustomerSentimentBreakdown = {
  positive: number
  neutral: number
  negative: number
}

/** Phân bổ % hiển thị theo tone AI (một hội thoại — tổng 100%). */
export function resolveCustomerSentimentBreakdown(row: CskhAuditRow): CustomerSentimentBreakdown {
  const raw = row.metadata?.sentiment as
    | {
        positivePct?: number
        neutralPct?: number
        negativePct?: number
      }
    | undefined
  const p = raw?.positivePct
  const n = raw?.neutralPct
  const neg = raw?.negativePct
  if (
    typeof p === 'number' &&
    typeof n === 'number' &&
    typeof neg === 'number' &&
    Math.abs(p + n + neg - 100) < 2
  ) {
    return {
      positive: Math.round(p),
      neutral: Math.round(n),
      negative: Math.round(neg),
    }
  }

  const { tone } = resolveSentiment(row)
  const score = clamp(row.score, 0, 100)

  if (tone === 'positive') {
    const positive = Math.min(92, Math.max(50, score + 8))
    const negative = Math.max(2, Math.round((100 - score) * 0.12))
    const neutral = Math.max(0, 100 - positive - negative)
    return { positive, neutral, negative }
  }
  if (tone === 'negative') {
    const negative = Math.min(88, Math.max(28, 100 - score + 5))
    const positive = Math.max(2, Math.round(score * 0.2))
    const neutral = Math.max(0, 100 - positive - negative)
    return { positive, neutral, negative }
  }
  const neutral = Math.min(78, Math.max(25, Math.round(40 + score * 0.35)))
  const negative = Math.max(5, Math.round((100 - score) * 0.22))
  const positive = Math.max(0, 100 - neutral - negative)
  return { positive, neutral, negative }
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
  const ms = auditLastActivityMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Thời điểm tin nhắn cuối trong transcript (hoặc createdAt). */
export function auditLastActivityMs(row: CskhAuditRow): number {
  const transcript = Array.isArray(row.transcript) ? row.transcript : []
  let max = 0
  for (const line of transcript) {
    if (!line.timestamp) continue
    const t = new Date(line.timestamp).getTime()
    if (!Number.isNaN(t) && t > max) max = t
  }
  if (max > 0) return max
  const created = new Date(row.createdAt).getTime()
  return Number.isNaN(created) ? 0 : created
}
