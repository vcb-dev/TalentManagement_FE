import type { CskhAuditRow } from './api'

export function formatAuditDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function vietnamTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

/** Page "Kim Nhạn - Vân Phong Các" → NV "Kim Nhạn". */
export function extractAgentFromPageLabel(pageName?: string | null): string | null {
  if (!pageName?.trim()) return null
  const m = pageName.trim().match(/^([^-–—|/]+?)\s[-–—|/]\s+/)
  const candidate = m?.[1]?.trim()
  if (!candidate || candidate.length > 40) return null
  if (/shop|store|page|official|cửa hàng|cua hang|fanpage/i.test(candidate)) return null
  return candidate
}

export function displayAgentName(row: CskhAuditRow): string {
  const name = row.agentName?.trim()
  if (name && name !== 'Nhân viên') return name
  return extractAgentFromPageLabel(row.metadata?.pageName) || '—'
}

export function displayChannelName(row: CskhAuditRow): string {
  const pageName = row.metadata?.pageName
  return (
    extractAgentFromPageLabel(pageName) ||
    pageName?.trim() ||
    displayPageShopLabel(pageName) ||
    row.channel ||
    '—'
  )
}

export function displayCustomerName(name?: string | null): string {
  const n = name?.trim()
  if (n && n !== 'Khách hàng') return n
  return '—'
}

export function displayPageShopLabel(pageName?: string | null): string | null {
  if (!pageName?.trim()) return null
  const parts = pageName.trim().split(/\s[-–—|/]\s+/)
  if (parts.length >= 2) return parts.slice(1).join(' - ').trim() || null
  return pageName.trim()
}

export function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-rose-600 bg-rose-50 border-rose-200'
}

export function parseBulletLines(text?: string | null): string[] {
  if (!text?.trim()) return []
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•+\-–*]+/, '').trim())
    .filter(Boolean)
}

function splitLongListItem(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const byViolation = trimmed
    .split(/(?=Vi phạm Quy tắc)/i)
    .map((s) => s.trim())
    .filter(Boolean)
  if (byViolation.length > 1) return byViolation

  const byRule = trimmed
    .split(/(?=Quy tắc [IVXLC\d]+(?:\s*\(|:))/i)
    .map((s) => s.trim())
    .filter(Boolean)
  if (byRule.length > 1) return byRule

  const bySemicolon = trimmed
    .split(/;\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (bySemicolon.length > 1) return bySemicolon

  return [trimmed]
}

/** Chuẩn hóa field AI trả về dạng string | string[] | JSON string */
export function parseAiListField(raw: unknown): string[] {
  if (raw == null) return []

  if (Array.isArray(raw)) {
    return raw.flatMap((item) => splitLongListItem(String(item)))
  }

  if (typeof raw === 'string') {
    const text = raw.trim()
    if (!text) return []
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text) as unknown
        if (Array.isArray(parsed)) {
          return parsed.flatMap((item) => splitLongListItem(String(item)))
        }
      } catch {
        /* fall through */
      }
    }
    const lines = parseBulletLines(text)
    if (lines.length > 1) return lines
    return splitLongListItem(text)
  }

  return []
}

export function parseViolations(row: CskhAuditRow): string[] {
  return parseAiListField(row.metadata?.violations)
}

export function parseSuggestedReplies(row: CskhAuditRow): string[] {
  return parseAiListField(row.metadata?.suggestedReplies)
}

export type AuditActionItem = {
  issue: string
  suggestedReply: string
}

function parseActionItemsFromPipeText(text: string): AuditActionItem[] {
  return text
    .split(/\n+/)
    .map((line) => {
      const cleaned = line.replace(/^[\s•+\-–*]+/, '').trim()
      const sep = cleaned.indexOf('||')
      if (sep < 0) return null
      const issue = cleaned.slice(0, sep).trim()
      const suggestedReply = cleaned.slice(sep + 2).trim()
      if (!issue || !suggestedReply) return null
      return { issue, suggestedReply }
    })
    .filter((item): item is AuditActionItem => item != null)
}

/** Vi phạm/lỗi kèm gợi ý trả lời tương ứng — 1 mục = 1 card */
export function parseAuditActionItems(row: CskhAuditRow): AuditActionItem[] {
  const raw = row.metadata?.actionItems
  if (Array.isArray(raw)) {
    const parsed = raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const rowItem = item as Record<string, unknown>
        const issue = String(rowItem.issue ?? rowItem.violation ?? '').trim()
        const suggestedReply = String(
          rowItem.suggestedReply ?? rowItem.suggested_reply ?? ''
        ).trim()
        if (!issue || !suggestedReply) return null
        return { issue, suggestedReply }
      })
      .filter((item): item is AuditActionItem => item != null)
    if (parsed.length) return parsed
  }

  if (typeof raw === 'string' && raw.trim()) {
    const parsed = parseActionItemsFromPipeText(raw)
    if (parsed.length) return parsed
  }

  const violations = parseViolations(row)
  const suggestions = parseSuggestedReplies(row)
  if (violations.length && suggestions.length) {
    const count = Math.max(violations.length, suggestions.length)
    return Array.from({ length: count }, (_, i) => ({
      issue: violations[i] ?? violations[violations.length - 1] ?? 'Cần cải thiện',
      suggestedReply: suggestions[i] ?? suggestions[suggestions.length - 1] ?? '',
    })).filter((item) => item.suggestedReply)
  }

  if (suggestions.length) {
    return suggestions.map((suggestedReply, i) => ({
      issue: violations[i] ?? `Gợi ý ${i + 1}`,
      suggestedReply,
    }))
  }

  return violations.map((issue) => ({ issue, suggestedReply: '' }))
}

export function lastMessagePreview(row: CskhAuditRow): string {
  const transcript = Array.isArray(row.transcript) ? row.transcript : []
  const last = transcript[transcript.length - 1]
  return (last?.text || '').trim() || '—'
}
