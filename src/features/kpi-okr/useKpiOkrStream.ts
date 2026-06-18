import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { kpiQueryKeys } from './kpiQueryKeys'

interface UseKpiOkrStreamOptions {
  teamId?: string
  year: number
  month: number
}

/**
 * SSE hook that listens for real-time KPI/OKR updates from the server.
 *
 * When connected, the consuming component can disable polling
 * (refetchInterval) in favour of push-based invalidation.
 *
 * If the EventSource fails to connect or the browser does not support it,
 * `connected` stays `false` and the caller should fall back to polling.
 */
export function useKpiOkrStream(options: UseKpiOkrStreamOptions) {
  const { teamId, year, month } = options
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

    const token = useAuthStore.getState().accessToken

    // Build SSE URL with query params
    const params = new URLSearchParams()
    params.set('year', String(year))
    params.set('month', String(month))
    if (teamId) params.set('teamId', teamId)
    if (token) params.set('token', token)

    const url = `${apiUrl}/performance/stream?${params.toString()}`

    let es: EventSource
    try {
      es = new EventSource(url)
    } catch {
      // Browser may not support EventSource or URL is invalid
      setConnected(false)
      return
    }

    esRef.current = es

    es.onopen = () => {
      setConnected(true)
    }

    es.onmessage = () => {
      // Generic message → invalidate all KPI-related queries
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.allAssignments() })
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.allSummaries() })
      void queryClient.invalidateQueries({ queryKey: ['kpi-approval-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['monthly-report-members'] })
    }

    es.addEventListener('assignment-update', () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.allAssignments() })
    })

    es.addEventListener('summary-update', () => {
      void queryClient.invalidateQueries({ queryKey: kpiQueryKeys.allSummaries() })
    })

    es.addEventListener('approval-update', () => {
      void queryClient.invalidateQueries({ queryKey: ['kpi-approval-requests'] })
    })

    es.onerror = () => {
      setConnected(false)
      // EventSource will auto-reconnect by default;
      // if it enters CLOSED state, clean up.
      if (es.readyState === EventSource.CLOSED) {
        es.close()
      }
    }

    return () => {
      es.close()
      esRef.current = null
      setConnected(false)
    }
  }, [teamId, year, month, queryClient])

  return { connected }
}
