import { z } from 'zod'

/** Giới hạn khớp BE `COURSE_LIMITS`. */
const title = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${label}`)
    .max(300, `${label.charAt(0).toUpperCase()}${label.slice(1)} tối đa 300 ký tự`)

const description = z.string().trim().max(5000, 'Mô tả tối đa 5000 ký tự')

export const courseFormSchema = z.object({
  title: title('tên khoá học'),
  description,
})
export type CourseForm = z.infer<typeof courseFormSchema>

export const coursePathFormSchema = z.object({
  title: title('tên lộ trình'),
  description,
})
export type CoursePathForm = z.infer<typeof coursePathFormSchema>

/** Giá trị Select "Thuộc" cho tài liệu chung của khoá (Radix Select không nhận value rỗng). */
export const COURSE_LEVEL_TARGET = '__course'

export const courseMaterialFormSchema = z.object({
  title: title('tên tài liệu'),
  url: z
    .string()
    .trim()
    .max(2000, 'Link tối đa 2000 ký tự')
    .refine(
      (v) => !v || /^https?:\/\/\S+$/i.test(v),
      'Link phải bắt đầu bằng http:// hoặc https://'
    ),
  note: z.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự'),
  /** `COURSE_LEVEL_TARGET` hoặc id lộ trình. */
  target: z.string(),
})
export type CourseMaterialForm = z.infer<typeof courseMaterialFormSchema>
