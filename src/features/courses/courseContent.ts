import type { CourseDetail, CoursePath, MaterialTarget } from './types'

const ROADMAP_TARGET = '__roadmap'
const PATH_PREFIX = 'path:'
const SECTION_PREFIX = 'section:'

/** Giá trị ô "Thuộc" của form tài liệu (Radix Select không nhận value rỗng). */
export function encodeMaterialTarget(target: MaterialTarget): string {
  if (target.sectionId) return `${SECTION_PREFIX}${target.sectionId}`
  if (target.pathId) return `${PATH_PREFIX}${target.pathId}`
  return ROADMAP_TARGET
}

/** Ngược của `encodeMaterialTarget`. Học phần chỉ cần `sectionId` — BE tự suy ra khoá học chứa nó. */
export function decodeMaterialTarget(value: string): MaterialTarget {
  if (value.startsWith(SECTION_PREFIX)) {
    return { pathId: null, sectionId: value.slice(SECTION_PREFIX.length) }
  }
  if (value.startsWith(PATH_PREFIX)) {
    return { pathId: value.slice(PATH_PREFIX.length), sectionId: null }
  }
  return { pathId: null, sectionId: null }
}

/** Tài liệu của một khoá học — chung của khoá + trong mọi học phần. */
export function countPathMaterials(path: CoursePath): number {
  return path.materials.length + path.sections.reduce((n, s) => n + s.materials.length, 0)
}

/** Tài liệu của cả lộ trình — chung của lộ trình + trong mọi khoá học. */
export function countCourseMaterials(course: CourseDetail): number {
  return course.materials.length + course.paths.reduce((n, p) => n + countPathMaterials(p), 0)
}
