import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { kpiQueryKeys } from './kpiQueryKeys'

export type KpiRealtimeEventType =
  | 'assignment-changed'
  | 'summary-changed'
  | 'approval-submitted'
  | 'approval-resolved'
  | 'goal-review-changed'
  | 'ping'

export type KpiRealtimeEvent = {
  type: KpiRealtimeEventType
  teamId?: string
  year?: number
  month?: number
  approvalType?: 'goal' | 'result'
}

type UseKpiOkrStreamOptions = {
  /** Bật/tắt stream (mặc định bật) */
  enabled?: boolean
  /** Nếu cung cấp, chỉ invalidate khi event.teamId khớp */
  teamId?: string
  /** Nếu cung cấp cùng teamId, lọc thêm theo year/month */
  year?: number
  month?: number
}

/**
 * SSE hook: kết nối tới /performance/kpi/stream và invalidate đúng React Query key
 * khi BE phát sự kiện KPI/OKR. Trả `connected` để dùng làm điều kiện fallback polling.
 */
export function useKpiOkrStream({
  enabled = true,
  teamId,
  year,
  month,
}: UseKpiOkrStreamOptions = {}) {
  const qc = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const base = (import.meta.env.VITE_API_URL || 'http://localhost:3003').replace(/\/$/, '')
    const es = new EventSource(`${base}/performance/kpi/stream`, { withCredentials: true })

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
        const data = JSON.parse(ev.data as string) as KpiRealtimeEvent
        if (data.type === 'ping') return

        // Lọc phía client: bỏ qua nếu teamId không khớp
        if (teamId && data.teamId && data.teamId !== teamId) return

        handleKpiEvent(qc, data, teamId, year, month)
      } catch {
        // parse lỗi → bỏ qua
      }
    }

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer)
      es.close()
      setConnected(false)
    }
  }, [enabled, qc, teamId, year, month])

  return { connected }
}

function handleKpiEvent(
  qc: ReturnType<typeof useQueryClient>,
  ev: KpiRealtimeEvent,
  filterTeamId?: string,
  filterYear?: number,
  filterMonth?: number
) {
  const tid = ev.teamId
  const y = ev.year
  const m = ev.month

  const invalidateAssignments = () => {
    if (tid && y && m) {
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.assignments(tid, y, m) })
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.assignmentsResult(tid, y, m) })
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.monthlyAssignments(tid, y, m) })
    } else {
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.allAssignments(), exact: false })
    }
  }

  const invalidateSummaries = () => {
    if (tid && y && m) {
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.summaries(tid, y, m) })
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.summariesResult(tid, y, m) })
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.monthlySummaries(tid, y, m) })
    } else {
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.allSummaries(), exact: false })
    }
  }

  const invalidateApproval = () => {
    const type = ev.approvalType
    if (tid && y && m && type) {
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.approvalRequest(tid, y, m, type) })
    } else {
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.allApprovalRequests(), exact: false })
    }
    void qc.invalidateQueries({ queryKey: kpiQueryKeys.approvalInbox() })
    if (tid && y && m) {
      void qc.invalidateQueries({ queryKey: kpiQueryKeys.monthlyResultApproval(tid, y, m) })
    }
  }

  switch (ev.type) {
    case 'assignment-changed':
      invalidateAssignments()
      invalidateSummaries()
      break

    case 'summary-changed':
      invalidateSummaries()
      break

    case 'approval-submitted':
      invalidateApproval()
      break

    case 'approval-resolved':
      invalidateApproval()
      invalidateAssignments()
      invalidateSummaries()
      break

    case 'goal-review-changed':
      invalidateAssignments()
      invalidateApproval()
      break
  }
}
