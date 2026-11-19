import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CoursesScreen } from '@/features/courses/components/CoursesScreen'

const coursesSearchSchema = z.object({
  courseId: z.string().uuid().optional().catch(undefined),
  /** Khoá học cần cuộn tới khi mở lộ trình (thẻ "Lộ trình đào tạo" ở trang cá nhân dẫn sang). */
  pathId: z.string().uuid().optional().catch(undefined),
})

/** Ai đăng nhập cũng xem được lộ trình đào tạo đang mở — nút cấu hình hiện theo `course.manage`, BE chặn từng API. */
export const Route = createFileRoute('/_protected/courses')({
  validateSearch: (raw) => coursesSearchSchema.parse(raw),
  component: CoursesPage,
})

function CoursesPage() {
  const { courseId, pathId } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <CoursesScreen
      courseId={courseId}
      focusPathId={courseId ? pathId : undefined}
      onOpenCourse={(id) => void navigate({ search: id ? { courseId: id } : {} })}
    />
  )
}
