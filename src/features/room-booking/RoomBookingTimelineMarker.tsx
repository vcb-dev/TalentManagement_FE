import { Calendar } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { MeetingBooking } from './api'
import { getBookingMarkerClasses } from './roomBookingStyles'
import { formatTimeRangeVi } from './roomBookingTimeUtils'
import { blockLayout } from './roomBookingTimelineUtils'

type Props = {
  booking: MeetingBooking
  vnTime: { date: string; time: string }
  onClick: (booking: MeetingBooking) => void
}

export function RoomBookingTimelineMarker({ booking, vnTime, onClick }: Props) {
  const layout = blockLayout(booking.timeFrom, booking.timeTo)
  const centerLeft = `calc(${layout.left} + ${layout.widthPct / 2}%)`

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`absolute top-1/2 z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-md ring-2 transition hover:scale-110 hover:z-20 ${getBookingMarkerClasses(booking, vnTime)}`}
          style={{ left: centerLeft }}
          onClick={(e) => {
            e.stopPropagation()
            onClick(booking)
          }}
        >
          <Calendar className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-semibold leading-snug">{booking.reason}</p>
        <p className="mt-1 text-xs text-muted-foreground">{booking.userName}</p>
        <p className="mt-0.5 text-xs font-medium">
          {formatTimeRangeVi(booking.timeFrom, booking.timeTo)} · {booking.room}
        </p>
        <p className="mt-1.5 text-[10px] text-muted-foreground">Nhấp để xem chi tiết</p>
      </TooltipContent>
    </Tooltip>
  )
}
