import { createFileRoute, redirect } from '@tanstack/react-router'

/** Đường dẫn cũ — gộp vào /learning-classes */
export const Route = createFileRoute('/_protected/learning-schedule')({
  beforeLoad: () => {
    throw redirect({ to: '/learning-classes' })
  },
})
