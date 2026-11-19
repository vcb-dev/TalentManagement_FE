/**
 * Khớp BE `src/courses/courses.dto.ts`. Tên kiểu giữ theo API/bảng, nhãn giao diện đổi 2026-11-19:
 * `Course*` = LỘ TRÌNH đào tạo → `CoursePath` = KHOÁ HỌC (theo thứ tự) → `CourseSection` = HỌC PHẦN.
 */

export type CourseMaterial = {
  id: string
  /** null = tài liệu chung của lộ trình. */
  pathId: string | null
  /** null = tài liệu chung của khoá học `pathId` (hoặc của lộ trình nếu `pathId` cũng null). */
  sectionId: string | null
  title: string
  url: string | null
  /** Supabase public URL hoặc `/uploads/course-materials/…` (mở qua `resolveFileUrl`). */
  fileRef: string | null
  fileName: string | null
  note: string | null
  sortOrder: number
}

/** Học phần trong khoá học. */
export type CourseSection = {
  id: string
  title: string
  description: string | null
  sortOrder: number
  materials: CourseMaterial[]
}

/** Lộ trình mà một khoá học hiển thị theo, kèm các khoá học của nó (theo thứ tự). */
export type LinkedCourse = {
  id: string
  title: string
  /** Chỉ admin nhận lộ trình đang ẩn; nhân sự nhận `linkedCourse: null`. */
  isActive: boolean
  paths: { id: string; title: string }[]
}

/** Khoá học trong lộ trình. */
export type CoursePath = {
  id: string
  title: string
  description: string | null
  sortOrder: number
  /**
   * Khoá "theo lộ trình khác" — VD khoá "Lao động tri thức" hiển thị các cấp độ của "Lộ trình 5 cấp độ
   * Lao động tri thức". `api.get` đổi thiếu (BE cũ) thành null.
   */
  linkedCourse: LinkedCourse | null
  /** Tài liệu chung của khoá học (không thuộc học phần nào). */
  materials: CourseMaterial[]
  sections: CourseSection[]
}

/** Lộ trình — card danh sách. */
export type CourseSummary = {
  id: string
  title: string
  description: string | null
  /** `false` = đang ẩn với nhân sự (chỉ admin thấy). */
  isActive: boolean
  /**
   * Lộ trình hiện ở thẻ "Lộ trình đào tạo" trên trang cá nhân (tối đa 1, BE tự tắt ở lộ trình khác).
   * Tuỳ chọn vì BE cũ chưa trả trường này (deploy FE trước BE) — thiếu thì coi như `false`.
   */
  showOnDashboard?: boolean
  sortOrder: number
  /** Số khoá học trong lộ trình. */
  pathCount: number
  /** Vài khoá học đầu (theo thứ tự) để card xem trước nội dung lộ trình. */
  pathPreview: { id: string; title: string }[]
  /** Tổng tài liệu ở mọi cấp (lộ trình, khoá học, học phần). */
  materialCount: number
  updatedAt: string
}

/** Lộ trình đang mở + mọi khoá học (theo thứ tự) — ô chọn khi tạo lớp. */
export type CourseOption = {
  id: string
  title: string
  paths: { id: string; title: string }[]
}

export type CourseDetail = Omit<CourseSummary, 'pathCount' | 'pathPreview' | 'materialCount'> & {
  /** Tài liệu chung của lộ trình (không thuộc khoá học nào). */
  materials: CourseMaterial[]
  paths: CoursePath[]
}

export type CourseInput = {
  title: string
  description?: string | null
  isActive?: boolean
  showOnDashboard?: boolean
}

export type CoursePathInput = {
  title: string
  description?: string | null
  /** null = bỏ liên kết; không gửi = giữ nguyên. */
  linkedCourseId?: string | null
}

export type CourseSectionInput = {
  title: string
  description?: string | null
}

/**
 * Nơi gắn tài liệu: cả hai null = chung của lộ trình; chỉ `pathId` = chung của khoá học;
 * `sectionId` = tài liệu của học phần (gửi lên thì `pathId` để null cũng được — BE suy ra từ học phần).
 */
export type MaterialTarget = { pathId: string | null; sectionId: string | null }

export type CourseMaterialInput = MaterialTarget & {
  title: string
  url?: string | null
  fileRef?: string | null
  fileName?: string | null
  note?: string | null
}
