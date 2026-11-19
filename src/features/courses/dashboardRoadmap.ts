import type { CourseDetail } from './types'

/** Một bước trên thẻ "Lộ trình đào tạo" ở trang cá nhân — số thứ tự chạy liên tục qua cả lộ trình. */
export type DashboardRoadmapStep = {
  /** id khoá học hoặc học phần. */
  id: string
  number: number
  title: string
  /** Nhãn phụ tách từ tên, VD "Cấp độ 1 - Tập sự" → title "Tập sự", caption "Cấp độ 1". */
  caption: string | null
  /** Đích khi bấm: `/courses?courseId=&pathId=` (lộ trình + khoá học cần cuộn tới). */
  courseId: string
  pathId: string
}

/**
 * Khoá học thường = một bước. Khoá gom nhiều bước thành nhóm (tên khoá):
 * - khoá "theo lộ trình khác" → mỗi khoá của lộ trình đó là một bước (VD "Lao động tri thức" → 5 cấp độ);
 * - khoá có học phần → mỗi học phần là một bước.
 */
export type DashboardRoadmapBlock =
  | { kind: 'step'; step: DashboardRoadmapStep }
  | { kind: 'group'; id: string; title: string; steps: DashboardRoadmapStep[] }

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

function makeStep(
  id: string,
  number: number,
  rawTitle: string,
  courseId: string,
  pathId: string
): DashboardRoadmapStep {
  return { id, number, ...splitStepCaption(rawTitle), courseId, pathId }
}

/** Dựng các bước theo thứ tự API trả về (khoá học, học phần, khoá của lộ trình liên kết đều đã sắp sẵn). */
export function buildDashboardRoadmap(course: Pick<CourseDetail, 'id' | 'paths'>): {
  blocks: DashboardRoadmapBlock[]
  stepCount: number
} {
  let number = 0
  const next = () => (number += 1)
  const blocks = course.paths.map((path): DashboardRoadmapBlock => {
    const groupTitle = stripLeadingStepNumber(path.title)
    const linked = path.linkedCourse
    if (linked && linked.paths.length > 0) {
      return {
        kind: 'group',
        id: path.id,
        title: groupTitle,
        steps: linked.paths.map((p) => makeStep(p.id, next(), p.title, linked.id, p.id)),
      }
    }
    if (path.sections.length > 0) {
      return {
        kind: 'group',
        id: path.id,
        title: groupTitle,
        steps: path.sections.map((s) => makeStep(s.id, next(), s.title, course.id, path.id)),
      }
    }
    return { kind: 'step', step: makeStep(path.id, next(), path.title, course.id, path.id) }
  })
  return { blocks, stepCount: number }
}
