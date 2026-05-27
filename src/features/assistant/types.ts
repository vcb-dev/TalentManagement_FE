export type AssistantChatRole = 'user' | 'assistant'

export type AssistantChatMessage = {
  role: AssistantChatRole
  content: string
  sources?: AssistantSource[]
  reportDraft?: AssistantReportDraft
  structuredReport?: AssistantStructuredReport
  pending?: boolean
}

export type AssistantSource = {
  title: string
  snippet: string
  category?: string
  documentId?: string
  chunkId?: string
}

export type AssistantReportDraft = {
  teamId: string
  teamName: string
  year: number
  month: number
  memberReportCount: number
  warnings: string[]
  sections: {
    workDone: string
    outputResult: string
    cause: string
    kpi: string
    evidence: string
    proposal: string
    okr: string
    issues: string
    nextMonthPlan: string
  }
}

export type AssistantReportColumn = {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}

export type AssistantReportTable = {
  id: string
  title: string
  description?: string
  columns: AssistantReportColumn[]
  rows: Array<Record<string, string | number | null>>
}

export type AssistantStructuredReport = {
  kind: 'traffic_team_monthly_report' | 'traffic_all_teams_monthly_report'
  title: string
  period: { year: number; month: number }
  teams: Array<{ id: string; name: string }>
  summaryCards: Array<{
    key: string
    label: string
    value: string | number
    tone?: 'default' | 'success' | 'warning' | 'danger'
  }>
  tables: Record<string, AssistantReportTable>
  sections: {
    workDone: string
    outputResult: string
    cause: string
    kpi: string
    evidence: string
    proposal: string
    okr: string
    issues: string
    nextMonthPlan: string
  }
  warnings: string[]
  generatedAt: string
}

export type AssistantBookingDraft = {
  room?: string
  date?: string
  timeFrom?: string
  timeTo?: string
  reason?: string
  note?: string
}

export type AssistantBookingStatus = 'idle' | 'collecting' | 'confirm' | 'done' | 'cancelled'

export type AssistantChatResponse = {
  reply: string
  blocked: boolean
  block_reason?: string | null
  sources: AssistantSource[]
  scope: 'in_scope' | 'off_topic' | 'low_confidence' | string
  bookingDraft?: AssistantBookingDraft | null
  bookingStatus?: AssistantBookingStatus
  reportDraft?: AssistantReportDraft
  structuredReport?: AssistantStructuredReport
}
