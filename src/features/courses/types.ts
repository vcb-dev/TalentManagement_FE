/** Khớp BE `src/courses/courses.dto.ts`. */

export type CourseMaterial = {
  id: string
  /** null = tài liệu chung của khoá. */
  pathId: string | null
  title: string
  url: string | null
  /** Supabase public URL hoặc `/uploads/course-materials/…` (mở qua `resolveFileUrl`). */
  fileRef: string | null
  fileName: string | null
  note: string | null
  sortOrder: number
}

export type CoursePath = {
  id: string
  title: string
  description: string | null
  sortOrder: number
  materials: CourseMaterial[]
}

export type CourseSummary = {
  id: string
  title: string
  description: string | null
  /** `false` = đang ẩn với nhân sự (chỉ admin thấy). */
  isActive: boolean
  sortOrder: number
  pathCount: number
  /** Vài lộ trình đầu (theo thứ tự) để card xem trước nội dung khoá. */
  pathPreview: { id: string; title: string }[]
  /** Tổng tài liệu — chung của khoá + trong mọi lộ trình. */
  materialCount: number
  updatedAt: string
}

/** Khoá đang mở + mọi lộ trình (theo thứ tự) — ô chọn khoá/lộ trình khi tạo lớp. */
export type CourseOption = {
  id: string
  title: string
  paths: { id: string; title: string }[]
}

export type CourseDetail = Omit<CourseSummary, 'pathCount' | 'pathPreview' | 'materialCount'> & {
  /** Tài liệu chung của khoá (không thuộc lộ trình nào). */
  materials: CourseMaterial[]
  paths: CoursePath[]
}

export type CourseInput = {
  title: string
  description?: string | null
  isActive?: boolean
}

export type CoursePathInput = {
  title: string
  description?: string | null
}

export type CourseMaterialInput = {
  title: string
  url?: string | null
  fileRef?: string | null
  fileName?: string | null
  note?: string | null
  /** null = tài liệu chung của khoá. */
  pathId?: string | null
}
