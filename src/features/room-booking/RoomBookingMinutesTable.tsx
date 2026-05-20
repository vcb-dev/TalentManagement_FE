import { FileText } from 'lucide-react'
import type { MeetingBooking } from './api'
import { BBH_REQUIRED_FROM_DATE } from './roomBookingConstants'
import { formatDateVi, formatTimeRangeVi } from './roomBookingTimeUtils'
import { requiresMeetingMinutes } from './roomBookingMinutes'
import { RoomBookingMinutesCell } from './RoomBookingMinutesCell'

type Props = {
  items: MeetingBooking[]
  vnTime: { date: string; time: string }
  currentUserId?: string
  showAllUsers?: boolean
}

export function RoomBookingMinutesTable({ items, vnTime, currentUserId, showAllUsers }: Props) {
  const rows = items
    .filter((b) => requiresMeetingMinutes(b, vnTime))
    .filter((b) => showAllUsers || b.userId === currentUserId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.timeFrom.localeCompare(a.timeFrom))

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Biên bản họp (BBH)</h3>
        <span className="text-xs text-muted-foreground">
          Áp dụng từ {formatDateVi(BBH_REQUIRED_FROM_DATE)} · Nộp sau khi buổi họp kết thúc
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Chưa có buổi họp nào cần nộp biên bản.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Phòng</th>
                <th className="px-4 py-3">Ngày / Giờ</th>
                <th className="px-4 py-3">Lý do</th>
                {showAllUsers ? <th className="px-4 py-3">Người đặt</th> : null}
                <th className="px-4 py-3 min-w-[180px]">Biên bản</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 font-semibold">{b.room}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="block font-medium text-foreground">
                      {formatDateVi(b.date)}
                    </span>
                    <span className="text-xs">{formatTimeRangeVi(b.timeFrom, b.timeTo)}</span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3" title={b.reason}>
                    {b.reason}
                  </td>
                  {showAllUsers ? (
                    <td className="px-4 py-3 text-xs text-muted-foreground">{b.userName}</td>
                  ) : null}
                  <td className="px-4 py-3 align-top">
                    <RoomBookingMinutesCell
                      booking={b}
                      vnTime={vnTime}
                      compact
                      isOwner={b.userId === currentUserId}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
