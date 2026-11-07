import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CoursesScreen } from '@/features/courses/components/CoursesScreen'

const coursesSearchSchema = z.object({
  courseId: z.string().uuid().optional().catch(undefined),
})

/** Ai đăng nhập cũng xem được khoá đang mở — nút cấu hình hiện theo `course.manage`, BE chặn từng API. */
export const Route = createFileRoute('/_protected/courses')({
  validateSearch: (raw) => coursesSearchSchema.parse(raw),
  component: CoursesPage,
})

function CoursesPage() {
  const { courseId } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <CoursesScreen
      courseId={courseId}
      onOpenCourse={(id) => void navigate({ search: id ? { courseId: id } : {} })}
    />
  )
}
