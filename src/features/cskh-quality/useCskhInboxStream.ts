import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * SSE từ BE — nhận push ngay khi webhook Facebook có tin mới.
 * Cookie session được gửi kèm (withCredentials).
 */
export function useCskhInboxStream(enabled = true) {
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
        const data = JSON.parse(ev.data as string) as {
          type?: string
          conversationId?: string
        }
        if (data.type === 'ping') return
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
  }, [enabled, qc])

  return connected
}
