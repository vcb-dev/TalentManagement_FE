import { useState } from 'react'
import { BookMarked, FilterX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  COURSE_FILTER_NONE,
  PATH_FILTER_WHOLE,
  type ClassCourseFilter,
  type CourseFilterCourse,
} from '@/features/manager/classCourseFilter'
import { COURSE_SELECT_CONTENT, COURSE_SELECT_TRIGGER } from './ClassCourseFields'

/** Radix Select không nhận value rỗng — đại diện "không lọc". */
const ALL = '__all'

export function ClassCourseFilterPopover({
  value,
  onChange,
  courses,
  noneCount,
}: {
  value: ClassCourseFilter
  onChange: (next: ClassCourseFilter) => void
  courses: CourseFilterCourse[]
  noneCount: number
}) {
  const [open, setOpen] = useState(false)
  const course = courses.find((c) => c.id === value.course)
  const path = course?.paths.find((p) => p.id === value.path)
  const isActive = Boolean(value.course)
  const label =
    value.course === COURSE_FILTER_NONE
      ? 'Chưa gắn khoá'
      : course
        ? [course.title, path?.title ?? (value.path === PATH_FILTER_WHOLE ? 'Cả khoá học' : null)]
            .filter(Boolean)
            .join(' › ')
        : 'Khoá học'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-label={isActive ? `Khoá học: ${label}` : 'Lọc theo khoá học'}
          className={cn(
            'h-auto min-h-11 w-full min-w-0 justify-between gap-2 rounded-xl border-border/80 bg-card/90 px-3 text-sm font-semibold shadow-sm ring-1 ring-border/60 sm:w-auto lg:max-w-72',
            (open || isActive) &&
              'border-button/40 bg-button/10 text-button ring-button/20 hover:bg-button/15 hover:text-button'
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <BookMarked className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </span>
          {isActive ? (
            <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-button px-1.5 text-xs font-bold leading-5 text-white">
              1
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Khoá học & lộ trình</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Lọc lớp theo khoá học và lộ trình lớp dạy
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-mr-2 h-8 shrink-0 gap-1.5 px-2 text-xs font-semibold text-muted-foreground hover:text-danger"
            disabled={!isActive}
            onClick={() => onChange({})}
          >
            <FilterX className="size-3.5" aria-hidden />
            Đặt lại
          </Button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="space-y-1.5">
            <label
              htmlFor="class-filter-course"
              className="block text-xs font-semibold text-muted-foreground"
            >
              Khoá học
            </label>
            <Select
              value={value.course ?? ALL}
              onValueChange={(next) => onChange(next === ALL ? {} : { course: next })}
            >
              <SelectTrigger id="class-filter-course" className={COURSE_SELECT_TRIGGER}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={COURSE_SELECT_CONTENT}>
                <SelectItem value={ALL}>Tất cả lớp</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title} ({c.count})
                  </SelectItem>
                ))}
                <SelectItem value={COURSE_FILTER_NONE}>Chưa gắn khoá ({noneCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="class-filter-path"
              className="block text-xs font-semibold text-muted-foreground"
            >
              Lộ trình trong khoá
            </label>
            <Select
              value={value.path ?? ALL}
              disabled={!course}
              onValueChange={(next) =>
                onChange({ course: value.course, path: next === ALL ? undefined : next })
              }
            >
              <SelectTrigger id="class-filter-path" className={COURSE_SELECT_TRIGGER}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={COURSE_SELECT_CONTENT}>
                <SelectItem value={ALL}>
                  {course ? 'Mọi lộ trình' : 'Chọn khoá học trước'}
                </SelectItem>
                {course ? (
                  <SelectItem value={PATH_FILTER_WHOLE}>
                    Lớp dạy cả khoá ({course.wholeCount})
                  </SelectItem>
                ) : null}
                {course?.paths.map((p, i) => (
                  <SelectItem key={p.id} value={p.id}>
                    {i + 1}. {p.title} ({p.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Lớp cũ tạo theo loại lớp / cấp lớp nằm ở mục "Chưa gắn khoá" cho tới khi được gắn khoá.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
