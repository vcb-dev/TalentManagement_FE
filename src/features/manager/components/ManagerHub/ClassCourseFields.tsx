import { Link } from '@tanstack/react-router'
import { BookMarked, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCourseOptions } from '@/features/courses/hooks'
import type { CourseOption } from '@/features/courses/types'
import type { ManagerClass } from '@/features/manager/types'

/** Radix Select không nhận value rỗng — '' trong form ↔ NONE trên ô chọn. */
const NONE = '__none'

/** Tên lộ trình/khoá học có thể rất dài. Radix bỏ qua `className` của SelectValue nên cắt "…" từ trigger. */
export const COURSE_SELECT_TRIGGER = 'w-full min-w-0 gap-2 [&>span]:min-w-0 [&>span]:truncate'
/** Danh sách xổ xuống hiện đủ tên (xuống dòng khi dài) nhưng không tràn khỏi màn hình. */
export const COURSE_SELECT_CONTENT =
  'max-w-[min(32rem,var(--radix-select-content-available-width))]'

export type ClassCourseValue = { courseId: string; coursePathId: string }

/**
 * Lộ trình đang mở + lộ trình lớp đang gắn (nếu đã bị ẩn) để ô chọn vẫn hiện đúng giá trị khi sửa lớp.
 */
function withCurrentCourse(
  options: CourseOption[],
  current: Pick<ManagerClass, 'course' | 'coursePath'> | undefined,
  loaded: boolean
): CourseOption[] {
  const course = current?.course
  if (!course || options.some((o) => o.id === course.id)) return options
  return [
    ...options,
    {
      id: course.id,
      title: loaded ? `${course.title} (đang ẩn)` : course.title,
      paths: current.coursePath ? [current.coursePath] : [],
    },
  ]
}

export function ClassCourseFields({
  idPrefix,
  value,
  onChange,
  current,
}: {
  idPrefix: string
  value: ClassCourseValue
  onChange: (next: ClassCourseValue) => void
  /** Lớp đang sửa — giữ lộ trình/khoá học hiện tại trong danh sách chọn. */
  current?: Pick<ManagerClass, 'course' | 'coursePath'>
}) {
  const { data = [], isLoading, isError } = useCourseOptions(true)
  const options = withCurrentCourse(data, current, !isLoading)
  const course = options.find((o) => o.id === value.courseId)
  const path = course?.paths.find((p) => p.id === value.coursePathId)
  const courseSelectId = `${idPrefix}-course`
  const pathSelectId = `${idPrefix}-path`

  return (
    <fieldset className="md:col-span-2">
      <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        Lộ trình đào tạo
        {isLoading ? <Loader2 className="size-3 animate-spin" aria-label="Đang tải" /> : null}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={courseSelectId} className="mb-1 block text-xs text-muted-foreground">
            Lộ trình
          </label>
          <Select
            value={value.courseId || NONE}
            // Đổi lộ trình thì khoá học cũ không còn hợp lệ — quay về "Cả lộ trình".
            onValueChange={(next) =>
              onChange({ courseId: next === NONE ? '' : next, coursePathId: '' })
            }
          >
            <SelectTrigger id={courseSelectId} className={COURSE_SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={COURSE_SELECT_CONTENT}>
              <SelectItem value={NONE}>Không thuộc lộ trình</SelectItem>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <label htmlFor={pathSelectId} className="mb-1 block text-xs text-muted-foreground">
            Khoá học trong lộ trình
          </label>
          <Select
            value={value.coursePathId || NONE}
            disabled={!course || course.paths.length === 0}
            onValueChange={(next) =>
              onChange({ courseId: value.courseId, coursePathId: next === NONE ? '' : next })
            }
          >
            <SelectTrigger id={pathSelectId} className={COURSE_SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={COURSE_SELECT_CONTENT}>
              <SelectItem value={NONE}>
                {!course
                  ? 'Chọn lộ trình trước'
                  : course.paths.length === 0
                    ? 'Cả lộ trình (chưa có khoá học)'
                    : 'Cả lộ trình'}
              </SelectItem>
              {course?.paths.map((p, i) => (
                <SelectItem key={p.id} value={p.id}>
                  {i + 1}. {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {isError ? (
          <span className="text-danger">Không tải được danh sách lộ trình.</span>
        ) : course ? (
          <span>
            <BookMarked className="mr-1 inline size-3.5 align-[-3px] text-button" aria-hidden />
            {path ? (
              <>
                Lớp dạy khoá học <strong className="text-foreground">{path.title}</strong> của lộ
                trình <strong className="text-foreground">{course.title}</strong>.
              </>
            ) : (
              <>
                Lớp dạy cả lộ trình <strong className="text-foreground">{course.title}</strong>.
              </>
            )}
          </span>
        ) : !isLoading && data.length === 0 ? (
          <>
            Chưa có lộ trình nào đang mở. Lộ trình do admin tạo ở trang{' '}
            <Link to="/courses" className="font-semibold text-button hover:underline">
              Lộ trình đào tạo
            </Link>
            .
          </>
        ) : (
          'Không bắt buộc. Chọn lộ trình để tạo lớp cho cả lộ trình, hoặc chọn thêm khoá học để tạo lớp riêng cho khoá đó.'
        )}
      </p>
    </fieldset>
  )
}
