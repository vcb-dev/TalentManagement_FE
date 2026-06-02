import type { QueryClient } from '@tanstack/react-query'
import type { CskhInboxConversation, CskhInboxMessage } from './api'

export type InboxRealtimeMessagePayload = CskhInboxMessage

export type InboxRealtimeConversationPatch = Partial<CskhInboxConversation> & { id: string }

export function appendInboxMessagesToCache(
  qc: QueryClient,
  conversationId: string,
  auditDateKey: string | undefined,
  incoming: InboxRealtimeMessagePayload[]
) {
  if (!incoming.length) return
  const queries = qc.getQueryCache().findAll({
    queryKey: ['cskh', 'inbox', 'messages', conversationId],
  })
  for (const q of queries) {
    qc.setQueryData<{ conversation: CskhInboxConversation; messages: CskhInboxMessage[] }>(
      q.queryKey,
      (prev) => {
        if (!prev) return prev
        const byId = new Map(prev.messages.map((m) => [m.id, m]))
        for (const msg of incoming) {
          byId.set(msg.id, { ...byId.get(msg.id), ...msg })
        }
        const merged = [...byId.values()].sort(
          (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        )
        return { ...prev, messages: merged }
      }
    )
  }
}

export function patchInboxConversationInCache(
  qc: QueryClient,
  patch: InboxRealtimeConversationPatch
) {
  const queries = qc.getQueryCache().findAll({
    queryKey: ['cskh', 'inbox', 'conversations'],
  })
  for (const q of queries) {
    const key = q.queryKey
    qc.setQueryData<CskhInboxConversation[]>(key, (prev) => {
      if (!prev?.length) return prev
      const idx = prev.findIndex((c) => c.id === patch.id)
      if (idx < 0) {
        const pageIdFilter = key[3] as string | undefined
        if (pageIdFilter && patch.pageId && patch.pageId !== pageIdFilter) {
          return prev
        }
        const row = patch as CskhInboxConversation
        return [row, ...prev].sort(
          (a, b) =>
            new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()
        )
      }
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      next.sort(
        (a, b) =>
          new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()
      )
      return next
    })
  }
}

export function bumpAuditSidebarPreview(
  qc: QueryClient,
  auditId: string,
  preview: string,
  score?: number
) {
  qc.setQueryData(['cskh', 'audits'], (prev: unknown) => {
    if (!Array.isArray(prev)) return prev
    return prev.map((row) => {
      if (!row || typeof row !== 'object' || (row as { id?: string }).id !== auditId) return row
      const r = row as { transcript?: unknown[]; score?: number }
      const transcript = Array.isArray(r.transcript) ? [...r.transcript] : []
      if (preview.trim()) {
        transcript.push({
          sender: 'Customer',
          text: preview,
          timestamp: new Date().toISOString(),
        })
      }
      return {
        ...row,
        score: score ?? r.score,
        transcript,
      }
    })
  })
}
