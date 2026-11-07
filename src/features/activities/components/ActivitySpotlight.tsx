import { Clock, MapPin } from 'lucide-react'
import {
  activityClockLabel,
  activityStatus,
  startsInLabel,
  vnDateTimeParts,
  vnWeekday,
} from '../activityTime'
import type { CompanyActivity } from '../types'

/** Tấm vé cho hoạt động đang diễn ra / sắp tới gần nhất, đè lên mép dưới ảnh đầu trang. */
export function ActivitySpotlight({ activity }: { activity: CompanyActivity }) {
  const isOngoing = activityStatus(activity) === 'ongoing'
  const [, month, day] = vnDateTimeParts(activity.startAt).date.split('-')

  return (
    <section
      aria-label={isOngoing ? 'Hoạt động đang diễn ra' : 'Hoạt động sắp tới gần nhất'}
      className="relative z-10 mx-3 -mt-14 drop-shadow-[0_16px_24px_rgb(0_41_31/0.3)] @xl:mx-8 @xl:-mt-16"
    >
      <div className="activity-ticket grid grid-cols-[var(--stub)_minmax(0,1fr)] rounded-2xl bg-white [--stub:5.25rem] @xl:[--stub:9.5rem]">
        <div className="flex flex-col items-center justify-center rounded-l-2xl bg-vcb-emerald-mid px-1 py-4 text-center text-vcb-cream">
          <span className="font-serif text-[2.75rem] leading-none text-vcb-gold-soft @xl:text-[4.25rem]">
            {day}
          </span>
          <span className="mt-1.5 text-xs font-semibold @xl:text-sm">
            {vnWeekday(activity.startAt)}
          </span>
          <span className="text-xs text-vcb-cream/80 @xl:text-sm">Tháng {Number(month)}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-2 border-l-2 border-dashed border-vcb-ink/20 p-4 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-6 @xl:px-7 @xl:py-6">
          <div className="min-w-0 space-y-2">
            <h2 className="break-words font-serif text-[clamp(1.375rem,3.2cqw,2.125rem)] font-medium leading-tight tracking-normal text-vcb-ink">
              {activity.title}
            </h2>
            <div className="flex flex-col gap-x-5 gap-y-1 text-sm text-vcb-ink/75 @xl:flex-row @xl:flex-wrap">
              <p className="flex items-start gap-1.5 tabular-nums">
                <Clock className="mt-[3px] size-3.5 shrink-0" aria-label="Thời gian" />
                {activityClockLabel(activity)}
              </p>
              <p className="flex min-w-0 items-start gap-1.5">
                <MapPin className="mt-[3px] size-3.5 shrink-0" aria-label="Địa điểm" />
                <span className="min-w-0 break-words">{activity.location}</span>
              </p>
            </div>
          </div>
          <p className="shrink-0 whitespace-nowrap font-serif text-xl italic text-vcb-bronze @2xl:text-right @xl:text-[1.625rem]">
            {isOngoing ? 'Đang diễn ra' : startsInLabel(activity.startAt)}
          </p>
        </div>
      </div>
    </section>
  )
}
