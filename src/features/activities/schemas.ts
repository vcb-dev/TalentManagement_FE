import { z } from 'zod'
import { toActivityIso, vnDateTimeParts } from './activityTime'
import type { ActivityInput, CompanyActivity } from './types'

/** `HH:mm` đủ 2 chữ số từ `TimePicker` — nhờ vậy so sánh chuỗi cũng là so sánh thời gian. */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Giới hạn khớp BE `ACTIVITY_LIMITS`. */
export const activityFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập tên hoạt động')
      .max(300, 'Tên hoạt động tối đa 300 ký tự'),
    location: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập địa điểm')
      .max(300, 'Địa điểm tối đa 300 ký tự'),
    startDate: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
    startTime: z.string().regex(TIME_RE, 'Vui lòng chọn giờ bắt đầu'),
    /** Bỏ trống = cùng ngày bắt đầu. */
    endDate: z.string(),
    endTime: z.string().regex(TIME_RE, 'Vui lòng chọn giờ kết thúc'),
  })
  .refine(
    (v) => {
      if (!v.startDate || !v.startTime || !v.endTime) return true
      return `${v.endDate || v.startDate}T${v.endTime}` > `${v.startDate}T${v.startTime}`
    },
    { path: ['endTime'], message: 'Thời gian kết thúc phải sau thời gian bắt đầu' }
  )
export type ActivityForm = z.infer<typeof activityFormSchema>

export function activityFormValues(activity?: CompanyActivity | null): ActivityForm {
  if (!activity) {
    return { title: '', location: '', startDate: '', startTime: '', endDate: '', endTime: '' }
  }
  const start = vnDateTimeParts(activity.startAt)
  const end = vnDateTimeParts(activity.endAt)
  return {
    title: activity.title,
    location: activity.location,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date === start.date ? '' : end.date,
    endTime: end.time,
  }
}

export function activityFormToInput(values: ActivityForm): ActivityInput {
  return {
    title: values.title,
    location: values.location,
    startAt: toActivityIso(values.startDate, values.startTime),
    endAt: toActivityIso(values.endDate || values.startDate, values.endTime),
  }
}
