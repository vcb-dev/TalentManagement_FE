import type { CourseOption } from '@/features/courses/types'
import type { ManagerClass } from './types'

/** `course` = id lộ trình hoặc 'none' (lớp chưa gắn lộ trình); `path` = id khoá học hoặc 'whole' (lớp dạy cả lộ trình). */
export type ClassCourseFilter = { course?: string; path?: string }

export const COURSE_FILTER_NONE = 'none'
export const PATH_FILTER_WHOLE = 'whole'

type ClassCourseLink = Pick<ManagerClass, 'course' | 'coursePath'>

export function matchesCourseFilter(row: ClassCourseLink, filter: ClassCourseFilter): boolean {
  if (!filter.course) return true
  if (filter.course === COURSE_FILTER_NONE) return !row.course
  if (row.course?.id !== filter.course) return false
  if (!filter.path) return true
  if (filter.path === PATH_FILTER_WHOLE) return !row.coursePath
  return row.coursePath?.id === filter.path
}

export type CourseFilterPath = { id: string; title: string; count: number }

export type CourseFilterCourse = {
  id: string
  title: string
  count: number
  /** Số lớp dạy cả lộ trình (không chọn khoá học). */
  wholeCount: number
  paths: CourseFilterPath[]
}

/**
 * Lộ trình đang mở (theo thứ tự trang Lộ trình đào tạo, kể cả lộ trình chưa có lớp) rồi tới lộ trình chỉ
 * còn thấy qua lớp (đã ẩn) — kèm số lớp từng lộ trình / khoá học để chọn bộ lọc.
 */
export function buildCourseFilterOptions(
  rows: ClassCourseLink[],
  options: CourseOption[]
): { courses: CourseFilterCourse[]; noneCount: number } {
  const byId = new Map<string, CourseFilterCourse>()
  for (const o of options) {
    byId.set(o.id, {
      id: o.id,
      title: o.title,
      count: 0,
      wholeCount: 0,
      paths: o.paths.map((p) => ({ id: p.id, title: p.title, count: 0 })),
    })
  }
  let noneCount = 0
  for (const row of rows) {
    if (!row.course) {
      noneCount += 1
      continue
    }
    let course = byId.get(row.course.id)
    if (!course) {
      course = { id: row.course.id, title: row.course.title, count: 0, wholeCount: 0, paths: [] }
      byId.set(course.id, course)
    }
    course.count += 1
    if (!row.coursePath) {
      course.wholeCount += 1
      continue
    }
    const pathId = row.coursePath.id
    let path = course.paths.find((p) => p.id === pathId)
    if (!path) {
      path = { id: pathId, title: row.coursePath.title, count: 0 }
      course.paths.push(path)
    }
    path.count += 1
  }
  return { courses: [...byId.values()], noneCount }
}
