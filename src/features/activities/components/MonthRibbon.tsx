import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { activityStatus, formatActivityTime, type ActivityStatus } from '../activityTime'
import { layoutMonthRibbon } from '../monthRibbon'
import type { ActivityMonth, CompanyActivity } from '../types'

const BAR_TONE: Record<ActivityStatus, string> = {
  ongoing: 'bg-vcb-cream shadow-[0_1px_8px_rgb(251_246_233/0.7)]',
  upcoming: 'bg-vcb-gold hover:bg-vcb-gold-soft',
  past: 'bg-vcb-gold/40 hover:bg-vcb-gold/70',
}

/** Trên mobile ô ngày chỉ rộng ~11px nên chỉ ghi số các mốc 1, 5, 10… và hôm nay. */
function isLabelledOnNarrow(day: number, days: number): boolean {
  return day === 1 || day === days || day % 5 === 0
}

/** Dải ngày của tháng: mỗi hoạt động là một vạch vàng, bấm vạch để nhảy tới dòng tương ứng. */
export function MonthRibbon({
  month,
  activities,
  onSelect,
}: {
  month: ActivityMonth
  activities: CompanyActivity[]
  onSelect: (activity: CompanyActivity) => void
}) {
  const { days, laneCount, bars, today } = layoutMonthRibbon(activities, month)
  const grid = { gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` } satisfies CSSProperties

  return (
    <div role="group" aria-label={`Lịch tháng ${month.month}/${month.year}`}>
      <div
        aria-hidden
        className="grid text-center text-[11px] tabular-nums @xl:text-xs"
        style={grid}
      >
        {Array.from({ length: days }, (_, i) => i + 1).map((day) => (
          <span
            key={day}
            className={cn(
              'flex justify-center',
              day !== today && !isLabelledOnNarrow(day, days) && 'invisible @2xl:visible',
              today !== null && day < today ? 'text-vcb-cream/60' : 'text-vcb-cream/85'
            )}
          >
            <span
              className={cn(
                'flex h-5 min-w-5 items-center justify-center rounded-full',
                day === today && 'bg-vcb-gold font-bold text-vcb-ink'
              )}
            >
              {day}
            </span>
          </span>
        ))}
      </div>
      {laneCount > 0 ? (
        <div
          className="relative mt-2 grid gap-y-1"
          style={{ ...grid, gridTemplateRows: `repeat(${laneCount}, 0.375rem)` }}
        >
          {today !== null ? (
            <span
              aria-hidden
              className="w-px justify-self-center bg-vcb-cream/50"
              style={{ gridColumn: today, gridRow: `1 / ${laneCount + 1}` }}
            />
          ) : null}
          {bars.map(({ activity, startDay, endDay, lane }) => {
            const label = `${activity.title} · ${formatActivityTime(activity)}`
            return (
              <button
                key={activity.id}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => onSelect(activity)}
                className={cn(
                  'relative mx-px rounded-full transition-colors duration-200 before:absolute before:-inset-y-1.5 before:inset-x-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vcb-cream',
                  BAR_TONE[activityStatus(activity)]
                )}
                style={{ gridColumn: `${startDay} / ${endDay + 1}`, gridRow: lane + 1 }}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
