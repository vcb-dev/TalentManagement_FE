import { createFileRoute, redirect } from '@tanstack/react-router'

/** Trang cũ "Lớp học khác" — đã gộp vào "Lớp học của tôi"; giữ route để link/bookmark cũ không 404. */
export const Route = createFileRoute('/_protected/other-classes')({
  beforeLoad: () => {
    throw redirect({ to: '/learning-classes', replace: true })
  },
})
