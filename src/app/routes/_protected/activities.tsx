import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { vnMonthOf } from '@/features/activities/activityTime'
import { ActivitiesScreen } from '@/features/activities/components/ActivitiesScreen'

const activitiesSearchSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  month: z.coerce.number().int().min(1).max(12).optional().catch(undefined),
})

/** Ai đăng nhập cũng xem được — nút thêm / sửa / xoá hiện theo `activity.manage`, BE chặn từng API. */
export const Route = createFileRoute('/_protected/activities')({
  validateSearch: (raw) => activitiesSearchSchema.parse(raw),
  component: ActivitiesPage,
})

function ActivitiesPage() {
  const { year, month } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ActivitiesScreen
      month={year && month ? { year, month } : vnMonthOf()}
      onMonthChange={(next) => void navigate({ search: next })}
    />
  )
}
