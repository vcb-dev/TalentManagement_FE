import { apiClient } from '@/lib/axios'

export interface CskhPage {
  pageId: string
  pageName: string | null
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
    scanned?: number
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
  channel: string | null
  score: number
  feedback: string | null
  transcript?: Array<{ sender?: string; text?: string; timestamp?: string }> | null
  metadata?: {
    pageName?: string
    pageId?: string
    conversationId?: string
    noReply?: boolean
    staffAbsent?: boolean
    needsFollowUp?: boolean
    auditDate?: string
    jobRunId?: string
  } | null
  createdAt: string
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

export async function runAudit(params: { auditDate: string; force?: boolean }): Promise<{
  jobId: string
  status: string
  alreadyRunning?: boolean
}> {
  const { data } = await apiClient.post<{
    jobId: string
    status: string
    alreadyRunning?: boolean
  }>('/cskh/audit/run', {
    auditDate: params.auditDate,
    force: params.force,
  })
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
  limit?: number
}): Promise<CskhAuditRow[]> {
  const { data } = await apiClient.get<CskhAuditRow[]>('/cskh/audits', { params })
  return data
}
