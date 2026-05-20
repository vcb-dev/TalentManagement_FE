import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { MeetingBooking } from './api'
import { getBookingBlockClasses } from './roomBookingStyles'
import { isCompactTimelineBlock } from './roomBookingTimelineUtils'
import { formatTimeRangeVi, padTime } from './roomBookingTimeUtils'

const COMPACT_MIN_WIDTH = '2.85rem'

type Props = {
  booking: MeetingBooking
  layout: { left: string; width: string; widthPct: number }
  vnTime: { date: string; time: string }
  /** Cửa sổ giờ live (để nhận diện block gọn đúng tỷ lệ). */
  layoutWindowStartHour?: number | null
  onClick: (booking: MeetingBooking) => void
}

function TooltipBody({ booking }: { booking: MeetingBooking }) {
  return (
    <div>
      <p className="font-semibold leading-snug">{booking.reason}</p>
      <p className="mt-1 text-xs text-muted-foreground">{booking.userName}</p>
      <p className="mt-0.5 text-xs font-medium">
        {formatTimeRangeVi(booking.timeFrom, booking.timeTo)} · {booking.room}
      </p>
    </div>
  )
}

export function RoomBookingTimelineBlock({
  booking,
  layout,
  vnTime,
  layoutWindowStartHour = null,
  onClick,
}: Props) {
  const compact = isCompactTimelineBlock(booking.timeFrom, booking.timeTo, layoutWindowStartHour)
  const timeLabel = formatTimeRangeVi(booking.timeFrom, booking.timeTo)

  const button = (
    <button
      type="button"
      title={`${booking.reason} · ${booking.userName} · ${timeLabel}`}
      className={cn(
        'group/block absolute top-1 bottom-1 z-10 rounded-md border text-left shadow-sm ring-1 ring-white/60',
        'transition-[width,min-width,box-shadow] duration-150 ease-out',
        'hover:z-30 hover:min-w-[12.5rem] hover:shadow-md hover:ring-2 hover:ring-primary/40',
        compact
          ? 'overflow-visible px-1 py-1 hover:px-2.5 hover:py-1.5'
          : 'overflow-hidden px-2 py-1.5',
        getBookingBlockClasses(booking, vnTime)
      )}
      style={{
        left: layout.left,
        width: compact ? `max(${COMPACT_MIN_WIDTH}, ${layout.width})` : layout.width,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick(booking)
      }}
    >
      {compact ? (
        <>
          <span className="flex h-full items-center justify-center group-hover/block:hidden">
            <span className="text-center text-[10px] font-bold leading-tight">
              {padTime(booking.timeFrom).replace(/:/g, 'h')}
            </span>
          </span>
          <span className="hidden min-w-0 group-hover/block:block">
            <p className="line-clamp-2 text-[11px] font-bold leading-tight">{booking.reason}</p>
            <p className="mt-0.5 truncate text-[10px] opacity-85">{booking.userName}</p>
            <p className="mt-0.5 truncate text-[10px] font-semibold opacity-90">{timeLabel}</p>
          </span>
        </>
      ) : (
        <>
          <p className="line-clamp-2 text-[11px] font-bold leading-tight">{booking.reason}</p>
          <p className="mt-0.5 truncate text-[10px] opacity-85">{booking.userName}</p>
          <p className="mt-0.5 truncate text-[10px] font-semibold opacity-90">{timeLabel}</p>
        </>
      )}
    </button>
  )

  if (!compact) return button

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <TooltipBody booking={booking} />
        <p className="mt-1.5 text-[10px] text-muted-foreground">Nhấp để xem / đổi lịch</p>
      </TooltipContent>
    </Tooltip>
  )
}
