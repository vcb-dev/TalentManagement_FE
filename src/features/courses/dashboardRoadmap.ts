import type { CourseDetail } from './types'

/** Một bước trên thẻ "Lộ trình đào tạo" ở trang cá nhân — số thứ tự chạy liên tục qua cả lộ trình. */
export type DashboardRoadmapStep = {
  /** id khoá học (`course_paths.id`). */
  id: string
  number: number
  title: string
  /** Nhãn phụ tách từ tên, VD "Cấp độ 1 - Tập sự" → title "Tập sự", caption "Cấp độ 1". */
  caption: string | null
  /** Đích khi bấm: `/courses?courseId=&pathId=` (lộ trình + khoá học cần cuộn tới). */
  courseId: string
  pathId: string
  /** Mô tả khoá học (admin nhập), để trống = không hiện. */
  description: string | null
  sectionCount: number
  /** Tài liệu chung của khoá + tài liệu của các học phần. */
  materialCount: number
  /** Khoá "theo lộ trình khác" → tên lộ trình đó (VD "Lộ trình 5 cấp độ Lao động tri thức"). */
  linkedCourseTitle: string | null
}

/**
 * "4. Lao động tri thức" → "Lao động tri thức": thẻ tự đánh số liên tục nên bỏ số admin gõ sẵn ở đầu tên.
 * Chỉ bỏ khi sau số có dấu ngăn (. ) - – :) để không cắt nhầm tên bắt đầu bằng số như "5S tại văn phòng".
 */
export function stripLeadingStepNumber(title: string): string {
  const trimmed = title.trim()
  const stripped = trimmed.replace(/^\d+\s*[.)\-–:]\s*/, '')
  return stripped || trimmed
}

/**
 * "Cấp độ 1 - Tập sự" → { caption: "Cấp độ 1", title: "Tập sự" }: số thứ tự của thẻ đã chạy liên tục,
 * nên số riêng của khoá ("Cấp độ 1", "Tuần 2") lùi xuống làm nhãn phụ thay vì đứng đầu tên.
 * Chỉ tách khi vế trước ngắn và kết thúc bằng số, sau đó là dấu gạch / hai chấm.
 */
export function splitStepCaption(title: string): { title: string; caption: string | null } {
  const text = stripLeadingStepNumber(title)
  const match = /^(\S.{0,23}?\d+)\s*[-–—:]\s+(\S.*)$/.exec(text)
  if (!match) return { title: text, caption: null }
  return { title: match[2]!.trim(), caption: match[1]!.trim() }
}

/**
 * Mỗi khoá học của lộ trình là đúng một bước, theo thứ tự API trả về. Không bung học phần hay khoá
 * "theo lộ trình khác" — VD "4. Lao động tri thức" chỉ là bước 4 (5 cấp độ đã có thẻ
 * "Lộ trình 5 cấp độ Lao động tri thức" riêng); chi tiết xem trên /courses.
 */
export function buildDashboardRoadmap(
  course: Pick<CourseDetail, 'id' | 'paths'>
): DashboardRoadmapStep[] {
  return course.paths.map((path, i) => ({
    id: path.id,
    number: i + 1,
    ...splitStepCaption(path.title),
    courseId: course.id,
    pathId: path.id,
    description: path.description?.trim() || null,
    sectionCount: path.sections.length,
    materialCount:
      path.materials.length + path.sections.reduce((n, s) => n + s.materials.length, 0),
    linkedCourseTitle: path.linkedCourse?.title ?? null,
  }))
}
