import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import type {
  CourseDetail,
  CourseInput,
  CourseMaterialInput,
  CourseOption,
  CoursePathInput,
  CourseSectionInput,
  CourseSummary,
  MaterialTarget,
} from './types'

const ADMIN = '/admin/courses'

function mockUnsupported(): never {
  throw new Error('Chế độ mock chưa hỗ trợ lộ trình đào tạo')
}

/**
 * BE chưa có học phần / lộ trình liên kết (deploy FE trước BE) thì coi như khoá chưa có học phần và không
 * liên kết — không vỡ trang.
 */
function withSections(course: CourseDetail): CourseDetail {
  return {
    ...course,
    paths: course.paths.map((p) => ({
      ...p,
      sections: p.sections ?? [],
      linkedCourse: p.linkedCourse ?? null,
    })),
  }
}

/**
 * Nhân sự đọc `/courses` (chỉ lộ trình đang mở); admin (`course.manage`) đọc & sửa qua `/admin/courses`.
 * `courses` = lộ trình, `paths` = khoá học, `sections` = học phần (xem `types.ts`).
 */
export const courseApi = {
  list: async (manage: boolean) => {
    if (isMockApiEnabled()) return [] as CourseSummary[]
    const res = await apiClient.get<CourseSummary[]>(manage ? ADMIN : '/courses')
    return res.data
  },

  options: async () => {
    if (isMockApiEnabled()) return [] as CourseOption[]
    const res = await apiClient.get<CourseOption[]>('/courses/options')
    return res.data
  },

  get: async (id: string, manage: boolean) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.get<CourseDetail>(`${manage ? ADMIN : '/courses'}/${id}`)
    return withSections(res.data)
  },

  create: async (input: CourseInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<CourseDetail>(ADMIN, input)
    return res.data
  },

  update: async (id: string, input: Partial<CourseInput>) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.patch<CourseDetail>(`${ADMIN}/${id}`, input)
    return res.data
  },

  remove: async (id: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.delete<{ id: string }>(`${ADMIN}/${id}`)
    return res.data
  },

  reorder: async (ids: string[]) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.put<CourseSummary[]>(`${ADMIN}/order`, { ids })
    return res.data
  },

  createPath: async (courseId: string, input: CoursePathInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<CourseDetail>(`${ADMIN}/${courseId}/paths`, input)
    return res.data
  },

  updatePath: async (pathId: string, input: Partial<CoursePathInput>) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.patch<CourseDetail>(`${ADMIN}/paths/${pathId}`, input)
    return res.data
  },

  removePath: async (pathId: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.delete<CourseDetail>(`${ADMIN}/paths/${pathId}`)
    return res.data
  },

  reorderPaths: async (courseId: string, ids: string[]) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.put<CourseDetail>(`${ADMIN}/${courseId}/paths/order`, { ids })
    return res.data
  },

  createSection: async (pathId: string, input: CourseSectionInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<CourseDetail>(`${ADMIN}/paths/${pathId}/sections`, input)
    return res.data
  },

  updateSection: async (sectionId: string, input: Partial<CourseSectionInput>) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.patch<CourseDetail>(`${ADMIN}/sections/${sectionId}`, input)
    return res.data
  },

  removeSection: async (sectionId: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.delete<CourseDetail>(`${ADMIN}/sections/${sectionId}`)
    return res.data
  },

  reorderSections: async (pathId: string, ids: string[]) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.put<CourseDetail>(`${ADMIN}/paths/${pathId}/sections/order`, {
      ids,
    })
    return res.data
  },

  createMaterial: async (courseId: string, input: CourseMaterialInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<CourseDetail>(`${ADMIN}/${courseId}/materials`, input)
    return res.data
  },

  updateMaterial: async (materialId: string, input: Partial<CourseMaterialInput>) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.patch<CourseDetail>(`${ADMIN}/materials/${materialId}`, input)
    return res.data
  },

  removeMaterial: async (materialId: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.delete<CourseDetail>(`${ADMIN}/materials/${materialId}`)
    return res.data
  },

  reorderMaterials: async (courseId: string, target: MaterialTarget, ids: string[]) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.put<CourseDetail>(`${ADMIN}/${courseId}/materials/order`, {
      ...target,
      ids,
    })
    return res.data
  },

  upload: async (file: File) => {
    if (isMockApiEnabled()) mockUnsupported()
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.post<{ fileUrl: string; fileName: string }>(
      `${ADMIN}/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data
  },
}
