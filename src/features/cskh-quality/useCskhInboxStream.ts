import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { CskhCustomerIntent } from './api'
import {
  appendInboxMessagesToCache,
  patchInboxConversationInCache,
  type InboxRealtimeConversationPatch,
  type InboxRealtimeMessagePayload,
} from './inboxRealtimeCache'

export type InboxRealtimeEvent = {
  type?: string
  conversationId?: string
  messages?: InboxRealtimeMessagePayload[]
  conversation?: InboxRealtimeConversationPatch
  intent?: CskhCustomerIntent
}

type UseCskhInboxStreamOptions = {
  enabled?: boolean
  activeConversationId?: string | null
  activeAuditDate?: string | null
  onIntent?: (conversationId: string, intent: CskhCustomerIntent) => void
}

/**
 * SSE từ BE — push tin + intent ngay khi webhook Facebook có sự kiện mới.
 */
export function useCskhInboxStream({
  enabled = true,
  activeConversationId,
  activeAuditDate,
  onIntent,
}: UseCskhInboxStreamOptions = {}) {
  const qc = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const base = (import.meta.env.VITE_API_URL || 'http://localhost:3003').replace(/\/$/, '')
    const es = new EventSource(`${base}/cskh/inbox/stream`, { withCredentials: true })
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null

    es.onopen = () => {
      if (disconnectTimer) clearTimeout(disconnectTimer)
      setConnected(true)
    }
    es.onerror = () => {
      if (disconnectTimer) clearTimeout(disconnectTimer)
      disconnectTimer = setTimeout(() => setConnected(false), 4000)
    }
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as InboxRealtimeEvent
        if (data.type === 'ping') return

        if (data.type === 'intent' && data.conversationId && data.intent) {
          qc.setQueryData(['cskh', 'inbox', 'intent', data.conversationId], data.intent)
          onIntent?.(data.conversationId, data.intent)
          return
        }

        if (data.conversation) {
          patchInboxConversationInCache(qc, data.conversation)
        }

        if (data.type === 'message' && data.messages?.length && data.conversationId) {
          appendInboxMessagesToCache(
            qc,
            data.conversationId,
            activeAuditDate ?? undefined,
            data.messages
          )
          if (data.conversationId !== activeConversationId) {
            void qc.invalidateQueries({ queryKey: ['cskh', 'inbox', 'conversations'] })
          }
          return
        }

        void qc.invalidateQueries({ queryKey: ['cskh', 'inbox'] })
        if (data.conversationId) {
          void qc.invalidateQueries({
            queryKey: ['cskh', 'inbox', 'messages', data.conversationId],
          })
        }
      } catch {
        void qc.invalidateQueries({ queryKey: ['cskh', 'inbox'] })
      }
    }

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer)
      es.close()
      setConnected(false)
    }
  }, [enabled, qc, activeConversationId, activeAuditDate, onIntent])

  return connected
}
