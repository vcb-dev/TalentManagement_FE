import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { courseApi } from './api'
import { courseKeys } from './queryKeys'
import type {
  CourseInput,
  CourseMaterialInput,
  CoursePathInput,
  CourseSectionInput,
  MaterialTarget,
} from './types'

// Nhãn: "Course" = lộ trình, "CoursePath" = khoá học, "CourseSection" = học phần (xem `types.ts`).

export function useCourses(manage: boolean) {
  return useQuery({
    queryKey: courseKeys.list(manage),
    queryFn: () => courseApi.list(manage),
  })
}

/** Lộ trình đang mở + khoá học — chỉ tải khi form tạo/sửa lớp đang mở. */
export function useCourseOptions(enabled: boolean) {
  return useQuery({
    queryKey: courseKeys.options(),
    queryFn: () => courseApi.options(),
    enabled,
  })
}

export function useCourse(id: string | undefined, manage: boolean) {
  return useQuery({
    queryKey: courseKeys.detail(id ?? '', manage),
    queryFn: () => courseApi.get(id!, manage),
    enabled: Boolean(id),
  })
}

/** Mọi mutation đều làm mới toàn bộ cache lộ trình — dữ liệu nhỏ, tránh lệch số đếm ở danh sách. */
function useCourseMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  messages: { success?: string; error: string }
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: courseKeys.all })
      if (messages.success) toast.success(messages.success)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || messages.error)
    },
  })
}

// ─── Lộ trình ───

export function useCreateCourse() {
  return useCourseMutation((input: CourseInput) => courseApi.create(input), {
    success: 'Đã tạo lộ trình',
    error: 'Không thể tạo lộ trình',
  })
}

export function useUpdateCourse() {
  return useCourseMutation(
    (args: { id: string; input: Partial<CourseInput> }) => courseApi.update(args.id, args.input),
    { success: 'Đã cập nhật lộ trình', error: 'Không thể cập nhật lộ trình' }
  )
}

export function useDeleteCourse() {
  return useCourseMutation((id: string) => courseApi.remove(id), {
    success: 'Đã xoá lộ trình',
    error: 'Không thể xoá lộ trình',
  })
}

export function useReorderCourses() {
  return useCourseMutation((ids: string[]) => courseApi.reorder(ids), {
    error: 'Không thể sắp xếp lộ trình',
  })
}

// ─── Khoá học trong lộ trình ───

export function useCreateCoursePath() {
  return useCourseMutation(
    (args: { courseId: string; input: CoursePathInput }) =>
      courseApi.createPath(args.courseId, args.input),
    { success: 'Đã thêm khoá học', error: 'Không thể thêm khoá học' }
  )
}

export function useUpdateCoursePath() {
  return useCourseMutation(
    (args: { pathId: string; input: Partial<CoursePathInput> }) =>
      courseApi.updatePath(args.pathId, args.input),
    { success: 'Đã cập nhật khoá học', error: 'Không thể cập nhật khoá học' }
  )
}

export function useDeleteCoursePath() {
  return useCourseMutation((pathId: string) => courseApi.removePath(pathId), {
    success: 'Đã xoá khoá học',
    error: 'Không thể xoá khoá học',
  })
}

export function useReorderCoursePaths() {
  return useCourseMutation(
    (args: { courseId: string; ids: string[] }) => courseApi.reorderPaths(args.courseId, args.ids),
    { error: 'Không thể sắp xếp khoá học' }
  )
}

// ─── Học phần trong khoá học ───

export function useCreateCourseSection() {
  return useCourseMutation(
    (args: { pathId: string; input: CourseSectionInput }) =>
      courseApi.createSection(args.pathId, args.input),
    { success: 'Đã thêm học phần', error: 'Không thể thêm học phần' }
  )
}

export function useUpdateCourseSection() {
  return useCourseMutation(
    (args: { sectionId: string; input: Partial<CourseSectionInput> }) =>
      courseApi.updateSection(args.sectionId, args.input),
    { success: 'Đã cập nhật học phần', error: 'Không thể cập nhật học phần' }
  )
}

export function useDeleteCourseSection() {
  return useCourseMutation((sectionId: string) => courseApi.removeSection(sectionId), {
    success: 'Đã xoá học phần',
    error: 'Không thể xoá học phần',
  })
}

export function useReorderCourseSections() {
  return useCourseMutation(
    (args: { pathId: string; ids: string[] }) => courseApi.reorderSections(args.pathId, args.ids),
    { error: 'Không thể sắp xếp học phần' }
  )
}

// ─── Tài liệu ───

export function useCreateCourseMaterial() {
  return useCourseMutation(
    (args: { courseId: string; input: CourseMaterialInput }) =>
      courseApi.createMaterial(args.courseId, args.input),
    { success: 'Đã thêm tài liệu', error: 'Không thể thêm tài liệu' }
  )
}

export function useUpdateCourseMaterial() {
  return useCourseMutation(
    (args: { materialId: string; input: Partial<CourseMaterialInput> }) =>
      courseApi.updateMaterial(args.materialId, args.input),
    { success: 'Đã cập nhật tài liệu', error: 'Không thể cập nhật tài liệu' }
  )
}

export function useDeleteCourseMaterial() {
  return useCourseMutation((materialId: string) => courseApi.removeMaterial(materialId), {
    success: 'Đã xoá tài liệu',
    error: 'Không thể xoá tài liệu',
  })
}

export function useReorderCourseMaterials() {
  return useCourseMutation(
    (args: { courseId: string; target: MaterialTarget; ids: string[] }) =>
      courseApi.reorderMaterials(args.courseId, args.target, args.ids),
    { error: 'Không thể sắp xếp tài liệu' }
  )
}
