import { apiClient } from '@/lib/axios'

export interface CskhPage {
  pageId: string
  pageName: string | null
  pagePictureUrl?: string | null
  enabled: boolean
  updatedAt: string
  metadata?: unknown
}

export interface CskhPagesResponse {
  pages: CskhPage[]
  oauthConnected: boolean
  oauthUser: string | null
  oauthUpdatedAt: string | null
  oauthExpiresAt: string | null
}

export interface CskhMonitorItem {
  id: string
  pageId: string
  pageName: string | null
  conversationId: string
  customerName: string | null
  lastMessage: string | null
  needsReply: boolean
  updatedAt: string | null
}

export interface CskhJobRun {
  id: string
  type: string
  status: string
  summary?: {
    totalConversations?: number
    totalNoReply?: number
    pageCount?: number
    pageErrors?: number
    pagesTotal?: number
    pagesProcessed?: number
    currentPage?: string
    maxConversationsPerPage?: number
    total?: number
    processed?: number
    phase?: string
    fetched?: number
    currentCustomer?: string
    audited?: number
    errors?: number
    avgScore?: number
    auditCount?: number
    auditDate?: string
    auditDateFrom?: string
    auditDateTo?: string
    scanned?: number
    maxConversations?: number | null
    paused?: boolean
    partial?: boolean
    pauseRequested?: boolean
    skippedAlready?: number
    remaining?: number
    allAlreadyAudited?: boolean
    tokenUsage?: {
      model?: string
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
      perAuditAvg?: number
    }
  } | null
  error?: string | null
  startedAt: string
  finishedAt?: string | null
  monitorItems?: CskhMonitorItem[]
}

export interface CskhAuditRow {
  id: string
  agentName: string | null
  customerName: string | null
  customerPictureUrl?: string | null
  fromAd?: boolean
  adId?: string | null
  adTitle?: string | null
  referralSource?: string | null
  channel: string | null
  score: number
  feedback: string | null
  transcript?: Array<{ sender?: string; text?: string; timestamp?: string }> | null
  metadata?: {
    pageName?: string
    pageId?: string
    conversationId?: string
    participantPsid?: string
    customerPictureUrl?: string | null
    noReply?: boolean
    staffAbsent?: boolean
    needsFollowUp?: boolean
    auditDate?: string
    auditDateFrom?: string
    auditDateTo?: string
    jobRunId?: string
    fromAd?: boolean
    adId?: string | null
    adTitle?: string | null
    referralSource?: string | null
    suggestedReplies?: string | string[] | null
    actionItems?: Array<{ issue: string; suggestedReply: string }> | string | null
    violations?: string | null
    tokenUsage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
      model?: string
    } | null
    criteriaScores?: {
      greeting?: number
      needs?: number
      consult?: number
      objection?: number
      closing?: number
    } | null
    strengths?: string[] | null
    weaknesses?: string[] | null
    keywords?: string[] | null
    sentiment?: {
      label?: string
      customer?: string
      staff?: string
      tone?: 'positive' | 'neutral' | 'negative'
    } | null
    tags?: string[] | null
    transcriptMetrics?: {
      firstResponseSec?: number | null
      staffReplies?: number
      customerMessages?: number
      proactivePct?: number
    } | null
  } | null
  createdAt: string
}

export interface AuditComparisonStats {
  auditDate: string
  auditId: string
  staff: number
  team: number
  overall: number
  staffSampleSize: number
  teamSampleSize: number
  daySampleSize: number
}

export interface AuditScoreHistoryPoint {
  auditId: string
  auditDate: string
  score: number
  label: string
}

export interface AuditScoreHistory {
  auditId: string
  points: AuditScoreHistoryPoint[]
}

export interface CskhCustomerInterestedProduct {
  productId: number
  variantId: number
  name: string
  variantTitle: string
  price: number
  priceLabel: string
  compareAtPrice: number | null
  sku: string | null
  imageUrl: string | null
  inStock: boolean
  matchReason: string
}

export interface CskhCustomerIntent {
  summary: string
  intentLabel: string
  topics: string[]
  productMentions?: string[]
  products?: CskhCustomerInterestedProduct[]
  sapoConfigured?: boolean
  urgency: 'low' | 'normal' | 'high'
  suggestedFocus: string
  analyzedAt: string
}

export function getCskhOAuthStartUrl(returnUrl?: string): string {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3003').replace(/\/$/, '')
  const ret = returnUrl || (typeof window !== 'undefined' ? window.location.href : '')
  return `${base}/cskh/oauth/start?returnUrl=${encodeURIComponent(ret)}`
}

export async function fetchCskhPages(): Promise<CskhPagesResponse> {
  const { data } = await apiClient.get<CskhPagesResponse>('/cskh/pages')
  return data
}

export async function refreshCskhOAuth(): Promise<{ pageCount: number; oauthUser: string }> {
  const { data } = await apiClient.post<{ pageCount: number; oauthUser: string }>(
    '/cskh/oauth/refresh'
  )
  return data
}

