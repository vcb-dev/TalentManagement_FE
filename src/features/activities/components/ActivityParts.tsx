import { Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatActivityTime, type ActivityStatus } from '../activityTime'
import type { CompanyActivity } from '../types'

const STATUS: Record<ActivityStatus, { label: string; className: string; dot: string }> = {
  ongoing: { label: 'Đang diễn ra', className: 'bg-success-muted text-success', dot: 'bg-success' },
  upcoming: { label: 'Sắp diễn ra', className: 'bg-button/10 text-button', dot: 'bg-button' },
  past: {
    label: 'Đã kết thúc',
    className: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
}

export function ActivityStatusPill({ status }: { status: ActivityStatus }) {
  const { label, className, dot } = STATUS[status]
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', dot)} aria-hidden />
      {label}
    </span>
  )
}

/** Thời gian diễn ra + địa điểm — dùng chung cho trang hoạt động và khối trên dashboard. */
export function ActivityMeta({ activity }: { activity: CompanyActivity }) {
  return (
    <dl className="space-y-1 text-sm text-muted-foreground">
      <div className="flex items-start gap-2">
        <dt>
          <Clock className="mt-0.5 size-4 shrink-0" aria-label="Thời gian" />
        </dt>
        <dd className="min-w-0 tabular-nums">{formatActivityTime(activity)}</dd>
      </div>
      <div className="flex items-start gap-2">
        <dt>
          <MapPin className="mt-0.5 size-4 shrink-0" aria-label="Địa điểm" />
        </dt>
        <dd className="min-w-0 break-words">{activity.location}</dd>
      </div>
    </dl>
  )
}
