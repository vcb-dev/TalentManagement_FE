import { Link } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'
import { activityStatus, vnMonthOf } from '../activityTime'
import { useMonthActivities } from '../hooks'
import { ActivityMeta, ActivityStatusPill } from './ActivityParts'

const MAX_VISIBLE = 3

/** Hoạt động sắp tới trong tháng trên Tổng quan cá nhân — không còn hoạt động nào thì ẩn cả khối. */
export function DashboardActivitiesCard() {
  const { data: activities = [] } = useMonthActivities(vnMonthOf())
  const remaining = activities
    .map((activity) => ({ activity, status: activityStatus(activity) }))
    .filter(({ status }) => status !== 'past')

  if (remaining.length === 0) return null

  return (
    <section
      className="rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[var(--shadow-card)]"
      aria-label="Hoạt động trong tháng"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <CalendarDays className="h-4 w-4 text-button" aria-hidden />
          Hoạt động trong tháng
        </div>
        <Link
          to="/activities"
          className="shrink-0 text-sm font-semibold text-button hover:underline"
        >
          Xem tất cả
        </Link>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {remaining.slice(0, MAX_VISIBLE).map(({ activity, status }) => (
          <li key={activity.id} className="min-w-0 space-y-2 rounded-xl bg-muted/40 p-3">
            <ActivityStatusPill status={status} />
            <h3 className="break-words text-sm font-bold leading-snug text-foreground">
              {activity.title}
            </h3>
            <ActivityMeta activity={activity} />
          </li>
        ))}
      </ul>
    </section>
  )
}