export async function setCskhPageEnabled(pageId: string, enabled: boolean) {
  const { data } = await apiClient.patch(`/cskh/pages/${pageId}/enabled`, { enabled })
  return data
}

export async function setCskhPagesEnabledBulk(enabled: boolean, pageIds?: string[]) {
  const { data } = await apiClient.patch<{ updated: number; enabled: boolean }>(
    '/cskh/pages/bulk-enabled',
    { enabled, pageIds }
  )
  return data
}

export async function deleteCskhPage(pageId: string) {
  const { data } = await apiClient.delete(`/cskh/pages/${pageId}`)
  return data
}

export async function fetchLatestMonitor(): Promise<CskhJobRun | null> {
  const { data } = await apiClient.get<CskhJobRun | null>('/cskh/monitor/latest')
  return data
}

export async function runMonitor(maxConversations?: number): Promise<{
  jobId: string
  status: string
  alreadyRunning?: boolean
}> {
  const { data } = await apiClient.post<{
    jobId: string
    status: string
    alreadyRunning?: boolean
  }>('/cskh/monitor/run', {
    maxConversations,
  })
  return data
}

export async function runAudit(params: {
  auditDateFrom: string
  auditDateTo: string
  force?: boolean
  pageId: string
  /** Chỉ chấm tối đa N cuộc chưa chấm (bỏ qua đã chấm trong khoảng ngày). */
  maxConversations?: number
}): Promise<{
  jobId: string
  status: string
  alreadyRunning?: boolean
}> {
  const { data } = await apiClient.post<{
    jobId: string
    status: string
    alreadyRunning?: boolean
  }>('/cskh/audit/run', {
    auditDateFrom: params.auditDateFrom,
    auditDateTo: params.auditDateTo,
    auditDate: params.auditDateFrom,
    force: params.force,
    pageId: params.pageId,
    maxConversations: params.maxConversations,
  })
  return data
}

export async function pauseAuditJob(): Promise<{
  paused: boolean
  jobId?: string
  message?: string
}> {
  const { data } = await apiClient.post<{ paused: boolean; jobId?: string; message?: string }>(
    '/cskh/audit/pause'
  )
  return data
}

export async function cancelAuditJob(): Promise<{ cancelled: number }> {
  const { data } = await apiClient.post<{ cancelled: number }>('/cskh/audit/cancel')
  return data
}

export async function fetchRunningCskhJob(type: 'monitor' | 'audit'): Promise<CskhJobRun | null> {
  const { data } = await apiClient.get<CskhJobRun | null>(`/cskh/jobs/running/${type}`)
  return data
}

export async function fetchCskhJob(jobId: string): Promise<CskhJobRun> {
  const { data } = await apiClient.get<CskhJobRun>(`/cskh/jobs/${jobId}`)
  return data
}

export interface CskhAuditProgress {
  id: string
  status: string
  error?: string | null
  startedAt: string
  finishedAt?: string | null
  summary?: CskhJobRun['summary']
  audits: CskhAuditRow[]
}

export async function fetchAuditProgress(jobId: string): Promise<CskhAuditProgress> {
  const { data } = await apiClient.get<CskhAuditProgress>(`/cskh/audit/progress/${jobId}`)
  return data
}

export async function fetchCskhAudits(params?: {
  pageId?: string
  jobRunId?: string
  auditDate?: string
  auditDateFrom?: string
  auditDateTo?: string
  limit?: number
}): Promise<CskhAuditRow[]> {
  const { data } = await apiClient.get<CskhAuditRow[]>('/cskh/audits', { params })
  return data
}

export interface AuditDayStats {
  auditDate: string
  auditDateFrom?: string
  auditDateTo?: string
  pageId?: string | null
  total: number
  passed: number
  failed: number
  fromAd: number
}

export async function fetchAuditDayStats(
  auditDateFrom: string,
  auditDateTo: string,
  pageId?: string
): Promise<AuditDayStats> {
  const { data } = await apiClient.get<AuditDayStats>('/cskh/audits/day-stats', {
    params: { auditDateFrom, auditDateTo, auditDate: auditDateFrom, pageId },
  })
  return data
}

export async function fetchAuditComparisonStats(
  auditDate: string,
  auditId: string
): Promise<AuditComparisonStats> {
  const { data } = await apiClient.get<AuditComparisonStats>('/cskh/audits/comparison', {
    params: { auditDate, auditId },
  })
  return data
}

export async function fetchAuditScoreHistory(auditId: string): Promise<AuditScoreHistory> {
  const { data } = await apiClient.get<AuditScoreHistory>('/cskh/audits/score-history', {
    params: { auditId },
  })
  return data
}

