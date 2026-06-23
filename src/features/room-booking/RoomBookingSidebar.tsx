import { CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import type { MeetingBooking } from './api'
import { formatDateVi, formatTimeRangeVi, padTime } from './roomBookingTimeUtils'

type PendingProps = {
  items: MeetingBooking[]
  processingId: string | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function RoomBookingPendingPanel({
  items,
  processingId,
  onApprove,
  onReject,
}: PendingProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <h3 className="text-sm font-bold text-foreground">Yêu cầu chờ duyệt</h3>
        <EmptyState compact tone="subtle" title="Không có yêu cầu nào" className="mt-2 py-4" />
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <h3 className="mb-3 text-sm font-bold text-foreground">Yêu cầu chờ duyệt ({items.length})</h3>
      <div className="space-y-3">
        {items.slice(0, 5).map((b) => (
          <div key={b.id} className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
            <p className="text-sm font-semibold text-foreground line-clamp-2">{b.reason}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.userName} · {formatDateVi(b.date)} · {padTime(b.timeFrom).replace(/:/g, 'h')}–
              {padTime(b.timeTo).replace(/:/g, 'h')}
            </p>
            <p className="text-xs text-muted-foreground">{b.room}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={!!processingId}
                onClick={() => onReject(b.id)}
                className="flex-1 rounded-lg border border-rose-200 bg-white py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                Từ chối
              </button>
              <button
                type="button"
                disabled={!!processingId}
                onClick={() => onApprove(b.id)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {processingId === b.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                Duyệt
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type RecentProps = {
  items: MeetingBooking[]
  onItemClick: (booking: MeetingBooking) => void
}

export function RoomBookingRecentPanel({ items, onItemClick }: RecentProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <h3 className="mb-3 text-sm font-bold text-foreground">Gần đây</h3>
      {items.length === 0 ? (
        <EmptyState compact tone="subtle" title="Chưa có hoạt động" className="py-4" />
      ) : (
        <div className="space-y-1">
          {items.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onItemClick(b)}
              className="flex w-full gap-2 border-b border-border/40 pb-3 pt-1 text-left last:border-0 last:pb-0 transition-colors hover:bg-muted/40 rounded-lg px-1 -mx-1"
            >
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{b.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTimeRangeVi(b.timeFrom, b.timeTo)} · {b.userName} · {b.room}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
