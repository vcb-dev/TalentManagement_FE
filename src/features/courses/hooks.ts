import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { courseApi } from './api'
import { courseKeys } from './queryKeys'
import type { CourseInput, CourseMaterialInput, CoursePathInput } from './types'

export function useCourses(manage: boolean) {
  return useQuery({
    queryKey: courseKeys.list(manage),
    queryFn: () => courseApi.list(manage),
  })
}

/** Khoá đang mở + lộ trình — chỉ tải khi form tạo/sửa lớp đang mở. */
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

/** Mọi mutation đều làm mới toàn bộ cache khoá học — dữ liệu nhỏ, tránh lệch số đếm ở danh sách. */
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

export function useCreateCourse() {
  return useCourseMutation((input: CourseInput) => courseApi.create(input), {
    success: 'Đã tạo khoá học',
    error: 'Không thể tạo khoá học',
  })
}

export function useUpdateCourse() {
  return useCourseMutation(
    (args: { id: string; input: Partial<CourseInput> }) => courseApi.update(args.id, args.input),
    { success: 'Đã cập nhật khoá học', error: 'Không thể cập nhật khoá học' }
  )
}

export function useDeleteCourse() {
  return useCourseMutation((id: string) => courseApi.remove(id), {
    success: 'Đã xoá khoá học',
    error: 'Không thể xoá khoá học',
  })
}

export function useReorderCourses() {
  return useCourseMutation((ids: string[]) => courseApi.reorder(ids), {
    error: 'Không thể sắp xếp khoá học',
  })
}

export function useCreateCoursePath() {
  return useCourseMutation(
    (args: { courseId: string; input: CoursePathInput }) =>
      courseApi.createPath(args.courseId, args.input),
    { success: 'Đã thêm lộ trình', error: 'Không thể thêm lộ trình' }
  )
}

export function useUpdateCoursePath() {
  return useCourseMutation(
    (args: { pathId: string; input: Partial<CoursePathInput> }) =>
      courseApi.updatePath(args.pathId, args.input),
    { success: 'Đã cập nhật lộ trình', error: 'Không thể cập nhật lộ trình' }
  )
}

export function useDeleteCoursePath() {
  return useCourseMutation((pathId: string) => courseApi.removePath(pathId), {
    success: 'Đã xoá lộ trình',
    error: 'Không thể xoá lộ trình',
  })
}

export function useReorderCoursePaths() {
  return useCourseMutation(
    (args: { courseId: string; ids: string[] }) => courseApi.reorderPaths(args.courseId, args.ids),
    { error: 'Không thể sắp xếp lộ trình' }
  )
}

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
    (args: { courseId: string; pathId: string | null; ids: string[] }) =>
      courseApi.reorderMaterials(args.courseId, args.pathId, args.ids),
    { error: 'Không thể sắp xếp tài liệu' }
  )
}