export async function fetchCustomerIntent(
  conversationId: string,
  auditId?: string
): Promise<CskhCustomerIntent> {
  const { data } = await apiClient.get<CskhCustomerIntent>(
    `/cskh/inbox/conversations/${conversationId}/intent`,
    { params: auditId ? { auditId } : undefined }
  )
  return {
    summary: data.summary,
    intentLabel: data.intentLabel ?? (data as { intent_label?: string }).intent_label ?? 'Chưa rõ',
    topics: data.topics ?? [],
    productMentions:
      data.productMentions ?? (data as { product_mentions?: string[] }).product_mentions ?? [],
    products: data.products ?? [],
    sapoConfigured: data.sapoConfigured ?? (data as { sapo_configured?: boolean }).sapo_configured,
    urgency: data.urgency ?? 'normal',
    suggestedFocus:
      data.suggestedFocus ?? (data as { suggested_focus?: string }).suggested_focus ?? '',
    analyzedAt: data.analyzedAt ?? (data as { analyzed_at?: string }).analyzed_at ?? '',
  }
}

export interface DeepSeekBalanceResponse {
  isAvailable?: boolean
  currency?: string
  totalBalance?: number
  grantedBalance?: number
  toppedUpBalance?: number
  model?: string
  error?: boolean
  message?: string
}

export interface AuditTokenStatsResponse {
  source?: 'running' | 'lastJob' | 'none'
  jobId?: string | null
  finishedAt?: string | null
  tokenUsage?: {
    model?: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    perAuditAvg?: number
  } | null
}

export async function fetchAuditTokenStats(): Promise<AuditTokenStatsResponse> {
  const { data } = await apiClient.get<AuditTokenStatsResponse>('/cskh/audit/token-stats')
  return data
}

export async function fetchDeepSeekBalance(): Promise<DeepSeekBalanceResponse> {
  const { data } = await apiClient.get<DeepSeekBalanceResponse>('/cskh/ai/balance')
  return data
}

export interface CskhInboxConversation {
  id: string
  pageId: string
  pageName: string | null
  fbConversationId: string | null
  participantPsid: string
  customerName: string | null
  customerPictureUrl?: string | null
  fromAd?: boolean
  adId?: string | null
  adTitle?: string | null
  referralSource?: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  updatedAt: string
}

export interface CskhInboxMessage {
  id: string
  conversationId: string
  fbMessageId: string | null
  direction: 'inbound' | 'outbound'
  senderType: 'customer' | 'staff'
  text: string
  messageType?: 'text' | 'image' | 'sticker' | string
  attachmentUrl?: string | null
  sentAt: string
  status: 'sent' | 'pending' | 'failed'
}

export async function fetchInboxConversations(pageId?: string): Promise<CskhInboxConversation[]> {
  const { data } = await apiClient.get<CskhInboxConversation[]>('/cskh/inbox/conversations', {
    params: pageId ? { pageId } : undefined,
  })
  return data
}

export async function fetchInboxMessages(
  conversationId: string,
  opts?: { since?: string; refresh?: boolean; limit?: number }
): Promise<{ conversation: CskhInboxConversation; messages: CskhInboxMessage[] }> {
  const params: Record<string, string> = {}
  if (opts?.since) params.since = opts.since
  if (opts?.refresh) params.refresh = '1'
  if (opts?.limit != null && opts.limit > 0) params.limit = String(opts.limit)
  const { data } = await apiClient.get<{
    conversation: CskhInboxConversation
    messages: CskhInboxMessage[]
  }>(`/cskh/inbox/conversations/${conversationId}/messages`, {
    params: Object.keys(params).length ? params : undefined,
  })
  return data
}

export async function resolveInboxMessageMedia(messageId: string): Promise<{
  id: string
  attachmentUrl: string | null
  attachmentUrls?: string[]
  messageType: string
  text: string
}> {
  const { data } = await apiClient.post<{
    id: string
    attachmentUrl: string | null
    attachmentUrls?: string[]
    messageType: string
    text: string
  }>(`/cskh/inbox/messages/${messageId}/resolve-media`)
  return data
}

export async function sendInboxMessage(
  conversationId: string,
  text: string
): Promise<CskhInboxMessage> {
  const { data } = await apiClient.post<CskhInboxMessage>(
    `/cskh/inbox/conversations/${conversationId}/send`,
    { text }
  )
  return data
}

export async function notifyInboxTyping(conversationId: string): Promise<void> {
  await apiClient.post(`/cskh/inbox/conversations/${conversationId}/typing`)
}

export async function markInboxAsRead(conversationId: string): Promise<{ markedAsRead: number }> {
  const { data } = await apiClient.post<{ markedAsRead: number }>(
    `/cskh/inbox/conversations/${conversationId}/mark-as-read`
  )
  return data
}

export async function syncInboxFromGraph(
  pageId?: string
): Promise<{ synced: number; pageCount: number }> {
  const { data } = await apiClient.post<{ synced: number; pageCount: number }>('/cskh/inbox/sync', {
    pageId,
  })
  return data
}

export async function linkAuditInbox(auditId: string): Promise<CskhInboxConversation> {
  const { data } = await apiClient.post<CskhInboxConversation>('/cskh/inbox/link-audit', {
    auditId,
  })
  return data
}

export async function fetchInboxAuditHint(conversationId: string): Promise<CskhAuditRow | null> {
  const { data } = await apiClient.get<CskhAuditRow | null>(
    `/cskh/inbox/conversations/${conversationId}/audit-hint`
  )
  return data
}
